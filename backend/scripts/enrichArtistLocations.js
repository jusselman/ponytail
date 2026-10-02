// enrichArtistLocations.js
// Gives every catalog artist in seed_tracks a real location so Discovery's
// Place filter has something to match. Sources, in order:
//
//   1. assets/geo/artist_locations.json — hand-checked hometowns, always win
//   2. Wikidata — one bulk query per ~20 artists: where a band formed
//      (P740) or where a musician was born (P19). Fast, no per-artist calls.
//   3. MusicBrainz — only for artists Wikidata couldn't place in a city,
//      1 request/second, waiting and retrying when it says "slow down"
//   4. Collaborations ("Ella Fitzgerald & Joe Pass") that still have no city
//      take the city of the first named member we can place
//
// Small towns and neighbourhoods the lookups return ("Brixton", "Fort
// Macleod") are found in assets/geo/gazetteer.tsv.gz and snapped to the
// nearest city.
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
const zlib = require('zlib');
const fetch = require('node-fetch');
const { pool } = require('../src/config/db');
const { cityLabel, distanceSql } = require('../src/services/geo');

const OVERRIDES_PATH = path.join(__dirname, '../assets/geo/artist_locations.json');
const MB_CACHE_PATH = path.join(__dirname, '../assets/geo/musicbrainz_cache.json');
const WD_CACHE_PATH = path.join(__dirname, '../assets/geo/wikidata_cache.json');
const GAZETTEER_PATH = path.join(__dirname, '../assets/geo/gazetteer.tsv.gz');
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

// ── "Ella Fitzgerald & Joe Pass" → ["Ella Fitzgerald", "Joe Pass"]. Only used
// after the full name found no city, because "Simon & Garfunkel" is a real
// act. A member only counts if it's an artist in the catalog, or at least two
// words that don't start with The/His/Her — so "Simon", "The Crickets" and
// "His Orchestra" are never looked up as if they were people. ──
const MEMBER_SPLIT = /\s+(?:&|and|feat\.?|featuring|ft\.?|with|vs\.?|meets|x)\s+|\s*[\/+,;]\s*/i;
function memberNames(name, isCatalogArtist) {
  const parts = name.split(MEMBER_SPLIT).map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return [];
  return parts.filter(p => isCatalogArtist(p) || (p.split(/\s+/).length >= 2 && !/^(the|his|her|their)\s/i.test(p)));
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
// ── Gazetteer: every GeoNames place over 500 people (small towns, suburbs,
// some neighbourhoods). Lookup only — it finds coordinates for hometowns
// like "Brixton" or "Fort Macleod" that the places table (cities over
// 15,000) doesn't hold; the artist is then snapped to the nearest city. ──
let gazetteer = null;
function loadGazetteer() {
  if (gazetteer) return gazetteer;
  gazetteer = new Map();
  let text;
  try {
    text = zlib.gunzipSync(fs.readFileSync(GAZETTEER_PATH)).toString('utf8');
  } catch (err) {
    console.log(`(No gazetteer at ${path.basename(GAZETTEER_PATH)} — small towns will stay country-only.)`);
    return gazetteer;
  }
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('name\t')) continue;
    const [name, asciiName, country, admin1, lat, lng, population] = line.split('\t');
    const entry = { name, country, admin1, lat: parseFloat(lat), lng: parseFloat(lng), population: parseInt(population, 10) || 0 };
    for (const key of new Set([name.toLowerCase(), asciiName.toLowerCase()])) {
      if (!gazetteer.has(key)) gazetteer.set(key, []);
      gazetteer.get(key).push(entry); // file is sorted by population, so lists are too
    }
  }
  return gazetteer;
}

const stripAccents = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

// ── Spellings to try for a place name: as given, known aliases, and
// "St." / "St" written out as "Saint" (GeoNames' convention) ──
const PLACE_ALIASES = { 'new york': 'New York City', 'washington, d.c.': 'Washington', 'washington d.c.': 'Washington', 'washington, dc': 'Washington', 'la habana': 'Havana' };
function placeNameVariants(name) {
  const out = [name];
  const alias = PLACE_ALIASES[name.toLowerCase()];
  if (alias) out.unshift(alias);
  if (/^St\.?\s/i.test(name)) out.push(name.replace(/^St\.?\s/i, 'Saint '));
  if (name.includes(',')) out.push(name.split(',')[0].trim());
  if (name.includes(' / ')) out.push(...name.split(' / ').map(p => p.trim())); // "Schaerbeek / Schaarbeek"
  return [...new Set(out)];
}

async function nearestCity(lat, lng) {
  const d = distanceSql('lat', 'lng', '$1::float8', '$2::float8');
  const r = await pool.query(
    `SELECT *, ${d} AS dist FROM places WHERE kind = 'city' AND ${d} <= $3 ORDER BY dist LIMIT 1`,
    [lat, lng, NEAREST_CITY_MI]
  );
  return r.rows[0] || null;
}

