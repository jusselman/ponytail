// seedTracks.js
// Reads enriched_db.csv and upserts all rows into the seed_tracks table.
//
// Usage: node scripts/seedTracks.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { pool } = require("../src/config/db");

const INPUT_PATH = path.join(__dirname, "../assets/dev_seed/enriched_db.csv");
const BATCH_SIZE = 100; // insert in batches to avoid overwhelming the db

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
    genre: row.Genre?.trim() || null,
    track_number: row.Track?.trim() || null,
    year: row.Year?.trim() || null,
    length_seconds: parseInt(row.Length) || null,
    last_modified: row["Last Modified"]?.trim() || null,
    filename: row.Filename?.trim() || null,
    cover: row.Cover?.trim() || null,
  })).filter((row) => row.title && row.artist); // skip rows missing required fields

  console.log(`Prepared ${prepared.length} valid rows for insert.`);

  // ── Step 3: Upsert in batches ──
  let inserted = 0;
  let skipped = 0;
  const batches = [];

  for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
    batches.push(prepared.slice(i, i + BATCH_SIZE));
  }

  console.log(`\nInserting in ${batches.length} batches of up to ${BATCH_SIZE} rows...\n`);

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];

    // Build parameterized query for the batch
    const values = [];
    const placeholders = batch.map((row, i) => {
      const base = i * 10;
      values.push(
        row.title,
        row.artist,
        row.album,
        row.genre,
        row.track_number,
        row.year,
        row.length_seconds,
        row.last_modified,
        row.filename,
        row.cover
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`;
    });

    const query = `
      INSERT INTO seed_tracks
        (title, artist, album, genre, track_number, year, length_seconds, last_modified, filename, cover)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (title, artist) DO NOTHING
    `;

    try {
      const result = await pool.query(query, values);
      inserted += result.rowCount;
      skipped += batch.length - result.rowCount;
      process.stdout.write(`\r  Batch ${b + 1}/${batches.length} — inserted: ${inserted}, skipped: ${skipped}`);
    } catch (err) {
      console.error(`\n  Error in batch ${b + 1}:`, err.message);
    }
  }

  console.log("\n\n─────────────────────────────────────");
  console.log("Seed complete.");
  console.log(`Total rows processed : ${prepared.length}`);
  console.log(`Inserted             : ${inserted}`);
  console.log(`Skipped (duplicates) : ${skipped}`);

  // ── Step 4: Verify ──
  const countResult = await pool.query("SELECT COUNT(*) FROM seed_tracks");
  console.log(`Rows now in seed_tracks: ${countResult.rows[0].count}`);

  await pool.end();
}

seedTracks().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});