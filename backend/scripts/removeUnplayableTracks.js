// removeUnplayableTracks.js
// Scans every row in seed_tracks, attempts to resolve its real audio file
// path using the same fuzzy matching logic as the backend (normalize +
// cached directory lookups). Any track whose audio cannot be resolved to a
// real file on disk is logged to a txt file for reference, then deleted
// from the database so users never encounter a track that appears to play
// but produces no sound.
//
// This is a temporary cleanup measure while waiting on corrected source
// data from Andrew. Deleted rows are fully logged (including all columns)
// so they can be re-inserted later once the data is fixed, without needing
// to re-run the full seed from scratch.
//
// Usage: node scripts/removeUnplayableTracks.js
//        node scripts/removeUnplayableTracks.js --dry-run   (report only, no deletes)

const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/db");

const MP3_ROOT = path.join(__dirname, "../assets/dev_seed/mp3");
const REPORT_PATH = path.join(__dirname, "../assets/dev_seed/removed_unplayable_tracks.txt");

const DRY_RUN = process.argv.includes("--dry-run");

// ── Same normalize logic as authRoutes.js ──
const normalize = (s) => s
  .toLowerCase()
  .replace(/\b(and|feat|ft|with|vs)\b/g, '')
  .replace(/[^a-z0-9]/g, '');

const buildNormalizedMap = (files) => {
  const map = new Map();
  for (const f of files) {
    map.set(normalize(f), f);
  }
  return map;
};

// ── Cache artist folders once ──
let artistFoldersMap = new Map();
try {
  const artistFolders = fs.readdirSync(MP3_ROOT);
  artistFoldersMap = buildNormalizedMap(artistFolders);
  console.log(`Cached ${artistFoldersMap.size} artist folders.\n`);
} catch (err) {
  console.error("Failed to read mp3 directory:", err.message);
  process.exit(1);
}

// ── Lazy cache for album and track folders ──
const albumFoldersCache = new Map();
const getAlbumMap = (realArtistFolder) => {
  if (albumFoldersCache.has(realArtistFolder)) return albumFoldersCache.get(realArtistFolder);
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

const trackFilesCache = new Map();
const getTrackMap = (realArtistFolder, realAlbumFolder) => {
  const key = `${realArtistFolder}/${realAlbumFolder}`;
  if (trackFilesCache.has(key)) return trackFilesCache.get(key);
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

// ── Resolve audio the same way the backend does ──
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

async function removeUnplayableTracks() {
  console.log(DRY_RUN ? "Running in DRY RUN mode — no rows will be deleted.\n" : "Running in LIVE mode — unresolvable rows WILL be deleted.\n");

  console.log("Fetching all tracks from seed_tracks...");
  const result = await pool.query(
    `SELECT id, title, artist, album, genre, filename, cover FROM seed_tracks`
  );
  console.log(`Checking ${result.rows.length} tracks...\n`);

  const unplayable = [];

  for (const track of result.rows) {
    // Tracks already explicitly pointing to dummy.mp3 are intentional placeholders, skip them
    if (track.filename && track.filename.includes('dummy.mp3')) continue;

    const resolved = resolveAudio(track.artist, track.album, track.filename);
    if (!resolved) {
      unplayable.push(track);
    }
  }

  console.log("─────────────────────────────────────");
  console.log(`Total tracks checked   : ${result.rows.length}`);
  console.log(`Unplayable tracks found: ${unplayable.length}`);
  console.log("─────────────────────────────────────\n");

  if (unplayable.length === 0) {
    console.log("No unplayable tracks found. Nothing to do.");
    await pool.end();
    return;
  }

  // ── Write full report for reference / future re-insertion ──
  const reportLines = [
    `Unplayable Tracks Report`,
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${DRY_RUN ? 'DRY RUN (not deleted)' : 'LIVE (deleted from database)'}`,
    ``,
    `Total checked: ${result.rows.length}`,
    `Unplayable: ${unplayable.length}`,
    ``,
    `── Removed Tracks (id | title | artist | album | filename | cover) ──`,
    ...unplayable.map(t =>
      `${t.id} | ${t.title} | ${t.artist} | ${t.album} | ${t.filename} | ${t.cover}`
    ),
  ];
  fs.writeFileSync(REPORT_PATH, reportLines.join("\n"));
  console.log(`Report written to: ${REPORT_PATH}\n`);

  if (DRY_RUN) {
    console.log("Dry run complete. No rows were deleted. Re-run without --dry-run to actually delete.");
    await pool.end();
    return;
  }

  // ── Delete unplayable rows in batches ──
  const ids = unplayable.map(t => t.id);
  const BATCH_SIZE = 100;
  let deleted = 0;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batchIds = ids.slice(i, i + BATCH_SIZE);
    const placeholders = batchIds.map((_, idx) => `$${idx + 1}`).join(", ");
    const deleteResult = await pool.query(
      `DELETE FROM seed_tracks WHERE id IN (${placeholders})`,
      batchIds
    );
    deleted += deleteResult.rowCount;
    process.stdout.write(`\rDeleted ${deleted}/${ids.length}...`);
  }

  console.log("\n\n─────────────────────────────────────");
  console.log("Cleanup complete.");
  console.log(`Rows deleted: ${deleted}`);

  const countResult = await pool.query("SELECT COUNT(*) FROM seed_tracks");
  console.log(`Rows remaining in seed_tracks: ${countResult.rows[0].count}`);

  await pool.end();
}

removeUnplayableTracks().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});