// ── A location guess → the columns to write. Tries, in order:
//   1. the city name (and its variants) in the places table
//   2. the name in the gazetteer → its coordinates
//   3. coordinates the source gave us (Wikidata)
//   4. the region, then just the country
// MusicBrainz's "country" is the artist's, not the place's, and is often
// missing — so with no country the biggest place of that name wins, but a
// place is never looked up in a different country than the one given. ──
async function resolveToColumns(loc) {
  if (!loc || loc.miss) return null;

  // MusicBrainz files some cities as a "subdivision" (Washington, D.C.,
  // Kingston upon Hull), so a region name gets tried as a place name too.
  const placeNames = [loc.city, loc.regionName].filter(Boolean);
  for (const placeName of placeNames) {
    const variants = placeNameVariants(placeName);
    for (const v of variants) {
      const r = await pool.query(
        `SELECT * FROM places
         WHERE kind = 'city' AND ($2::text IS NULL OR country_code = $2)
           AND (lower(ascii_name) = lower($1) OR lower(name) = lower($3))
         ORDER BY (admin1_code = $4) DESC NULLS LAST, population DESC
         LIMIT 1`,
        [stripAccents(v), loc.country || null, v, loc.region || '']
      );
      const p = r.rows[0];
      if (p) return { label: cityLabel(p), lat: p.lat, lng: p.lng, country: p.country_code, region: p.admin1_code };
    }
    const gaz = loadGazetteer();
    for (const v of variants) {
      const hits = (gaz.get(v.toLowerCase()) || gaz.get(stripAccents(v).toLowerCase()) || [])
        .filter(g => !loc.country || g.country === loc.country);
      if (!hits.length) continue;
      const g = hits.find(h => loc.region && h.admin1 === loc.region) || hits[0];
      const near = await nearestCity(g.lat, g.lng);
      const where = near ? (near.country_code === 'US' && near.admin1_code ? near.admin1_code : near.country_name) : g.country;
      return { label: `${g.name}, ${where}`, lat: g.lat, lng: g.lng, country: g.country, region: near ? near.admin1_code : null };
    }
  }

  if (loc.lat != null && loc.lng != null) {
    const p = await nearestCity(loc.lat, loc.lng);
    // Keep the source's own point (e.g. a neighbourhood) but borrow the nearby city's label/region
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

  // ── Every source's answer for a name, resolved against the places table and
  // gazetteer. The first one that pins down a city wins; otherwise the first
  // that at least gives a country. Cached per name for this run. ──
  const resolved = new Map();
  const bestFor = async (name) => {
    if (resolved.has(name)) return resolved.get(name);
    let fallback = null;
    let best = null;
    for (const loc of [override(name), wdCache[name], mbCache[name]]) {
      if (!loc || loc.miss) continue;
      const cols = await resolveToColumns(loc);
      if (!cols) continue;
      const answer = { cols, source: loc.source || 'musicbrainz' };
      if (cols.lat != null) { best = answer; break; }
      if (!fallback) fallback = answer;
    }
    const out = best || fallback;
    resolved.set(name, out);
    return out;
  };
  const cityKnown = async (name) => { const b = await bestFor(name); return !!(b && b.cols.lat != null); };
  const needCity = async (names) => {
    const out = [];
    for (const n of names) if (!(await cityKnown(n))) out.push(n);
    return out;
  };
  const forget = (names) => names.forEach(n => resolved.delete(n)); // after new lookups arrive

  if (!OFFLINE) {
    const todo = await needCity(artists);
    await lookupWikidata(todo, wdCache);
    forget(todo);
  }
  if (!SKIP_MB) {
    const todo = await needCity(artists);
    await lookupMusicBrainzAll(todo, mbCache);
    forget(todo);
  }

  // ── Collaborations: use the first named member we can place in a city ──
  const catalogKeys = new Set(artistRows.rows.map(r => r.artist.normalize('NFC').toLowerCase()));
  const catalogName = new Map(artistRows.rows.map(r => [r.artist.normalize('NFC').toLowerCase(), r.artist]));
  const isCatalogArtist = (p) => catalogKeys.has(p.normalize('NFC').toLowerCase());
  const members = new Map();
  for (const a of await needCity(artists)) {
    const m = memberNames(a, isCatalogArtist).map(p => catalogName.get(p.normalize('NFC').toLowerCase()) || p);
    if (m.length) members.set(a, m);
  }
  const memberList = [...new Set([...members.values()].flat())];
  if (memberList.length && !OFFLINE) {
    console.log(`Looking up ${memberList.length} collaboration members...`);
    let todo = await needCity(memberList);
    await lookupWikidata(todo, wdCache);
    forget(todo);
    if (!SKIP_MB) {
      todo = await needCity(memberList);
      await lookupMusicBrainzAll(todo, mbCache);
      forget(todo);
    }
  }

  // ── Write everything ──
  const stats = { city: 0, countryOnly: 0, unknown: 0, bySource: {} };
  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    let answer = await bestFor(artist);
    if (!(answer && answer.cols.lat != null) && members.has(artist)) {
      for (const m of members.get(artist)) {
        const viaMember = await bestFor(m);
        if (viaMember && viaMember.cols.lat != null) { answer = { cols: viaMember.cols, source: 'collaboration member' }; break; }
      }
    }
    if (answer) {
      const cols = answer.cols;
      await pool.query(
        `UPDATE seed_tracks SET location = $2, location_lat = $3, location_lng = $4, location_country = $5, location_region = $6
         WHERE artist = $1 AND is_user_upload IS NOT TRUE`,
        [artist, cols.label, cols.lat, cols.lng, cols.country, cols.region]
      );
      if (cols.lat != null) stats.city++; else stats.countryOnly++;
      stats.bySource[answer.source] = (stats.bySource[answer.source] || 0) + 1;
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
