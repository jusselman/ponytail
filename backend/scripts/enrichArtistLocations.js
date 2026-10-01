// enrichArtistLocations.js
// Gives every catalog artist in seed_tracks a real location so Discovery's
// Place filter has something to match. Sources, in order:
//
//   1. assets/geo/artist_locations.json — hand-checked hometowns, always win
//   2. Wikidata — one bulk query per ~20 artists: where a band formed
//      (P740) or where a musician was born (P19). Fast, no per-artist calls.
//   3. MusicBrainz — only for artists Wikidata couldn't place in a city,
//      1 request/second, waiting and retrying when it says "slow down"
//   4. Collaborations ("Bill Evans & Claus Ogerman") that still have no city
//      fall back to the first-named artist ("Bill Evans"), when that artist
//      is also in the catalog
//
// Answers are cached in assets/geo/wikidata_cache.json and
// musicbrainz_cache.json, so re-runs only ask about what's still missing.
// Each city is matched against the places table and written onto all of that
// artist's rows. If only a country is known, only location_country is set.
//
// Usage:
//   node scripts/enrichArtistLocations.js                    # everything above
//   node scripts/enrichArtistLocations.js --skip-musicbrainz # hand-checked + Wikidata only
//   node scripts/enrichArtistLocations.js --offline          # hand-checked + caches only
//   node scripts/enrichArtistLocations.js --redo             # also re-check artists that already have a location
//
// Both services ask for a contact in the User-Agent: set MUSICBRAINZ_CONTACT
// in .env (an email or URL) before running online.

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { pool } = require('../src/config/db');
const { cityLabel, distanceSql } = require('../src/services/geo');

const OVERRIDES_PATH = path.join(__dirname, '../assets/geo/artist_locations.json');
const MB_CACHE_PATH = path.join(__dirname, '../assets/geo/musicbrainz_cache.json');
const WD_CACHE_PATH = path.join(__dirname, '../assets/geo/wikidata_cache.json');
const OFFLINE = process.argv.includes('--offline');
const SKIP_MB = OFFLINE || process.argv.includes('--skip-musicbrainz');
const REDO = process.argv.includes('--redo');
const MB_DELAY_MS = 1100;
const MB_MAX_RETRIES = 5;
const WD_BATCH = 20;
const NEAREST_CITY_MI = 30; // Wikidata place with coordinates → nearest known city within this
const USER_AGENT = `Ponytail/0.1 ( ${process.env.MUSICBRAINZ_CONTACT || 'contact not set'} )`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
const readJson = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } };
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));
const hasCity = (loc) => !!(loc && !loc.miss && (loc.city || loc.lat != null));

// ── "Bill Evans & Claus Ogerman" → "Bill Evans". Only used after the full
// name found nothing, because "Simon & Garfunkel" is a real act. ──
function primaryArtist(name) {
  const first = name.split(/\s+(?:&|and|feat\.?|featuring|ft\.?|with|vs\.?|x)\s+|\s*[\/+,]\s*/i)[0].trim();
  return first && first !== name ? first : null;
}

// ── Label variants Wikidata might use: as written, and with small words
// lowercased ("Alice In Chains" → "Alice in Chains") ──
const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
function labelVariants(name) {
  const lowered = name.split(' ').map((w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w)).join(' ');
  return [...new Set([name, lowered])];
}

// ─────────────────────────────── Wikidata ───────────────────────────────
const sparqlString = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"@en`;

// ── Kept deliberately light: Wikidata's public endpoint gives up after about
// a minute (HTTP 504). No class-hierarchy walks; "is this a musician/band?" is
// answered by the item having a MusicBrainz artist ID (P434), which only
// musical artists carry. optimizer "None" makes Wikidata run the lines in the
// order written — start from our ~20 names, not from every item with a
// MusicBrainz ID, which is what made batches crawl. ──
function wikidataQuery(labels) {
  return `
SELECT ?name ?links ?placeLabel ?countryCode ?coord ?isCountry WHERE {
  hint:Query hint:optimizer "None" .
  VALUES ?name { ${labels.map(sparqlString).join(' ')} }
  ?item rdfs:label ?name ;
        wdt:P434 ?mbid ;
        wikibase:sitelinks ?links .
  OPTIONAL { ?item wdt:P740 ?formed . }
  OPTIONAL { ?item wdt:P19 ?born . }
  BIND(COALESCE(?formed, ?born) AS ?place)
  FILTER(BOUND(?place))
  OPTIONAL { ?place rdfs:label ?placeLabel . FILTER(LANG(?placeLabel) = "en") }
  OPTIONAL { ?place wdt:P17 ?country . ?country wdt:P297 ?countryCode . }
  OPTIONAL { ?place wdt:P625 ?coord . }
  BIND(BOUND(?country) && ?place = ?country AS ?isCountry)
}`;
}

