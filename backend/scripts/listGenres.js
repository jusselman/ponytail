// listGenres.js
// Scans enriched_db.csv and reports every unique genre that appears,
// along with how many tracks fall under each one. Writes the full
// list to a txt file for easy reference.
//
// Usage: node scripts/listGenres.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const CSV_PATH = path.join(__dirname, "../assets/dev_seed/enriched_db.csv");
const OUTPUT_PATH = path.join(__dirname, "../assets/dev_seed/genres_list.txt");

async function listGenres() {
  console.log("Reading enriched_db.csv...\n");

  const genreCounts = new Map();

  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        const genre = row["Tag 1 (Genre)"]?.trim();
        if (genre) {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // ── Sort genres alphabetically ──
  const sortedGenres = Array.from(genreCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  console.log("─────────────────────────────────────");
  console.log(`Total unique genres: ${sortedGenres.length}`);
  console.log("─────────────────────────────────────\n");

  sortedGenres.forEach(([genre, count]) => {
    console.log(`${genre} (${count} tracks)`);
  });

  // ── Write to file ──
  const outputLines = [
    `Genre List Report`,
    `Generated: ${new Date().toISOString()}`,
    `Total unique genres: ${sortedGenres.length}`,
    ``,
    `── Genres (alphabetical, with track counts) ──`,
    ...sortedGenres.map(([genre, count]) => `${genre} (${count} tracks)`),
  ];
  fs.writeFileSync(OUTPUT_PATH, outputLines.join("\n"));
  console.log(`\nFull list written to: ${OUTPUT_PATH}`);
}

listGenres().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});