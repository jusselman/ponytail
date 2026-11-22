// sweepOrphanUploads.js
// Finds files in assets/uploads that no database row points to any more and,
// with --delete, removes them. These are leftovers from before the upload
// cleanup fixes: replaced avatars and playlist covers, deleted playlists,
// deleted accounts' tracks and photos, and uploads whose request failed.
//
// A file counts as "in use" if its name appears in any column that stores an
// upload URL. Playlist entries and message attachments are not counted: they
// hold copies of a track's URLs, so a file only they mention belongs to a
// track that no longer exists.
//
// Files modified in the last hour are skipped so an upload that's mid-request
// is never touched.
//
// Usage: node scripts/sweepOrphanUploads.js            (report only)
//        node scripts/sweepOrphanUploads.js --delete   (remove the orphans)

const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/db");
const { UPLOAD_DIR } = require("../src/utils/uploads");

const DELETE = process.argv.includes("--delete");
const MIN_AGE_MS = 60 * 60 * 1000;

// Every column that can hold an /uploads/ URL. Checked against the live
// schema first, since the tracked schema files have drifted from the DB.
const URL_COLUMNS = [
  ["users", "profile_picture"],
  ["users", "avatar_url"],
  ["seed_tracks", "uploaded_audio_url"],
  ["seed_tracks", "uploaded_cover_url"],
  ["playlists", "cover_art_url"],
  ["bulletin_posts", "image_url"],
  ["bulletin_replies", "image_url"],
];

const fileNameOf = (url) => {
  const name = String(url || "").split("/uploads/")[1];
  return name ? path.basename(decodeURIComponent(name.split("?")[0])) : null;
};

const main = async () => {
  const inUse = new Set();

  for (const [table, column] of URL_COLUMNS) {
    const exists = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (exists.rowCount === 0) continue;
    const rows = await pool.query(
      `SELECT "${column}" AS url FROM "${table}" WHERE "${column}" LIKE '%/uploads/%'`
    );
    rows.rows.forEach((r) => {
      const name = fileNameOf(r.url);
      if (name) inUse.add(name);
    });
  }

  const now = Date.now();
  const orphans = [];
  for (const name of fs.readdirSync(UPLOAD_DIR)) {
    const filePath = path.join(UPLOAD_DIR, name);
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || name.startsWith(".")) continue;
    if (inUse.has(name)) continue;
    if (now - stat.mtimeMs < MIN_AGE_MS) continue;
    orphans.push({ name, filePath, bytes: stat.size });
  }

  const totalMb = (orphans.reduce((sum, o) => sum + o.bytes, 0) / 1024 / 1024).toFixed(1);
  console.log(`${inUse.size} files in use, ${orphans.length} orphaned (${totalMb} MB)`);
  orphans.forEach((o) => console.log(`  ${o.name}`));

  if (!DELETE) {
    if (orphans.length) console.log("\nReport only. Run again with --delete to remove them.");
  } else {
    orphans.forEach((o) => fs.unlinkSync(o.filePath));
    console.log(`\nDeleted ${orphans.length} files.`);
  }
};

main()
  .catch((err) => {
    console.error("Sweep failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
