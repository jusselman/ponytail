// fixCorruptedEncoding.js
//
// Repairs U+FFFD ("replacement character", �) corruption in enriched_db.csv's
// Artist/Album/Title/Filename/Cover columns.
//
// Root cause: at some point before this CSV reached us, a lossy encoding
// conversion replaced certain accented letters and curly quotes with the
// Unicode replacement character (U+FFFD). That byte is a dead end — the
// original character is gone and cannot be recovered from the CSV alone.
//
// Why this breaks playback: authRoutes.js's resolveAudio()/resolveCover()
// find the real file on disk by normalizing both the CSV value and the real
// folder/file name (lowercase, strip everything that isn't a-z0-9) and doing
// an exact lookup. Real accented letters are stored on disk in NFD form
// (e.g. "o" + a combining diaeresis for "ö"), so normalizing still leaves
// the base letter "o" behind and the match succeeds. U+FFFD, however,
// replaces the *entire* letter, leaving nothing behind — so a corrupted
// name normalizes to a shorter string than its real folder/file, the exact
// lookup misses, and the track's audioUrl silently falls back to
// dummy.mp3 (which is what the user sees as "autoplay blocked").
//
// Fix strategy: the real filenames on disk were never touched by that lossy
// conversion — they still carry the fully correct name. So instead of
// guessing at the missing character, we fuzzy-match each corrupted CSV
// string against real filesystem names (assets/dev_seed/mp3/**,
// assets/dev_seed/covers/*) and copy the correct name over verbatim once a
// confident, unique match is found. Ambiguous/unmatched rows are left
// untouched and logged for manual review rather than guessed at.
//
// Usage:
//   node scripts/fixCorruptedEncoding.js            (dry run, report only)
//   node scripts/fixCorruptedEncoding.js --write     (back up + write corrected CSV)

const fs = require("fs");
const path = require("path");

const MP3_ROOT = path.join(__dirname, "../assets/dev_seed/mp3");
const COVERS_ROOT = path.join(__dirname, "../assets/dev_seed/covers");
const CSV_PATH = path.join(__dirname, "../assets/dev_seed/enriched_db.csv");
const BACKUP_PATH = path.join(__dirname, "../assets/dev_seed/enriched_db.pre-encoding-fix.csv.bak");
const REPORT_PATH = path.join(__dirname, "../assets/dev_seed/encoding_fix_report.txt");

const WRITE = process.argv.includes("--write");
const REPLACEMENT = "�";

// ── Same normalize() used at runtime (authRoutes.js / removeUnplayableTracks.js) ──
const normalize = (s) => s
  .toLowerCase()
  .replace(/\b(and|feat|ft|with|vs)\b/g, "")
  .replace(/[^a-z0-9]/g, "");

// ── Looser fold for fuzzy comparison: strip diacritics + drop U+FFFD, keep
// letters/digits/spaces so edit-distance alignment stays meaningful ──
const foldForCompare = (s) => s
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/�/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// ── Levenshtein distance + similarity ratio ──
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a, b) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

// ── Best fuzzy match for `corrupted` among `candidates` (real display names).
// Requires both an absolute score and a margin over the runner-up before
// we'll trust it — anything softer gets left alone and logged instead. ──
const CONFIDENT_SCORE = 0.7;
const CONFIDENT_MARGIN = 0.12;

function bestMatch(corrupted, candidates) {
  const target = foldForCompare(corrupted);
  let best = null, bestScore = -1, second = -1;
  for (const c of candidates) {
    const score = similarity(target, foldForCompare(c));
    if (score > bestScore) {
      second = bestScore;
      bestScore = score;
      best = c;
    } else if (score > second) {
      second = score;
    }
  }
  if (!best) return null;
  return { match: best, score: bestScore, margin: bestScore - Math.max(second, 0) };
}

// A near-exact score (e.g. 1.0 against a track from a boxed set full of
// similarly-titled siblings — "Suite No. 1" vs "Suite No. 3 ... I. Praeludium")
// can have a runner-up close behind it and still be completely correct, so a
// very high absolute score is trusted outright; anything softer still needs
// a real margin over the runner-up before we trust it.
function isConfident(result) {
  if (!result) return false;
  if (result.score >= 0.95) return true;
  return result.score >= CONFIDENT_SCORE && result.margin >= CONFIDENT_MARGIN;
}

