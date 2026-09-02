import sys

PATH = sys.argv[1]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

original_len = len(content)


def apply(old, new, desc):
    global content
    count = content.count(old)
    if count != 1:
        print(f"FAIL ({count} occurrences): {desc}")
        sys.exit(1)
    content = content.replace(old, new, 1)
    print(f"OK: {desc}")


# ── 1. Apply UN-GOAT exclusion filtering to Hot in Here ──
apply(
    """    const tracks = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      genre: row.genre,
      location: row.location,
      musicianUsername: row.username,
      musicianDisplayName: row.display_name,
      coverUrl: getCoverUrl(row),
      audioUrl: getAudioUrl(row),
    }));

    res.json({ location: myLocation, tracks });""",
    """    // ── UN-GOAT exclusion ─ filter out the user's excluded artist (+ everyone
    // similar_artist-matched to them) if they've toggled GOAT mode to 'ungoat' ──
    const excluded = new Set((await getExcludedArtists(req.user.id)).map(a => a.toLowerCase()));
    const tracks = result.rows
      .filter(row => !excluded.has((row.artist || '').toLowerCase()))
      .map(row => ({
        id: row.id,
        title: row.title,
        artist: row.artist,
        album: row.album,
        genre: row.genre,
        location: row.location,
        musicianUsername: row.username,
        musicianDisplayName: row.display_name,
        coverUrl: getCoverUrl(row),
        audioUrl: getAudioUrl(row),
      }));

    res.json({ location: myLocation, tracks });""",
    "Hot in Here: apply UN-GOAT exclusion filter",
)

