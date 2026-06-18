// seedTracks.js
// Reads enriched_db.csv and upserts all rows into the seed_tracks table.
// Updated to support the expanded tag schema (Tag 1-5, Song Tag, engagement metrics).
//
// Usage: node scripts/seedTracks.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { pool } = require("../src/config/db");

const INPUT_PATH = path.join(__dirname, "../assets/dev_seed/enriched_db.csv");
const BATCH_SIZE = 100; // insert in batches to avoid overwhelming the db

// ── Helper: parse a string to int, return null if invalid/empty ──
const toInt = (val) => {
  const n = parseInt(val);
  return Number.isNaN(n) ? null : n;
};

// ── Helper: parse a string to float, return null if invalid/empty ──
const toFloat = (val) => {
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
};

async function seedTracks() {
  console.log("Reading enriched_db.csv...");

  const rows = [];

  // ── Step 1: Read all rows from CSV ──
  await new Promise((resolve, reject) => {
    fs.createReadStream(INPUT_PATH)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Read ${rows.length} rows from CSV.`);

  // ── Step 2: Clean and prepare rows ──
  const prepared = rows.map((row) => ({
    title: row.Title?.trim() || "Untitled",
    artist: row.Artist?.trim() || "Unknown Artist",
    album: row.Album?.trim() || null,
    genre: row["Tag 1 (Genre)"]?.trim() || null,
    subgenre: row["Tag 2 (Subgenre)"]?.trim() || null,
    similar_artist: row["Tag 3 (Similar Artist)"]?.trim() || null,
    mood: row["Tag 4 (Mood)"]?.trim() || null,
    tag5: row["Tag 5 (extra of any of the other tags)"]?.trim() || null,
    song_tag: row["Song Tag"]?.trim() || null,
    track_number: row.Track?.trim() || null,
    year: row.Year?.trim() || null,
    length_seconds: toInt(row.Length),
    last_modified: row["Last Modified"]?.trim() || null,
    filename: row.Filename?.trim() || null,
    cover: row.Cover?.trim() || null,
    popularity: toInt(row.Popularity),
    location: row.Location?.trim() || null,
    thumb_up: toInt(row.thumbUp) || 0,
    thumb_down: toInt(row.thumbDown) || 0,
    skips: toInt(row.skips) || 0,
    plays: toInt(row.plays) || 0,
    avg_playtime: toFloat(row.avgPlaytime),
    usertag1: row.usertag1?.trim() || null,
  })).filter((row) => row.title && row.artist); // skip rows missing required fields

  console.log(`Prepared ${prepared.length} valid rows for insert.`);

  // ── Step 2b: Deduplicate by (title, artist) — keep the last occurrence ──
  const dedupedMap = new Map();
  for (const row of prepared) {
    const key = `${row.title.toLowerCase()}|||${row.artist.toLowerCase()}`;
    dedupedMap.set(key, row); // later rows overwrite earlier ones with same key
  }
  const deduped = Array.from(dedupedMap.values());
  const duplicateCount = prepared.length - deduped.length;
  if (duplicateCount > 0) {
    console.log(`Removed ${duplicateCount} duplicate (title, artist) rows, keeping last occurrence of each.`);
  }

  // ── Step 3: Upsert in batches ──
  let inserted = 0;
  let skipped = 0;
  const batches = [];

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    batches.push(deduped.slice(i, i + BATCH_SIZE));
  }

  console.log(`\nInserting in ${batches.length} batches of up to ${BATCH_SIZE} rows...\n`);

  const COLUMNS = [
    "title", "artist", "album", "genre", "subgenre", "similar_artist",
    "mood", "tag5", "song_tag", "track_number", "year", "length_seconds",
    "last_modified", "filename", "cover", "popularity", "location",
    "thumb_up", "thumb_down", "skips", "plays", "avg_playtime", "usertag1",
  ];

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];

    // Build parameterized query for the batch
    const values = [];
    const placeholders = batch.map((row, i) => {
      const base = i * COLUMNS.length;
      COLUMNS.forEach((col) => values.push(row[col]));
      const placeholderGroup = COLUMNS.map((_, j) => `$${base + j + 1}`).join(", ");
      return `(${placeholderGroup})`;
    });

    const query = `
      INSERT INTO seed_tracks
        (${COLUMNS.join(", ")})
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (title, artist) DO UPDATE SET
        album = EXCLUDED.album,
        genre = EXCLUDED.genre,
        subgenre = EXCLUDED.subgenre,
        similar_artist = EXCLUDED.similar_artist,
        mood = EXCLUDED.mood,
        tag5 = EXCLUDED.tag5,
        song_tag = EXCLUDED.song_tag,
        track_number = EXCLUDED.track_number,
        year = EXCLUDED.year,
        length_seconds = EXCLUDED.length_seconds,
        last_modified = EXCLUDED.last_modified,
        filename = EXCLUDED.filename,
        cover = EXCLUDED.cover,
        popularity = EXCLUDED.popularity,
        location = EXCLUDED.location,
        thumb_up = EXCLUDED.thumb_up,
        thumb_down = EXCLUDED.thumb_down,
        skips = EXCLUDED.skips,
        plays = EXCLUDED.plays,
        avg_playtime = EXCLUDED.avg_playtime,
        usertag1 = EXCLUDED.usertag1
    `;

    try {
      const result = await pool.query(query, values);
      inserted += result.rowCount;
      process.stdout.write(`\r  Batch ${b + 1}/${batches.length} — upserted: ${inserted}`);
    } catch (err) {
      console.error(`\n  Error in batch ${b + 1}:`, err.message);
      skipped += batch.length;
    }
  }

  console.log("\n\n─────────────────────────────────────");
  console.log("Seed complete.");
  console.log(`Total rows processed : ${prepared.length}`);
  console.log(`Duplicates removed   : ${duplicateCount}`);
  console.log(`Unique rows attempted: ${deduped.length}`);
  console.log(`Upserted             : ${inserted}`);
  console.log(`Failed batches rows  : ${skipped}`);

  // ── Step 4: Verify ──
  const countResult = await pool.query("SELECT COUNT(*) FROM seed_tracks");
  console.log(`Rows now in seed_tracks: ${countResult.rows[0].count}`);

  await pool.end();
}

seedTracks().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});