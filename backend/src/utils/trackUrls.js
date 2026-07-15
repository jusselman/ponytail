// Shared cover/audio URL resolution for anything backed by a seed_tracks row.
// Extracted out of authRoutes.js so playlistController.js (and anything else that
// needs to resolve a track's real playable URLs) can reuse the exact same logic
// instead of re-implementing a slightly-different copy — see the "playlist track
// covers not showing" bug this was pulled out to fix.

const path = require('path');
const fs = require('fs');

// ── Cache directory listings at startup for fast fuzzy matching ──
const COVERS_ROOT = path.join(__dirname, '../../assets/dev_seed/covers');
const MP3_ROOT = path.join(__dirname, '../../assets/dev_seed/mp3');

const normalize = (s) => s
  .toLowerCase()
  .replace(/\b(and|feat|ft|with|vs)\b/g, '') // strip common connector words
  .replace(/[^a-z0-9]/g, '');

// ── Build a normalized lookup map once: normalized name -> real filename ──
const buildNormalizedMap = (files) => {
  const map = new Map();
  for (const f of files) {
    map.set(normalize(f), f);
  }
  return map;
};

let coversMap = new Map();
let artistFoldersMap = new Map(); // normalized artist name -> real folder name

try {
  const coverFiles = fs.readdirSync(COVERS_ROOT);
  coversMap = buildNormalizedMap(coverFiles);
  console.log(`Cached ${coversMap.size} cover filenames for fuzzy matching.`);
} catch (err) {
  console.error('Failed to read covers directory:', err.message);
}

try {
  const artistFolders = fs.readdirSync(MP3_ROOT);
  artistFoldersMap = buildNormalizedMap(artistFolders);
  console.log(`Cached ${artistFoldersMap.size} artist folders for fuzzy matching.`);
} catch (err) {
  console.error('Failed to read mp3 directory:', err.message);
}

// ── Cache album folders per artist, built lazily on first access ──
const albumFoldersCache = new Map(); // realArtistFolder -> Map(normalized album -> real folder)

const getAlbumMap = (realArtistFolder) => {
  if (albumFoldersCache.has(realArtistFolder)) {
    return albumFoldersCache.get(realArtistFolder);
  }
  try {
    const albums = fs.readdirSync(path.join(MP3_ROOT, realArtistFolder));
    const map = buildNormalizedMap(albums);
    albumFoldersCache.set(realArtistFolder, map);
    return map;
  } catch {
    const empty = new Map();
    albumFoldersCache.set(realArtistFolder, empty);
    return empty;
  }
};

// ── Cache track filenames per album, built lazily on first access ──
const trackFilesCache = new Map(); // "artistFolder/albumFolder" -> Map(normalized filename -> real filename)

const getTrackMap = (realArtistFolder, realAlbumFolder) => {
  const key = `${realArtistFolder}/${realAlbumFolder}`;
  if (trackFilesCache.has(key)) {
    return trackFilesCache.get(key);
  }
  try {
    const tracks = fs.readdirSync(path.join(MP3_ROOT, realArtistFolder, realAlbumFolder));
    const map = buildNormalizedMap(tracks);
    trackFilesCache.set(key, map);
    return map;
  } catch {
    const empty = new Map();
    trackFilesCache.set(key, empty);
    return empty;
  }
};

// ── Resolve a cover path using the cached normalized map ──
const resolveCover = (coverPath) => {
  if (!coverPath) return null;
  const filename = coverPath.replace(/^\/?bin\/covers\//, '');
  const real = coversMap.get(normalize(filename));
  return real || null;
};

// ── Resolve an audio path using cached normalized maps, lazily built ──
const resolveAudio = (artist, album, filename) => {
  if (!artist || !album || !filename) return null;
  const bareFilename = filename.replace(/^bin\/mp3\//, '');

  const realArtistFolder = artistFoldersMap.get(normalize(artist));
  if (!realArtistFolder) return null;

  const albumMap = getAlbumMap(realArtistFolder);
  const realAlbumFolder = albumMap.get(normalize(album));
  if (!realAlbumFolder) return null;

  const trackMap = getTrackMap(realArtistFolder, realAlbumFolder);
  const realTrackFile = trackMap.get(normalize(bareFilename));
  if (!realTrackFile) return null;

  return `${realArtistFolder}/${realAlbumFolder}/${realTrackFile}`;
};

// ── Resolve a track row's cover URL — musician-uploaded rows carry their own
// already-public uploaded_cover_url and skip the fuzzy filesystem match entirely,
// since they were never part of the pre-scanned covers/ directory. ──
const getCoverUrl = (row) => {
  if (row?.is_user_upload) return row.uploaded_cover_url || null;
  const realCover = resolveCover(row?.cover);
  return realCover ? `http://localhost:5000/covers/${encodeURIComponent(realCover)}` : null;
};

// ── Same idea for audio — uploaded rows use their own stored uploaded_audio_url
// instead of being fuzzy-matched against the mp3/ directory cache, which only
// knows about Andrew's originally-imported catalog. ──
const getAudioUrl = (row) => {
  if (row?.is_user_upload) return row.uploaded_audio_url || null;
  const realAudioPath = resolveAudio(row?.artist, row?.album, row?.filename);
  return realAudioPath
    ? `http://localhost:5000/audio/${realAudioPath.split('/').map(encodeURIComponent).join('/')}`
    : `http://localhost:5000/audio/dummy.mp3`;
};

// ── Build full coverUrl and audioUrl — branches on is_user_upload via getCoverUrl/getAudioUrl ──
const buildTrackUrls = (track) => ({
  ...track,
  coverUrl: getCoverUrl(track),
  audioUrl: getAudioUrl(track),
});

module.exports = { getCoverUrl, getAudioUrl, buildTrackUrls, resolveCover, resolveAudio };
