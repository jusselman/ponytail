import sys

PATH = sys.argv[1]

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

original_len = len(content)

ANCHOR = "  } catch (err) {\n    console.log('Failed to record search selection:', err);\n  }\n};"

count = content.count(ANCHOR)
if count != 1:
    print(f"FAIL ({count} occurrences): anchor not found uniquely")
    sys.exit(1)

ADDITION = '''

// ─── Frequency-dial Radio tab ─ custom stations + GOAT/UN-GOAT ──────────────────────

// Metadata for the user's custom stations plus their GOAT/UN-GOAT slot
// ({ artist, mode }). Does not include track pools — fetch a station's tracks
// lazily via getStationTracks/getGoatTracks once the user tunes to it.
export const getRadioStations = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/radio/stations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Create a custom station, seeded from one artist (auto-populated with their
// catalog + similar-artist matches server-side).
export const createRadioStation = async (name, seedArtist) => {
  const token = await getToken();
  const response = await axios.post(`${API_URL}/auth/radio/stations`, { name, seedArtist }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deleteRadioStation = async (stationId) => {
  const token = await getToken();
  const response = await axios.delete(`${API_URL}/auth/radio/stations/${stationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// A custom station's track pool (UN-GOAT exclusion already applied server-side)
export const getStationTracks = async (stationId) => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/radio/stations/${stationId}/tracks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Set/change the GOAT artist and/or toggle GOAT <-> UN-GOAT mode. Pass only
// the field you want changed — { artist } to (re)pick the GOAT, { mode } to
// flip modes, or both at once.
export const setGoat = async ({ artist, mode } = {}) => {
  const token = await getToken();
  const body = {};
  if (artist !== undefined) body.artist = artist;
  if (mode !== undefined) body.mode = mode;
  const response = await axios.put(`${API_URL}/auth/radio/goat`, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// The GOAT station's track pool ─ empty in 'ungoat' mode (that mode's whole
// purpose is excluding the artist elsewhere, not playing them here)
export const getGoatTracks = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/radio/goat/tracks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Artist name autocomplete ─ used by the add-station and GOAT-picker artist
// search inputs.
export const searchArtists = async (q) => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/artists/search`, {
    params: { q },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Thumbs up (1) / thumbs down (-1) a track ─ personalized signal recorded
// against user_play_history, distinct from the track's global like/dislike
// counters.
export const rateTrack = async (track, rating) => {
  const token = await getToken();
  const response = await axios.post(`${API_URL}/auth/history/rate`, {
    title: track.title,
    artist: track.artist,
    album: track.album,
    genre: track.genre,
    rating,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
'''

content = content + ADDITION

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Done. length {original_len} -> {len(content)}")
