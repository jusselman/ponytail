// listMoods.js
// Scans enriched_db.csv and reports every unique mood that appears,
// along with how many tracks fall under each one. Writes the full
// list to a txt file for easy reference.
//
// Usage: node scripts/listMoods.js

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const CSV_PATH = path.join(__dirname, "../assets/dev_seed/enriched_db.csv");
const OUTPUT_PATH = path.join(__dirname, "../assets/dev_seed/moods_list.txt");

async function listMoods() {
  console.log("Reading enriched_db.csv...\n");

  const moodCounts = new Map();

  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        const mood = row["Tag 4 (Mood)"]?.trim();
        if (mood) {
          moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1);
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // ── Sort moods alphabetically ──
  const sortedMoods = Array.from(moodCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  console.log("─────────────────────────────────────");
  console.log(`Total unique moods: ${sortedMoods.length}`);
  console.log("─────────────────────────────────────\n");

  sortedMoods.forEach(([mood, count]) => {
    console.log(`${mood} (${count} tracks)`);
  });

  // ── Write to file ──
  const outputLines = [
    `Mood List Report`,
    `Generated: ${new Date().toISOString()}`,
    `Total unique moods: ${sortedMoods.length}`,
    ``,
    `── Moods (alphabetical, with track counts) ──`,
    ...sortedMoods.map(([mood, count]) => `${mood} (${count} tracks)`),
  ];
  fs.writeFileSync(OUTPUT_PATH, outputLines.join("\n"));
  console.log(`\nFull list written to: ${OUTPUT_PATH}`);
}

listMoods().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