async function fetchWikidata(labels) {
  const body = new URLSearchParams({ query: wikidataQuery(labels), format: 'json' });
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        timeout: 70000, // node-fetch v2: give up instead of hanging
      });
    } catch (err) {
      if (err.type === 'request-timeout') throw Object.assign(new Error('timed out'), { tooBig: true });
      throw err;
    }
    if (res.status === 429 || res.status === 503) {
      await sleep((parseInt(res.headers.get('retry-after'), 10) || 5 * (attempt + 1)) * 1000);
      continue;
    }
    // 504 / 500 = the query ran out of time on Wikidata's side → caller splits the batch
    if (res.status === 504 || res.status === 500) throw Object.assign(new Error(`HTTP ${res.status}`), { tooBig: true });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).results.bindings;
  }
  throw new Error('Wikidata kept saying it was busy');
}

// ── One batch → { originalName: {city, country, lat, lng} | {miss} }. A batch
// that times out is split in half and retried, down to single artists.
// When a name matches several artists, the best-known one (most Wikipedia
// language editions) wins. ──
async function lookupWikidataBatch(names) {
  const variantToName = new Map();
  names.forEach(n => labelVariants(n).forEach(v => variantToName.set(v, n)));

  let bindings;
  try {
    bindings = await fetchWikidata([...variantToName.keys()]);
  } catch (err) {
    if (err.tooBig && names.length > 1) {
      const mid = Math.ceil(names.length / 2);
      return { ...(await lookupWikidataBatch(names.slice(0, mid))), ...(await lookupWikidataBatch(names.slice(mid))) };
    }
    if (err.tooBig) return {}; // one artist still timing out: leave uncached, retry next run
    throw err;
  }

  const best = new Map();
  for (const b of bindings) {
    const name = variantToName.get(b.name.value);
    if (!name) continue;
    const links = parseInt(b.links?.value || '0', 10);
    if (best.has(name) && best.get(name).links >= links) continue;
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord?.value || '');
    const isCountry = b.isCountry?.value === 'true';
    best.set(name, {
      links,
      city: isCountry ? null : b.placeLabel?.value || null,
      country: b.countryCode?.value || null,
      lat: !isCountry && m ? parseFloat(m[2]) : null,
      lng: !isCountry && m ? parseFloat(m[1]) : null,
    });
  }
  const out = {};
  names.forEach(n => {
    const hit = best.get(n);
    out[n] = hit && (hit.city || hit.country || hit.lat != null)
      ? { city: hit.city, country: hit.country, lat: hit.lat, lng: hit.lng, source: 'wikidata' }
      : { miss: true };
  });
  return out;
}

async function lookupWikidata(names, cache) {
  const todo = names.filter(n => !(n in cache));
  for (let i = 0; i < todo.length; i += WD_BATCH) {
    const batch = todo.slice(i, i + WD_BATCH);
    try {
      Object.assign(cache, await lookupWikidataBatch(batch));
      writeJson(WD_CACHE_PATH, cache);
    } catch (err) {
      console.log(`\n  Wikidata batch failed (${err.message}); those artists will be retried next run.`);
    }
    process.stdout.write(`\r  Wikidata: ${Math.min(i + WD_BATCH, todo.length)}/${todo.length}   `);
    await sleep(1000); // be polite between batches
  }
  if (todo.length) process.stdout.write('\n');
}

