// importPlaces.js
// Loads assets/geo/cities.tsv (GeoNames, population >= 15,000) into the
// places table, then derives one row per region (state/province, where
// cities.tsv has a name for it) and one per country, plus the hand-drawn
// metros below. Safe to re-run: every row is upserted.
//
// Needs migration 011_geolocation.sql first.
// Usage: node scripts/importPlaces.js

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const INPUT_PATH = path.join(__dirname, '../assets/geo/cities.tsv');
const BATCH_SIZE = 2000;

// ── Metros: regions people talk about that aren't a single city or an
// admin boundary. Matched as a circle (radius_mi) around lat/lng. ──
const METROS = [
  { name: 'Bay Area', country_code: 'US', country_name: 'United States', admin1_code: 'CA', region_name: 'California', lat: 37.75, lng: -122.3, radius_mi: 45 },
];

function readCities() {
  const lines = fs.readFileSync(INPUT_PATH, 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
  const header = lines.shift().split('\t');
  return lines.map(line => {
    const cols = line.split('\t');
    const row = Object.fromEntries(header.map((h, i) => [h, cols[i]]));
    return {
      geoname_id: parseInt(row.geoname_id, 10),
      name: row.name,
      ascii_name: row.ascii_name || row.name,
      country_code: row.country_code,
      country_name: row.country_name,
      admin1_code: row.admin1_code || null,
      region_name: row.region_name || null,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      population: parseInt(row.population, 10) || 0,
    };
  });
}

// ── Population-weighted centre + total population for a group of cities ──
function summarize(cities) {
  const total = cities.reduce((s, c) => s + c.population, 0) || 1;
  return {
    lat: cities.reduce((s, c) => s + c.lat * c.population, 0) / total,
    lng: cities.reduce((s, c) => s + c.lng * c.population, 0) / total,
    population: cities.reduce((s, c) => s + c.population, 0),
  };
}

async function insertCities(cities) {
  for (let i = 0; i < cities.length; i += BATCH_SIZE) {
    const b = cities.slice(i, i + BATCH_SIZE);
    await pool.query(
      `INSERT INTO places (kind, geoname_id, name, ascii_name, country_code, country_name, admin1_code, region_name, lat, lng, population)
       SELECT 'city', * FROM unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::float8[], $9::float8[], $10::bigint[])
       ON CONFLICT (geoname_id) WHERE geoname_id IS NOT NULL DO UPDATE SET
         name = EXCLUDED.name, ascii_name = EXCLUDED.ascii_name, country_code = EXCLUDED.country_code,
         country_name = EXCLUDED.country_name, admin1_code = EXCLUDED.admin1_code, region_name = EXCLUDED.region_name,
         lat = EXCLUDED.lat, lng = EXCLUDED.lng, population = EXCLUDED.population`,
      [
        b.map(c => c.geoname_id), b.map(c => c.name), b.map(c => c.ascii_name), b.map(c => c.country_code),
        b.map(c => c.country_name), b.map(c => c.admin1_code), b.map(c => c.region_name),
        b.map(c => c.lat), b.map(c => c.lng), b.map(c => c.population),
      ]
    );
    process.stdout.write(`\r  cities: ${Math.min(i + BATCH_SIZE, cities.length)}/${cities.length}`);
  }
  process.stdout.write('\n');
}

async function importPlaces() {
  const cities = readCities();
  console.log(`Read ${cities.length} cities from cities.tsv`);
  await insertCities(cities);

  // ── Regions (only where cities.tsv carries a readable name) ──
  const regionGroups = new Map();
  cities.filter(c => c.region_name).forEach(c => {
    const key = `${c.country_code}|${c.admin1_code}`;
    if (!regionGroups.has(key)) regionGroups.set(key, []);
    regionGroups.get(key).push(c);
  });
  for (const group of regionGroups.values()) {
    const c0 = group[0], s = summarize(group);
    await pool.query(
      `INSERT INTO places (kind, name, ascii_name, country_code, country_name, admin1_code, region_name, lat, lng, population)
       VALUES ('region', $1, $1, $2, $3, $4, $1, $5, $6, $7)
       ON CONFLICT (country_code, admin1_code) WHERE kind = 'region' DO UPDATE SET
         name = EXCLUDED.name, ascii_name = EXCLUDED.ascii_name, lat = EXCLUDED.lat, lng = EXCLUDED.lng, population = EXCLUDED.population`,
      [c0.region_name, c0.country_code, c0.country_name, c0.admin1_code, s.lat, s.lng, s.population]
    );
  }
  console.log(`  regions: ${regionGroups.size}`);

  // ── Countries ──
  const countryGroups = new Map();
  cities.forEach(c => {
    if (!countryGroups.has(c.country_code)) countryGroups.set(c.country_code, []);
    countryGroups.get(c.country_code).push(c);
  });
  for (const group of countryGroups.values()) {
    const c0 = group[0], s = summarize(group);
    const ascii = c0.country_name.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    await pool.query(
      `INSERT INTO places (kind, name, ascii_name, country_code, country_name, lat, lng, population)
       VALUES ('country', $1, $2, $3, $1, $4, $5, $6)
       ON CONFLICT (country_code) WHERE kind = 'country' DO UPDATE SET
         name = EXCLUDED.name, ascii_name = EXCLUDED.ascii_name, lat = EXCLUDED.lat, lng = EXCLUDED.lng, population = EXCLUDED.population`,
      [c0.country_name, ascii, c0.country_code, s.lat, s.lng, s.population]
    );
  }
  console.log(`  countries: ${countryGroups.size}`);

  // ── Metros ──
  for (const m of METROS) {
    await pool.query(
      `INSERT INTO places (kind, name, ascii_name, country_code, country_name, admin1_code, region_name, lat, lng, radius_mi, population)
       VALUES ('metro', $1, $1, $2, $3, $4, $5, $6, $7, $8, 0)
       ON CONFLICT (name) WHERE kind = 'metro' DO UPDATE SET
         country_code = EXCLUDED.country_code, country_name = EXCLUDED.country_name, admin1_code = EXCLUDED.admin1_code,
         region_name = EXCLUDED.region_name, lat = EXCLUDED.lat, lng = EXCLUDED.lng, radius_mi = EXCLUDED.radius_mi`,
      [m.name, m.country_code, m.country_name, m.admin1_code, m.region_name, m.lat, m.lng, m.radius_mi]
    );
  }
  console.log(`  metros: ${METROS.length}`);
  console.log('Done.');
}

importPlaces()
  .catch(err => { console.error('importPlaces failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());
