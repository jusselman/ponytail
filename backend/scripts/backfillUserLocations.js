// backfillUserLocations.js
// Before migration 011, musicians typed their city as free text
// (users.location, e.g. "Oakland" or "san francisco, ca"). This matches
// those strings to the places table so existing musicians get coordinates,
// then stamps the same location onto their uploaded tracks.
// Anything it can't match is listed so the musician can pick their city again.
//
// Usage: node scripts/backfillUserLocations.js

const { pool } = require('../src/config/db');
const { cityLabel } = require('../src/services/geo');

const ascii = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '');

async function backfill() {
  const users = await pool.query(
    `SELECT id, username, location FROM users
     WHERE location IS NOT NULL AND TRIM(location) != '' AND location_lat IS NULL`
  );
  console.log(`${users.rows.length} users with a typed city and no coordinates`);
  const unmatched = [];

  for (const u of users.rows) {
    const [cityPart, ...rest] = u.location.split(',').map(s => s.trim()).filter(Boolean);
    const hint = rest.join(', ');
    // Prefer a city whose state/region code or country matches the text after
    // the comma ("Portland, OR" vs "Portland, ME"), otherwise the biggest one.
    const r = await pool.query(
      `SELECT * FROM places
       WHERE kind = 'city' AND lower(ascii_name) = lower($1)
       ORDER BY (lower(admin1_code) = lower($2) OR lower(country_code) = lower($2)
                 OR lower(country_name) = lower($2) OR lower(region_name) = lower($2)) DESC,
                population DESC
       LIMIT 1`,
      [ascii(cityPart), hint]
    );
    const p = r.rows[0];
    if (!p) { unmatched.push(`${u.username}: "${u.location}"`); continue; }
    const label = cityLabel(p);
    await pool.query(
      `UPDATE users SET location = $1, location_place_id = $2, location_lat = $3, location_lng = $4,
         location_country = $5, location_region = $6 WHERE id = $7`,
      [label, p.id, p.lat, p.lng, p.country_code, p.admin1_code, u.id]
    );
    await pool.query(
      `UPDATE seed_tracks SET location = $1, location_lat = $2, location_lng = $3, location_country = $4, location_region = $5
       WHERE uploader_user_id = $6 AND is_user_upload = TRUE`,
      [label, p.lat, p.lng, p.country_code, p.admin1_code, u.id]
    );
    console.log(`  ${u.username}: "${u.location}" → ${label}`);
  }
  if (unmatched.length) {
    console.log(`\nCouldn't match ${unmatched.length}:`);
    unmatched.forEach(line => console.log(`  ${line}`));
  }
  console.log('Done.');
}

backfill()
  .catch(err => { console.error('backfillUserLocations failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());
