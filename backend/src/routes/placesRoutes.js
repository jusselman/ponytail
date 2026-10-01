// placesRoutes.js — mounted at /api/places
// Backs the Discovery filter's Place tab (search, near-me radii, scene tiles)
// and the musician onboarding city picker. The actual track filtering lives
// in GET /api/auth/albums/discover via its `places` + `near` params.

const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/authMiddleware');
const geo = require('../services/geo');

const router = express.Router();

const KIND_ORDER = `CASE kind WHEN 'metro' THEN 0 WHEN 'city' THEN 1 WHEN 'region' THEN 2 ELSE 3 END`;
const normalize = (q) => String(q || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// ── Places whose name starts with (or contains) the query. Prefix matches
// rank first, then by kind (metro, city, region, country), then population. ──
async function findPlaces(q, { kinds = null, limit = 6 } = {}) {
  const params = [q, `${q}%`, `%${q}%`];
  let kindCond = '';
  if (kinds) {
    params.push(kinds);
    kindCond = `AND kind = ANY($${params.length})`;
  }
  params.push(limit);
  const r = await pool.query(
    `SELECT * FROM places
     WHERE (lower(ascii_name) LIKE $3 OR lower(name) LIKE $3) ${kindCond}
     ORDER BY (lower(ascii_name) = $1) DESC, (lower(ascii_name) LIKE $2) DESC, ${KIND_ORDER}, population DESC
     LIMIT $${params.length}`,
    params
  );
  return r.rows;
}

// ── GET /api/places/cities?q=oak — public, used by musician onboarding and
// the "set your city" prompt before a listener has a home city. ──
router.get('/cities', async (req, res) => {
  const q = normalize(req.query.q);
  if (q.length < 2) return res.json({ cities: [] });
  try {
    const rows = await findPlaces(q, { kinds: ['city'], limit: 8 });
    res.json({
      cities: rows.map(p => ({
        id: p.id,
        label: geo.cityLabel(p),
        // label already carries the state (US) or country, so the subtitle adds the region name when there is one
        sub: p.region_name || (p.country_code === 'US' ? p.country_name : null),
      })),
    });
  } catch (err) {
    console.error('City search error:', err);
    res.status(500).json({ error: 'Failed to search cities' });
  }
});

// ── GET /api/places/search?q=man&genres=Rock,Punk
// Places (with how many tracks each would give for the current genres) plus
// located musicians whose name matches. ──
router.get('/search', requireAuth, async (req, res) => {
  const q = normalize(req.query.q);
  if (!q) return res.json({ places: [], musicians: [] });
  const genres = geo.parseGenres(req.query.genres);
  try {
    // ── Pull a wide net of name matches, then put the ones that actually have
    // music first — otherwise "man" shows Man (Ivory Coast) before Manchester. ──
    const candidates = await findPlaces(q, { limit: 40 });
    const candidateCounts = await geo.countTracks(candidates.map(p => [geo.specForPlace(p)]), genres);
    const ranked = candidates
      .map((p, i) => ({ p, count: candidateCounts[i], i }))
      .sort((a, b) => (b.count > 0) - (a.count > 0) || a.i - b.i)
      .slice(0, 6);
    const rows = ranked.map(r => r.p);
    const counts = ranked.map(r => r.count);

    const m = await pool.query(
      `SELECT artist, MAX(location) AS location, BOOL_OR(is_user_upload) AS is_upload
       FROM seed_tracks
       WHERE artist ILIKE $1 AND (location_lat IS NOT NULL OR location_country IS NOT NULL)
       GROUP BY artist
       ORDER BY (lower(artist) LIKE $2) DESC, COUNT(*) DESC
       LIMIT 4`,
      [`%${q}%`, `${q}%`]
    );

    res.json({
      places: rows.map((p, i) => ({ ...geo.describePlace(p), count: counts[i] })),
      musicians: m.rows.map(r => ({
        id: `a:${r.artist}`,
        artist: r.artist,
        label: `Around ${r.artist}`,
        sub: `${r.location || 'Location unknown'} · ${geo.CITY_RADIUS_MI} mi`,
        location: r.location,
        isUpload: !!r.is_upload,
      })),
    });
  } catch (err) {
    console.error('Place search error:', err);
    res.status(500).json({ error: 'Failed to search places' });
  }
});

// ── GET /api/places/options?genres=Hip-Hop
// Everything the Place tab shows before the listener types anything: their
// home city, track counts per near-me radius, and the scene tiles. ──
router.get('/options', requireAuth, async (req, res) => {
  const genres = geo.parseGenres(req.query.genres);
  try {
    const home = await geo.userHome(req.user.id);
    const radiusCounts = home
      ? await geo.countTracks(geo.NEAR_RADII_MI.map(r => [{ type: 'circle', lat: home.lat, lng: home.lng, radius: r }]), genres)
      : geo.NEAR_RADII_MI.map(() => null);

    // ── Resolve each scene to its places row (largest population wins) ──
    const scenes = [];
    for (const s of geo.SCENES) {
      const r = await pool.query(
        `SELECT * FROM places WHERE kind = $1 AND ascii_name = $2 AND country_code = $3 ORDER BY population DESC LIMIT 1`,
        [s.kind, s.name, s.country]
      );
      if (r.rows[0]) scenes.push({ place: r.rows[0], scene: s });
    }
    const sceneCounts = await geo.countTracks(scenes.map(({ place }) => [geo.specForPlace(place)]), genres);

    // ── Two best-known artists per scene, for the tile's subtitle ──
    const sceneTiles = [];
    for (let i = 0; i < scenes.length; i++) {
      const { place, scene } = scenes[i];
      const params = [];
      const cond = geo.specSql(geo.specForPlace(place), params);
      let genreCond = '';
      if (genres.length) {
        params.push(genres);
        genreCond = `AND genre = ANY($${params.length})`;
      }
      const top = await pool.query(
        `SELECT MIN(artist) AS artist FROM seed_tracks WHERE ${cond} ${genreCond}
         GROUP BY lower(artist) ORDER BY COUNT(*) DESC LIMIT 2`,
        params
      );
      sceneTiles.push({
        ...geo.describePlace(place, scene.label),
        hue: scene.hue,
        count: sceneCounts[i],
        topArtists: top.rows.map(t => t.artist),
      });
    }

    res.json({
      home: home ? { label: home.label } : null,
      radii: geo.NEAR_RADII_MI.map((r, i) => ({ radius: r, count: radiusCounts[i] })),
      scenes: sceneTiles,
    });
  } catch (err) {
    console.error('Place options error:', err);
    res.status(500).json({ error: 'Failed to load place options' });
  }
});

// ── PUT /api/places/home { placeId } — sets the listener's home city (what
// "Near me" measures from). Musicians set this during onboarding too. ──
router.put('/home', requireAuth, async (req, res) => {
  const placeId = parseInt(req.body?.placeId, 10);
  if (!placeId) return res.status(400).json({ error: 'placeId is required.' });
  try {
    const r = await pool.query(`SELECT * FROM places WHERE id = $1 AND kind = 'city'`, [placeId]);
    const p = r.rows[0];
    if (!p) return res.status(404).json({ error: 'That city was not found.' });
    const label = geo.cityLabel(p);
    await pool.query(
      `UPDATE users SET location = $1, location_place_id = $2, location_lat = $3, location_lng = $4,
         location_country = $5, location_region = $6
       WHERE id = $7`,
      [label, p.id, p.lat, p.lng, p.country_code, p.admin1_code, req.user.id]
    );
    // ── Keep this musician's own uploads in step with their new home ──
    await pool.query(
      `UPDATE seed_tracks SET location = $1, location_lat = $2, location_lng = $3, location_country = $4, location_region = $5
       WHERE uploader_user_id = $6 AND is_user_upload = TRUE`,
      [label, p.lat, p.lng, p.country_code, p.admin1_code, req.user.id]
    );
    res.json({ home: { label } });
  } catch (err) {
    console.error('Set home error:', err);
    res.status(500).json({ error: 'Failed to save your city' });
  }
});

module.exports = router;
