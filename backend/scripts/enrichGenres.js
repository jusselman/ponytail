// enrichGenres.js
// Reads raw_db.csv, looks up each unique artist on MusicBrainz,
// appends a Genre column, and writes enriched_db.csv.
//
// Usage: node scripts/enrichGenres.js
// Rate limit: 1 request/sec to respect MusicBrainz guidelines.

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { createObjectCsvWriter } = require("csv-writer");
const fetch = require("node-fetch");

const INPUT_PATH = path.join(__dirname, "../assets/dev_seed/raw_db_utf8.csv");
const OUTPUT_PATH = path.join(__dirname, "../assets/dev_seed/enriched_db.csv");
const DELAY_MS = 1100; // slightly over 1s to stay within MusicBrainz rate limit
const USER_AGENT = "Ponytail/1.0 (ponytailapp@example.com)";

// Load existing genre map using fs.readFile to avoid require cache
let existingGenreMap = {};
const genreMapPath = path.join(__dirname, "./genreMap.js");
if (fs.existsSync(genreMapPath)) {
  const raw = fs.readFileSync(genreMapPath, "utf8");
  const match = raw.match(/const genreMap = ({[\s\S]*?});/);
  if (match) {
    existingGenreMap = JSON.parse(match[1]);
    console.log(`Loaded ${Object.keys(existingGenreMap).length} existing mappings.`);
  }
}

// ─── Delay helper ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Fetch genre for a single artist from MusicBrainz ────────────────────────
async function fetchGenre(artistName) {
  try {
    const url = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(artistName)}&limit=1&fmt=json`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`  ⚠ MusicBrainz returned ${res.status} for "${artistName}"`);
      return "Unknown";
    }

    const data = await res.json();
    const artists = data.artists || [];

    if (artists.length === 0) {
      console.log(`  · No results for "${artistName}"`);
      return "Unknown";
    }

    const topArtist = artists[0];
    const tags = topArtist.tags || [];

    if (tags.length === 0) {
      console.log(`  · No tags for "${artistName}" (matched: "${topArtist.name}")`);
      return "Unknown";
    }

    // Sort by vote count descending, take the top tag
    tags.sort((a, b) => (b.count || 0) - (a.count || 0));
    const genre = tags[0].name
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    console.log(`  ✓ "${artistName}" → ${genre} (matched: "${topArtist.name}")`);
    return genre;

  } catch (err) {
    console.warn(`  ✗ Error fetching "${artistName}": ${err.message}`);
    return "Unknown";
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Reading CSV...");
  const rows = [];

  // Step 1: Read all rows
  await new Promise((resolve, reject) => {
    fs.createReadStream(INPUT_PATH)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Read ${rows.length} rows.`);

  // Step 2: Extract unique artists
  const uniqueArtists = [...new Set(rows.map((r) => r.Artist?.trim()).filter(Boolean))];
  console.log(`\nFound ${uniqueArtists.length} unique artists. Looking up genres...\n`);

// Step 3: Build genre map via MusicBrainz
const genreMap = { ...existingGenreMap }; // start with existing mappings
const toFetch = uniqueArtists.filter(a => !existingGenreMap[a] || existingGenreMap[a] === "Unknown");
console.log(`\n${uniqueArtists.length} unique artists total, ${toFetch.length} need MusicBrainz lookup.\n`);

for (let i = 0; i < toFetch.length; i++) {
  const artist = toFetch[i];
  console.log(`[${i + 1}/${toFetch.length}] Looking up: ${artist}`);
  genreMap[artist] = await fetchGenre(artist);
  if (i < toFetch.length - 1) await sleep(DELAY_MS);
}

  // Step 4: Enrich rows
  const enrichedRows = rows.map((row) => ({
    Track: row.Track,
    Title: row.Title,
    Artist: row.Artist,
    Album: row.Album,
    Genre: genreMap[row.Artist?.trim()] || "Unknown",
    Year: row.Year,
    Length: row.Length,
    "Last Modified": row["Last Modified"],
    Filename: row.Filename,
    Cover: row.Cover,
  }));

  // Step 5: Write enriched CSV
  const csvWriter = createObjectCsvWriter({
    path: OUTPUT_PATH,
    header: [
      { id: "Track", title: "Track" },
      { id: "Title", title: "Title" },
      { id: "Artist", title: "Artist" },
      { id: "Album", title: "Album" },
      { id: "Genre", title: "Genre" },
      { id: "Year", title: "Year" },
      { id: "Length", title: "Length" },
      { id: "Last Modified", title: "Last Modified" },
      { id: "Filename", title: "Filename" },
      { id: "Cover", title: "Cover" },
    ],
  });

  await csvWriter.writeRecords(enrichedRows);

  console.log("\n─────────────────────────────────────");
  console.log("Genre enrichment complete.");
  console.log(`Output written to: ${OUTPUT_PATH}`);
  console.log(`Total rows: ${enrichedRows.length}`);
  console.log(`Artists found: ${Object.values(genreMap).filter(g => g !== "Unknown").length}/${uniqueArtists.length}`);

  // Step 6: Save the generated genre map for reference / manual correction
  const mapOutputPath = path.join(__dirname, "./genreMap.js");
  const mapContent = `// Auto-generated by enrichGenres.js — feel free to manually correct any entries\nconst genreMap = ${JSON.stringify(genreMap, null, 2)};\nmodule.exports = genreMap;\n`;
  fs.writeFileSync(mapOutputPath, mapContent);
  console.log(`Genre map saved to: ${mapOutputPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});