# ── 2. Insert the new stations/GOAT helper functions + endpoints, right after
# the /radio/my-station endpoint and before registration routes ──
NEW_RADIO_BLOCK = '''
// ─── Frequency-dial Radio tab ─ custom stations + GOAT/UN-GOAT ──────────────────────

// A station's track pool ─ the seed artist's own catalog rows plus tracks
// similar_artist-matched to them (same pattern /radio/my-station and
// /albums/discover already use), optionally filtering out an UN-GOAT'd
// artist + their similar-artist matches.
async function buildArtistStationTracks(seedArtist, excludeArtists = []) {
  const ownResult = await pool.query(
    `SELECT id, title, artist, album, genre, subgenre, mood,
            is_user_upload, uploaded_audio_url, uploaded_cover_url, cover, filename
     FROM seed_tracks
     WHERE artist = $1`,
    [seedArtist]
  );

  const matchedResult = await pool.query(
    `SELECT id, title, artist, album, genre, subgenre, mood,
            is_user_upload, uploaded_audio_url, uploaded_cover_url, cover, filename
     FROM seed_tracks
     WHERE similar_artist = $1 AND artist != $1
     ORDER BY random()
     LIMIT 40`,
    [seedArtist]
  );

  const excludeSet = new Set(excludeArtists.map(a => a.toLowerCase()));
  const filterExcluded = (rows) => excludeSet.size === 0
    ? rows
    : rows.filter(r => !excludeSet.has((r.artist || '').toLowerCase()));

  const mapRow = (row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album,
    genre: row.genre,
    subgenre: row.subgenre,
    mood: row.mood,
    coverUrl: getCoverUrl(row),
    audioUrl: getAudioUrl(row),
  });

  return [...filterExcluded(ownResult.rows), ...filterExcluded(matchedResult.rows)].map(mapRow);
}

// The current UN-GOAT exclusion set for a user ─ empty unless they've toggled
// GOAT mode to 'ungoat', in which case it's their goat_artist plus everyone
// similar_artist-matched to that artist.
async function getExcludedArtists(userId) {
  const userResult = await pool.query(
    `SELECT goat_artist, goat_mode FROM users WHERE id = $1`,
    [userId]
  );
  const { goat_artist, goat_mode } = userResult.rows[0] || {};
  if (!goat_artist || goat_mode !== 'ungoat') return [];

  const similarResult = await pool.query(
    `SELECT DISTINCT artist FROM seed_tracks WHERE similar_artist = $1`,
    [goat_artist]
  );
  return [goat_artist, ...similarResult.rows.map(r => r.artist)];
}

// List the user's custom stations plus their GOAT/UN-GOAT slot ─ metadata only
// (name/seedArtist/hue/position); a station's actual track pool is fetched
// lazily, only once the user tunes to it (see the two /tracks endpoints below).
router.get('/radio/stations', requireAuth, async (req, res) => {
  try {
    const stationsResult = await pool.query(
      `SELECT id, name, seed_artist, hue, position, created_at
       FROM radio_stations WHERE user_id = $1 ORDER BY created_at ASC`,
      [req.user.id]
    );
    const userResult = await pool.query(
      `SELECT goat_artist, goat_mode FROM users WHERE id = $1`,
      [req.user.id]
    );
    const { goat_artist, goat_mode } = userResult.rows[0] || {};

    res.json({
      stations: stationsResult.rows.map(s => ({
        id: s.id,
        name: s.name,
        seedArtist: s.seed_artist,
        hue: s.hue,
        position: s.position,
      })),
      goat: { artist: goat_artist || null, mode: goat_mode || 'goat' },
    });
  } catch (err) {
    console.error('List stations error:', err);
    res.status(500).json({ error: 'Failed to load stations.' });
  }
});

// Create a custom station ─ seeded from one artist, auto-populated with their
// catalog + similar-artist matches. hue/position are assigned once here so the
// station's dial blip stays put between sessions.
router.post('/radio/stations', requireAuth, async (req, res) => {
  const { name, seedArtist } = req.body;
  if (!name || !name.trim() || !seedArtist || !seedArtist.trim()) {
    return res.status(400).json({ error: 'Station name and seed artist are required.' });
  }

  try {
    const existingCount = await pool.query(
      `SELECT COUNT(*) FROM radio_stations WHERE user_id = $1`,
      [req.user.id]
    );
    const count = parseInt(existingCount.rows[0].count, 10);
    // Spread stations across the dial (avoiding the built-in stations' fixed
    // spots at the far left/center/far right), with a little jitter so
    // stations created back-to-back don't land exactly on top of each other.
    const position = Math.min(88, 12 + ((count * 19) % 76) + Math.random() * 5);
    const hue = Math.floor(Math.random() * 360);

    const result = await pool.query(
      `INSERT INTO radio_stations (user_id, name, seed_artist, hue, position)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, seed_artist, hue, position`,
      [req.user.id, name.trim(), seedArtist.trim(), hue, position]
    );

    const row = result.rows[0];
    res.json({
      station: {
        id: row.id, name: row.name, seedArtist: row.seed_artist,
        hue: row.hue, position: row.position,
      },
    });
  } catch (err) {
    console.error('Create station error:', err);
    res.status(500).json({ error: 'Failed to create station.' });
  }
});

// Delete one of the user's custom stations
router.delete('/radio/stations/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM radio_stations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete station error:', err);
    res.status(500).json({ error: 'Failed to delete station.' });
  }
});

// A custom station's track pool, with the UN-GOAT exclusion filter applied
router.get('/radio/stations/:id/tracks', requireAuth, async (req, res) => {
  try {
    const stationResult = await pool.query(
      `SELECT id, name, seed_artist, hue, position FROM radio_stations
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    const station = stationResult.rows[0];
    if (!station) {
      return res.status(404).json({ error: 'Station not found.' });
    }

    const excluded = await getExcludedArtists(req.user.id);
    const tracks = await buildArtistStationTracks(station.seed_artist, excluded);

    res.json({
      station: {
        id: station.id, name: station.name, seedArtist: station.seed_artist,
        hue: station.hue, position: station.position,
      },
      tracks,
    });
  } catch (err) {
    console.error('Station tracks error:', err);
    res.status(500).json({ error: 'Failed to load station tracks.' });
  }
});

// Set (or change) the GOAT / UN-GOAT slot ─ one seed artist, toggled between
// "play them + similar most" (goat) and "never play them or anyone similar,
// anywhere in Radio" (ungoat, enforced via getExcludedArtists above).
router.put('/radio/goat', requireAuth, async (req, res) => {
  const { artist, mode } = req.body;
  if (mode !== undefined && mode !== 'goat' && mode !== 'ungoat') {
    return res.status(400).json({ error: 'mode must be "goat" or "ungoat".' });
  }

  try {
    const fields = [];
    const values = [];
    let i = 1;
    if (artist !== undefined) { fields.push(`goat_artist = $${i++}`); values.push(artist || null); }
    if (mode !== undefined) { fields.push(`goat_mode = $${i++}`); values.push(mode); }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING goat_artist, goat_mode`,
      values
    );
    res.json({ goat: { artist: result.rows[0].goat_artist, mode: result.rows[0].goat_mode } });
  } catch (err) {
    console.error('Set GOAT error:', err);
    res.status(500).json({ error: 'Failed to update GOAT station.' });
  }
});

// The GOAT station's track pool ─ only meaningful in 'goat' mode; in 'ungoat'
// mode this station plays nothing (its whole purpose there is exclusion, applied
// to every other station via getExcludedArtists).
router.get('/radio/goat/tracks', requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT goat_artist, goat_mode FROM users WHERE id = $1`,
      [req.user.id]
    );
    const { goat_artist, goat_mode } = userResult.rows[0] || {};
    if (!goat_artist) {
      return res.json({ artist: null, mode: goat_mode || 'goat', tracks: [] });
    }
    if (goat_mode === 'ungoat') {
      return res.json({ artist: goat_artist, mode: 'ungoat', tracks: [] });
    }

    const tracks = await buildArtistStationTracks(goat_artist);
    res.json({ artist: goat_artist, mode: 'goat', tracks });
  } catch (err) {
    console.error('GOAT tracks error:', err);
    res.status(500).json({ error: 'Failed to load GOAT station.' });
  }
});

'''

