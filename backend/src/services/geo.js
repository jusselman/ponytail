// geo.js
// Shared helpers for the Discovery "Place" filter: labels for places, the
// haversine distance expression, and turning a listener's place selections
// into a SQL condition against seed_tracks' resolved location columns
// (location_lat / location_lng / location_country / location_region — see
// migration 011_geolocation.sql).

const pool = require('../config/db');

const CITY_RADIUS_MI = 25;             // a picked city matches anything this close
const NEAR_RADII_MI = [25, 100, 250, 500];
const MAX_PLACES = 3;                  // same cap the panel enforces
const EARTH_RADIUS_MI = 3958.8;

// ── Where a listener is assumed to be until they set a city of their own.
// Used by Radio's Hot in Here station (see GET /radio/hot-in-here). Change
// or remove this once every account is asked for a location. ──
const DEFAULT_HOME = { label: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 };
const HOT_IN_HERE_RADIUS_MI = 10;

// ── Scenes shown as tiles in the Place tab: the eight places with the most
// located tracks in the catalog (checked Oct 2026), biggest first. A fixed
// list for the MVP — counts and artist names on each tile are still live.
// Resolved to places rows by name + country (largest population wins), so
// they survive a places re-import. ──
const SCENES = [
  { kind: 'city', name: 'London', country: 'GB', hue: 240 },
  { kind: 'city', name: 'New York City', country: 'US', hue: 280, label: 'New York' },
  { kind: 'city', name: 'Los Angeles', country: 'US', hue: 340 },
  { kind: 'city', name: 'Liverpool', country: 'GB', hue: 130 },
  { kind: 'city', name: 'Chicago', country: 'US', hue: 20 },
  { kind: 'metro', name: 'Bay Area', country: 'US', hue: 170 },
  { kind: 'city', name: 'Manchester', country: 'GB', hue: 215 },
  { kind: 'city', name: 'Seattle', country: 'US', hue: 45 },
];

// ── Haversine distance in miles between a lat/lng column pair and two
// numeric SQL expressions (usually $n placeholders). ──
function distanceSql(latCol, lngCol, latExpr, lngExpr) {
  return `(${EARTH_RADIUS_MI} * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(${latCol} - ${latExpr}) / 2), 2) +
    COS(RADIANS(${latExpr})) * COS(RADIANS(${latCol})) *
    POWER(SIN(RADIANS(${lngCol} - ${lngExpr}) / 2), 2))))`;
}

// ── "Oakland, CA" for US cities, "Manchester, United Kingdom" elsewhere ──
function cityLabel(p) {
  if (!p) return null;
  if (p.country_code === 'US' && p.admin1_code) return `${p.name}, ${p.admin1_code}`;
  return p.country_name ? `${p.name}, ${p.country_name}` : p.name;
}

// ── The label + subtitle a place gets in search results and chips ──
function describePlace(p, labelOverride) {
  const label = labelOverride || p.name;
  switch (p.kind) {
    case 'city': {
      const where = p.country_code === 'US' && p.admin1_code ? p.admin1_code : p.country_name;
      return { id: `p:${p.id}`, kind: 'city', label, sub: `${where} · ${CITY_RADIUS_MI} mi` };
    }
    case 'metro':
      return { id: `p:${p.id}`, kind: 'metro', label, sub: `Metro · ${p.admin1_code || p.country_name}` };
    case 'region':
      return { id: `p:${p.id}`, kind: 'region', label, sub: `Region · ${p.country_name}` };
    default:
      return { id: `p:${p.id}`, kind: 'country', label, sub: 'Country' };
  }
}

// ── A place row → the spec used to build its SQL condition ──
function specForPlace(p) {
  if (p.kind === 'city') return { type: 'circle', lat: p.lat, lng: p.lng, radius: CITY_RADIUS_MI };
  if (p.kind === 'metro') return { type: 'circle', lat: p.lat, lng: p.lng, radius: p.radius_mi || CITY_RADIUS_MI };
  if (p.kind === 'region') return { type: 'region', country: p.country_code, region: p.admin1_code };
  return { type: 'country', country: p.country_code };
}