// ── Strip a leading track-number prefix + extension: "185-01 Title.mp3" -> "Title" ──
const stripTrackAffixes = (filename) => filename
  .replace(/\.mp3$/i, "")
  .replace(/^\d+(-\d+)?\s+/, "");

// ── Build filesystem indices (ground truth) ──
console.log("Scanning filesystem for ground-truth names...");
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

const artistFolders = fs.readdirSync(MP3_ROOT).filter(f => !f.startsWith(".") && isDir(path.join(MP3_ROOT, f)));
const albumFoldersByArtist = new Map();
const trackFilesByAlbum = new Map();

for (const artist of artistFolders) {
  const artistPath = path.join(MP3_ROOT, artist);
  let albums = [];
  try { albums = fs.readdirSync(artistPath).filter(f => !f.startsWith(".") && isDir(path.join(artistPath, f))); } catch {}
  albumFoldersByArtist.set(artist, albums);
  for (const album of albums) {
    let tracks = [];
    try { tracks = fs.readdirSync(path.join(artistPath, album)).filter(f => f.toLowerCase().endsWith(".mp3")); } catch {}
    trackFilesByAlbum.set(`${artist}/${album}`, tracks);
  }
}

let coverFiles = [];
try {
  coverFiles = fs.readdirSync(COVERS_ROOT).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
} catch (err) {
  console.error("Failed to read covers directory:", err.message);
}

const totalAlbums = [...albumFoldersByArtist.values()].reduce((a, b) => a + b.length, 0);
console.log(`Indexed ${artistFolders.length} artist folders, ${totalAlbums} albums, ${coverFiles.length} cover files.\n`);