apply(
    """  } catch (err) {
    console.error('My station error:', err);
    res.status(500).json({ error: 'Failed to build your station.' });
  }
});

// Email/password registration""",
    """  } catch (err) {
    console.error('My station error:', err);
    res.status(500).json({ error: 'Failed to build your station.' });
  }
});
""" + NEW_RADIO_BLOCK + """
// Email/password registration""",
    "insert stations/GOAT helper functions + endpoints after /radio/my-station",
)

# ── 3. Insert POST /history/rate between search-selection and history/recent ──
apply(
    """    res.json({ success: true });
  } catch (err) {
    console.error('Search selection history error:', err);
    res.status(500).json({ error: 'Failed to record search selection' });
  }
});

// Get the user's most recent activity""",
    """    res.json({ success: true });
  } catch (err) {
    console.error('Search selection history error:', err);
    res.status(500).json({ error: 'Failed to record search selection' });
  }
});

// Record a thumbs up/down rating on a track ─ personalized signal (distinct from
// seed_tracks.thumb_up/thumb_down's global counters). Upserts into the same
// user_play_history row play history already uses, so rating a track straight
// from a Radio station (before it's technically "played") still works.
router.post('/history/rate', requireAuth, async (req, res) => {
  const { title, artist, album, genre, rating } = req.body;
  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required.' });
  }
  if (rating !== 1 && rating !== -1) {
    return res.status(400).json({ error: 'rating must be 1 or -1.' });
  }

  try {
    await pool.query(
      `INSERT INTO user_play_history (user_id, track_title, artist, album, genre, rating)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, track_title, artist)
       DO UPDATE SET rating = $6`,
      [req.user.id, title, artist, album || null, genre || null, rating]
    );
    res.json({ success: true, rating });
  } catch (err) {
    console.error('Rate track error:', err);
    res.status(500).json({ error: 'Failed to rate track.' });
  }
});

// Get the user's most recent activity""",
    "insert POST /history/rate",
)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Done. length {original_len} -> {len(content)}")
