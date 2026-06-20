// findArtistMismatches.js
// Scans enriched_db.csv and compares each unique Artist value against the
// actual folder names in assets/dev_seed/mp3, using the same normalization
// logic as the backend's fuzzy matching. Reports every artist whose name
// doesn't resolve to a real folder, so the scope of the data quality issue
// can be quantified before flagging it to Andrew.
//
// Usage: node scripts/findArtistMismatches.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const CSV_PATH = path.join(__dirname, "../assets/dev_seed/enriched_db.csv");
const MP3_ROOT = path.join(__dirname, "../assets/dev_seed/mp3");

// ── Same normalize logic as authRoutes.js ──
const normalize = (s) => s
  .toLowerCase()
  .replace(/\b(and|feat|ft|with|vs)\b/g, '')
  .replace(/[^a-z0-9]/g, '');

async function findMismatches() {
  console.log("Reading enriched_db.csv...\n");

  // ── Step 1: Read all artist names from CSV ──
  const csvArtists = new Set();
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        if (row.Artist && row.Artist.trim()) {
          csvArtists.add(row.Artist.trim());
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Found ${csvArtists.size} unique artist names in CSV.\n`);

  // ── Step 2: Read all real folder names from disk ──
  const realFolders = fs.readdirSync(MP3_ROOT);
  console.log(`Found ${realFolders.length} artist folders on disk.\n`);

  // ── Step 3: Build normalized lookup of real folders ──
  const normalizedFolders = new Map();
  for (const folder of realFolders) {
    normalizedFolders.set(normalize(folder), folder);
  }

  // ── Step 4: Check each CSV artist against the normalized folder map ──
  const mismatches = [];
  const matches = [];

  for (const artist of csvArtists) {
    const normalizedArtist = normalize(artist);
    const realFolder = normalizedFolders.get(normalizedArtist);

    if (realFolder) {
      matches.push({ csvArtist: artist, realFolder });
    } else {
      mismatches.push(artist);
    }
  }

  // ── Step 5: Report results ──
  console.log("─────────────────────────────────────");
  console.log("RESULTS");
  console.log("─────────────────────────────────────");
  console.log(`Total unique CSV artists : ${csvArtists.size}`);
  console.log(`Matched to a real folder : ${matches.length}`);
  console.log(`MISMATCHED (no folder)   : ${mismatches.length}`);
  console.log(`Match rate               : ${((matches.length / csvArtists.size) * 100).toFixed(1)}%`);
  console.log("─────────────────────────────────────\n");

  if (mismatches.length > 0) {
    console.log("Mismatched artist names (no corresponding folder found):\n");
    mismatches
      .sort((a, b) => a.localeCompare(b))
      .forEach((artist, i) => {
        console.log(`${i + 1}. ${artist}`);
      });
  }

  // ── Step 6: Write full mismatch list to a file for sharing with Andrew ──
  const outputPath = path.join(__dirname, "../assets/dev_seed/artist_mismatches.txt");
  const outputContent = [
    `Artist/Folder Mismatch Report`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `Total unique CSV artists: ${csvArtists.size}`,
    `Matched to a real folder: ${matches.length}`,
    `Mismatched (no folder): ${mismatches.length}`,
    `Match rate: ${((matches.length / csvArtists.size) * 100).toFixed(1)}%`,
    ``,
    `── Mismatched Artists ──`,
    ...mismatches.sort((a, b) => a.localeCompare(b)),
  ].join("\n");

  fs.writeFileSync(outputPath, outputContent);
  console.log(`\nFull report written to: ${outputPath}`);
}

findMismatches().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});