// ────────────────────────────── MusicBrainz ─────────────────────────────
// ── Best artist whose name matches ours exactly (after normalising).
// Waits and retries the same artist when rate-limited instead of skipping. ──
async function lookupMusicBrainz(artist) {
  const url = `https://musicbrainz.org/ws/2/artist/?fmt=json&limit=5&query=${encodeURIComponent(`artist:"${artist.replace(/"/g, '')}"`)}`;
  for (let attempt = 0; attempt <= MB_MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (res.status === 503 || res.status === 429) {
      const wait = (parseInt(res.headers.get('retry-after'), 10) || 2 ** (attempt + 1)) * 1000;
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hit = (data.artists || []).find(a => a.score >= 90 && norm(a.name) === norm(artist));
    if (!hit) return { miss: true };

    const begin = hit['begin-area'];
    const area = hit.area;
    const out = { country: hit.country || null, city: null, regionName: null, mbid: hit.id, source: 'musicbrainz' };
    const cityTypes = ['City', 'Municipality', 'District', 'Town', 'Village'];
    if (begin && cityTypes.includes(begin.type)) out.city = begin.name;
    else if (area && cityTypes.includes(area.type)) out.city = area.name;
    if (begin && begin.type === 'Subdivision') out.regionName = begin.name;
    else if (area && area.type === 'Subdivision') out.regionName = area.name;
    if (!out.country && !out.city) return { miss: true };
    return out;
  }
  throw new Error('still rate-limited after retries');
}

async function lookupMusicBrainzAll(names, cache) {
  const todo = names.filter(n => !(n in cache));
  let failed = 0;
  for (let i = 0; i < todo.length; i++) {
    try {
      cache[todo[i]] = await lookupMusicBrainz(todo[i]);
      writeJson(MB_CACHE_PATH, cache);
    } catch (err) {
      failed++;
    }
    process.stdout.write(`\r  MusicBrainz: ${i + 1}/${todo.length}${failed ? ` (${failed} to retry next run)` : ''}   `);
    await sleep(MB_DELAY_MS);
  }
  if (todo.length) process.stdout.write('\n');
}

// ──────────────────────────── places matching ───────────────────────────
// ── A location guess → the columns to write. Tries: city name in that
// country, then (Wikidata) the nearest known city to its coordinates, then
// the region, then just the country. ──
async function resolveToColumns(loc) {
  if (!loc || loc.miss) return null;
  if (loc.city && loc.country) {
    const r = await pool.query(
      `SELECT * FROM places
       WHERE kind = 'city' AND country_code = $2
         AND (lower(ascii_name) = lower($1) OR lower(name) = lower($3))
       ORDER BY (admin1_code = $4) DESC NULLS LAST, population DESC
       LIMIT 1`,
      [loc.city.normalize('NFKD').replace(/[̀-ͯ]/g, ''), loc.country, loc.city, loc.region || '']
    );
    const p = r.rows[0];
    if (p) return { label: cityLabel(p), lat: p.lat, lng: p.lng, country: p.country_code, region: p.admin1_code };
  }
  if (loc.lat != null && loc.lng != null) {
    const d = distanceSql('lat', 'lng', '$1::float8', '$2::float8');
    const r = await pool.query(
      `SELECT *, ${d} AS dist FROM places WHERE kind = 'city' AND ${d} <= $3 ORDER BY dist LIMIT 1`,
      [loc.lat, loc.lng, NEAREST_CITY_MI]
    );
    const p = r.rows[0];
    // Keep Wikidata's own point (e.g. a neighbourhood) but borrow the nearby city's label/region
    if (p) return { label: cityLabel(p), lat: loc.lat, lng: loc.lng, country: p.country_code, region: p.admin1_code };
    if (loc.country) return { label: loc.city || loc.country, lat: loc.lat, lng: loc.lng, country: loc.country, region: null };
  }
  if (loc.regionName && loc.country) {
    const r = await pool.query(
      `SELECT * FROM places WHERE kind = 'region' AND country_code = $1 AND lower(name) = lower($2) LIMIT 1`,
      [loc.country, loc.regionName]
    );
    const p = r.rows[0];
    if (p) return { label: `${p.name}, ${p.country_name}`, lat: null, lng: null, country: p.country_code, region: p.admin1_code };
  }
  if (loc.country) {
    const r = await pool.query(`SELECT * FROM places WHERE kind = 'country' AND country_code = $1`, [loc.country]);
    const p = r.rows[0];
    return { label: p ? p.name : loc.country, lat: null, lng: null, country: loc.country, region: null };
  }
  return null;
}