// ── One spec → SQL, pushing its values onto params. Columns default to the
// bare seed_tracks names; pass a prefix like 'st.' when the query aliases it. ──
function specSql(spec, params, prefix = '') {
  if (spec.type === 'circle') {
    params.push(spec.lat, spec.lng, spec.radius);
    const n = params.length;
    return `(${prefix}location_lat IS NOT NULL AND ${distanceSql(`${prefix}location_lat`, `${prefix}location_lng`, `$${n - 2}::float8`, `$${n - 1}::float8`)} <= $${n}::float8)`;
  }
  if (spec.type === 'region') {
    params.push(spec.country, spec.region);
    return `(${prefix}location_country = $${params.length - 1} AND ${prefix}location_region = $${params.length})`;
  }
  params.push(spec.country);
  return `(${prefix}location_country = $${params.length})`;
}

// ── Several specs OR'd together (a listener's places match if ANY does) ──
function specsSql(specs, params, prefix = '') {
  if (!specs.length) return null;
  return `(${specs.map(s => specSql(s, params, prefix)).join(' OR ')})`;
}

// ── Parse the `places` query param: a JSON array of tokens like
// "p:123" (a places row) or "a:Hella" (around that artist). Bad input → []. ──
function parsePlaceTokens(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(t => typeof t === 'string' && /^(p:\d+|a:.+)$/.test(t)).slice(0, MAX_PLACES);
  } catch {
    return [];
  }
}

const parseNearRadius = (raw) => {
  const r = parseInt(raw, 10);
  return NEAR_RADII_MI.includes(r) ? r : null;
};

// ── Where an artist is, taken from any of their located seed_tracks rows ──
async function artistLocation(artist) {
  const r = await pool.query(
    `SELECT location_lat, location_lng FROM seed_tracks
     WHERE artist = $1 AND location_lat IS NOT NULL LIMIT 1`,
    [artist]
  );
  return r.rows[0] ? { lat: r.rows[0].location_lat, lng: r.rows[0].location_lng } : null;
}

async function userHome(userId) {
  const r = await pool.query(
    `SELECT location, location_lat, location_lng FROM users WHERE id = $1`,
    [userId]
  );
  const u = r.rows[0];
  if (!u || u.location_lat == null) return null;
  return { label: u.location, lat: u.location_lat, lng: u.location_lng };
}

// ── Tokens + near radius → the list of specs to OR together. Unknown place
// ids, unlocated artists and a listener with no home city are skipped. ──
async function resolvePlaceSpecs({ tokens = [], nearRadius = null, userId = null }) {
  const specs = [];
  const placeIds = tokens.filter(t => t.startsWith('p:')).map(t => parseInt(t.slice(2), 10));
  if (placeIds.length) {
    const r = await pool.query(`SELECT * FROM places WHERE id = ANY($1::int[])`, [placeIds]);
    r.rows.forEach(p => specs.push(specForPlace(p)));
  }
  for (const t of tokens.filter(t => t.startsWith('a:'))) {
    const loc = await artistLocation(t.slice(2));
    if (loc) specs.push({ type: 'circle', lat: loc.lat, lng: loc.lng, radius: CITY_RADIUS_MI });
  }
  if (nearRadius && userId) {
    const home = await userHome(userId);
    if (home) specs.push({ type: 'circle', lat: home.lat, lng: home.lng, radius: nearRadius });
  }
  return specs;
}

// ── Genre param (comma list, max 5) → array, or [] ──
const parseGenres = (raw) => (raw ? String(raw).split(',').map(g => g.trim()).filter(Boolean).slice(0, 5) : []);

// ── Count tracks matching each of several spec groups in one pass over
// seed_tracks, honouring the listener's genre selection. Returns numbers in
// the same order as specGroups. ──
async function countTracks(specGroups, genres = []) {
  if (!specGroups.length) return [];
  const params = [];
  const sums = specGroups.map(specs => {
    const cond = specsSql(specs, params);
    return cond ? `COUNT(*) FILTER (WHERE ${cond})::int` : '0';
  });
  let where = `(location_lat IS NOT NULL OR location_country IS NOT NULL)`;
  if (genres.length) {
    params.push(genres);
    where += ` AND genre = ANY($${params.length})`;
  }
  const r = await pool.query(`SELECT ${sums.map((s, i) => `${s} AS c${i}`).join(', ')} FROM seed_tracks WHERE ${where}`, params);
  return specGroups.map((_, i) => r.rows[0][`c${i}`] || 0);
}

module.exports = {
  CITY_RADIUS_MI, NEAR_RADII_MI, MAX_PLACES, SCENES, DEFAULT_HOME, HOT_IN_HERE_RADIUS_MI,
  distanceSql, cityLabel, describePlace, specForPlace, specSql, specsSql,
  parsePlaceTokens, parseNearRadius, parseGenres, resolvePlaceSpecs, userHome, countTracks,
};