// ── Read CSV as raw lines. Verified: every data row has exactly 23
// semicolon-delimited fields and no field contains a literal ';', so a plain
// split is safe here — no CSV quoting is in use in this file. ──
const raw = fs.readFileSync(CSV_PATH, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(/\r\n|\n/);
const header = lines[0].split(";");
const COL = Object.fromEntries(header.map((h, i) => [h, i]));

let fixedRows = 0, unresolvedRows = 0, uncorruptedRows = 0;
const unresolvedLog = [];
const fixedLog = [];

const artistResolutionCache = new Map();
const albumResolutionCache = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = line.split(";");
  if (cols.length < 9) continue;

  const origArtist = cols[COL["Artist"]] || "";
  const origAlbum = cols[COL["Album"]] || "";
  const origTitle = cols[COL["Title"]] || "";
  const origFilename = cols[COL["Filename"]] || "";
  const origCover = cols[COL["Cover"]] || "";

  const hasCorruption = [origArtist, origAlbum, origTitle].some(v => v.includes(REPLACEMENT));
  if (!hasCorruption) { uncorruptedRows++; continue; }

  // ── Resolve artist ──
  let realArtist = null;
  if (origArtist.includes(REPLACEMENT)) {
    if (artistResolutionCache.has(origArtist)) {
      realArtist = artistResolutionCache.get(origArtist);
    } else {
      const res = bestMatch(origArtist, artistFolders);
      realArtist = isConfident(res) ? res.match : null;
      artistResolutionCache.set(origArtist, realArtist);
    }
  } else {
    const exact = artistFolders.find(f => normalize(f) === normalize(origArtist));
    realArtist = exact || origArtist;
  }

  if (!realArtist) {
    unresolvedRows++;
    unresolvedLog.push(`UNRESOLVED ARTIST | ${origTitle} | ${origArtist} | ${origAlbum}`);
    continue;
  }

  // ── Resolve album (within resolved artist) ──
  const albumCandidates = albumFoldersByArtist.get(realArtist) || [];
  let realAlbum = null;
  const albumCacheKey = `${realArtist}||${origAlbum}`;
  if (origAlbum.includes(REPLACEMENT)) {
    if (albumResolutionCache.has(albumCacheKey)) {
      realAlbum = albumResolutionCache.get(albumCacheKey);
    } else {
      const res = bestMatch(origAlbum, albumCandidates);
      realAlbum = isConfident(res) ? res.match : null;
      albumResolutionCache.set(albumCacheKey, realAlbum);
    }
  } else {
    const exact = albumCandidates.find(f => normalize(f) === normalize(origAlbum));
    realAlbum = exact || null;
  }

  if (!realAlbum) {
    unresolvedRows++;
    unresolvedLog.push(`UNRESOLVED ALBUM | ${origTitle} | ${realArtist} | ${origAlbum}`);
    continue;
  }

  // ── Resolve title (within resolved artist/album) ──
  const trackCandidates = trackFilesByAlbum.get(`${realArtist}/${realAlbum}`) || [];
  const bareOrigFilename = origFilename.replace(/^bin\/mp3\//, "");
  let realTrackFile = null;
  if (origTitle.includes(REPLACEMENT) || bareOrigFilename.includes(REPLACEMENT)) {
    const target = bareOrigFilename || origTitle;
    const res = bestMatch(target, trackCandidates);
    realTrackFile = isConfident(res) ? res.match : null;
  } else {
    realTrackFile = trackCandidates.find(f => normalize(f) === normalize(bareOrigFilename)) || null;
  }

  if (!realTrackFile) {
    unresolvedRows++;
    unresolvedLog.push(`UNRESOLVED TITLE | ${origTitle} | ${realArtist} | ${realAlbum}`);
    continue;
  }

  const realTitle = stripTrackAffixes(realTrackFile);
  const realFilename = `bin/mp3/${realTrackFile}`;

  // ── Resolve cover (best-effort — never blocks a "fixed" verdict) ──
  const coverTarget = `${realArtist} - ${realAlbum}`;
  const stripExt = (f) => f.replace(/\.[^.]+$/, "");
  let realCoverFile = coverFiles.find(f => normalize(stripExt(f)) === normalize(coverTarget));
  if (!realCoverFile) {
    const res = bestMatch(coverTarget, coverFiles.map(stripExt));
    if (isConfident(res)) {
      realCoverFile = coverFiles.find(f => stripExt(f) === res.match);
    }
  }
  const realCover = realCoverFile ? `/bin/covers/${realCoverFile}` : origCover;

  // ── Apply fixes ──
  const changed = [];
  if (cols[COL["Artist"]] !== realArtist) { cols[COL["Artist"]] = realArtist; changed.push("Artist"); }
  if (cols[COL["Album"]] !== realAlbum) { cols[COL["Album"]] = realAlbum; changed.push("Album"); }
  if (cols[COL["Title"]] !== realTitle) { cols[COL["Title"]] = realTitle; changed.push("Title"); }
  if (cols[COL["Filename"]] !== realFilename) { cols[COL["Filename"]] = realFilename; changed.push("Filename"); }
  if (cols[COL["Cover"]] !== realCover) { cols[COL["Cover"]] = realCover; changed.push("Cover"); }

  if (changed.length === 0) continue;

  lines[i] = cols.join(";");
  fixedRows++;
  fixedLog.push(`FIXED [${changed.join(", ")}] | ${origArtist} / ${origAlbum} / ${origTitle}  -->  ${realArtist} / ${realAlbum} / ${realTitle}`);
}

console.log("─────────────────────────────────────");
console.log(`Uncorrupted rows (untouched)  : ${uncorruptedRows}`);
console.log(`Corrupted rows fixed          : ${fixedRows}`);
console.log(`Corrupted rows unresolved     : ${unresolvedRows}`);
console.log("─────────────────────────────────────\n");

const reportLines = [
  `Encoding Fix Report`,
  `Generated: ${new Date().toISOString()}`,
  `Mode: ${WRITE ? "WRITE (CSV updated)" : "DRY RUN (CSV not modified)"}`,
  ``,
  `Fixed: ${fixedRows}`,
  `Unresolved: ${unresolvedRows}`,
  ``,
  `── Fixed rows ──`,
  ...fixedLog,
  ``,
  `── Unresolved rows (left as-is — needs manual review, or is already unplayable regardless of encoding) ──`,
  ...unresolvedLog,
];
fs.writeFileSync(REPORT_PATH, reportLines.join("\n"));
console.log(`Full report written to: ${REPORT_PATH}`);

if (WRITE) {
  fs.copyFileSync(CSV_PATH, BACKUP_PATH);
  fs.writeFileSync(CSV_PATH, lines.join(eol));
  console.log(`\nOriginal CSV backed up to: ${BACKUP_PATH}`);
  console.log(`Corrected CSV written to : ${CSV_PATH}`);
  console.log(`\nNext steps:`);
  console.log(`  1. node scripts/seedTracks.js`);
  console.log(`  2. node scripts/removeUnplayableTracks.js --dry-run   (confirm these rows now resolve)`);
} else {
  console.log(`\nDry run only — no files were changed. Re-run with --write to apply.`);
}