// ─────────────────────────────────── main ───────────────────────────────
async function enrich() {
  const overrides = readJson(OVERRIDES_PATH, { artists: {} }).artists || {};
  const overridesByKey = new Map(Object.entries(overrides).map(([k, v]) => [k.normalize('NFC').toLowerCase(), { ...v, source: 'hand-checked' }]));
  const override = (name) => overridesByKey.get(name.normalize('NFC').toLowerCase());
  const mbCache = readJson(MB_CACHE_PATH, {});
  const wdCache = readJson(WD_CACHE_PATH, {});

  const artistRows = await pool.query(
    `SELECT artist, BOOL_OR(location_lat IS NOT NULL) AS has_city
     FROM seed_tracks
     WHERE is_user_upload IS NOT TRUE AND artist IS NOT NULL AND artist != ''
     GROUP BY artist ORDER BY artist`
  );
  // Artists with only a country from an earlier run get another chance at a city
  const artists = artistRows.rows.filter(r => REDO || !r.has_city).map(r => r.artist);
  console.log(`${artists.length} artists without a city yet${OFFLINE ? ' (offline: hand-checked + caches only)' : SKIP_MB ? ' (skipping MusicBrainz)' : ''}`);
  if (!OFFLINE && !process.env.MUSICBRAINZ_CONTACT) {
    console.log('Tip: set MUSICBRAINZ_CONTACT in .env so Wikidata and MusicBrainz know who is calling.');
  }

  // ── The best answer so far for a name, across every source ──
  const bestFor = (name) => {
    const candidates = [override(name), wdCache[name], mbCache[name]].filter(l => l && !l.miss);
    return candidates.find(hasCity) || candidates[0] || null;
  };

  const needCity = (names) => names.filter(n => !hasCity(bestFor(n)));

  if (!OFFLINE) await lookupWikidata(needCity(artists), wdCache);
  if (!SKIP_MB) await lookupMusicBrainzAll(needCity(artists), mbCache);

  // ── Collaborations: fall back to the first-named artist ──
  // Only when the first name is itself an artist in the catalog, so
  // "Simon & Garfunkel" never turns into some unrelated "Simon".
  const allArtists = new Set(artistRows.rows.map(r => r.artist.normalize('NFC').toLowerCase()));
  const primaries = new Map();
  needCity(artists).forEach(a => {
    const p = primaryArtist(a);
    if (p && allArtists.has(p.normalize('NFC').toLowerCase())) primaries.set(a, p);
  });
  const primaryNames = [...new Set(primaries.values())];
  if (!OFFLINE && primaryNames.length) {
    console.log(`Trying ${primaryNames.length} first-named artists for collaborations...`);
    await lookupWikidata(needCity(primaryNames), wdCache);
    if (!SKIP_MB) await lookupMusicBrainzAll(needCity(primaryNames), mbCache);
  }

  // ── Write everything ──
  const stats = { city: 0, countryOnly: 0, unknown: 0, bySource: {} };
  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    let loc = bestFor(artist);
    if (!hasCity(loc) && primaries.has(artist)) {
      const viaPrimary = bestFor(primaries.get(artist));
      if (hasCity(viaPrimary) || (!loc && viaPrimary)) loc = viaPrimary;
    }
    const cols = await resolveToColumns(loc);
    if (cols) {
      await pool.query(
        `UPDATE seed_tracks SET location = $2, location_lat = $3, location_lng = $4, location_country = $5, location_region = $6
         WHERE artist = $1 AND is_user_upload IS NOT TRUE`,
        [artist, cols.label, cols.lat, cols.lng, cols.country, cols.region]
      );
      if (cols.lat != null) stats.city++; else stats.countryOnly++;
      stats.bySource[loc.source || 'musicbrainz'] = (stats.bySource[loc.source || 'musicbrainz'] || 0) + 1;
    } else stats.unknown++;
    process.stdout.write(`\r  Saving: ${i + 1}/${artists.length}   `);
  }
  process.stdout.write('\n');
  console.log(`City: ${stats.city} · country/region only: ${stats.countryOnly} · unknown: ${stats.unknown}`);
  console.log(`Sources: ${Object.entries(stats.bySource).map(([k, v]) => `${v} ${k}`).join(', ') || 'none'}`);
  console.log('Done. Add any still-unknown artists to assets/geo/artist_locations.json and re-run.');
}

enrich()
  .catch(err => { console.error('enrichArtistLocations failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());
