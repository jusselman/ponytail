// fixArtistNames.js
// One-off repair for catalog artists whose names don't match their real
// folders in assets/dev_seed/mp3, which made their tracks unplayable (audio
// is found by artist folder → album folder → file) and unplaceable on the map:
//
//   "PJ Morton m4a", "Rachelle Ferrell m4a", "Biscuits & Gravy m4a"
//                                            → the same names without " m4a"
//   "Bj?rk & Tr?? Gu?mundar Ing?lfssonar…"   → "Björk"       (album Gling-Gló; the
//       name, album, titles and filenames had lost their accented letters —
//       the correct ones below are copied from the real files on disk)
//
// enriched_db.csv carries the same fixes, so re-seeding stays consistent.
// Playlists and play history that point at the old names are updated too.
// Safe to re-run: rows already fixed are simply not found again.
//
// Usage:
//   node scripts/fixArtistNames.js                      # rename/repair, report duplicates
//   node scripts/fixArtistNames.js --delete-duplicates  # also remove the duplicate rows

const { pool } = require('../src/config/db');

// The catalog and the files on disk store accented letters in decomposed (NFD)
// form — "o" + a combining mark — and the audio lookup depends on that, so
// everything written here is converted to match.
const nfd = (s) => s.normalize('NFD');
const BJORK = nfd('Björk');
const BJORK_OLD_ARTIST = 'Bj_rk & Tr__ Gu_mundar Ing_lfssonar Gu_mundsd_ttir'; // _ = any one character
const BJORK_COVER = '/bin/covers/Björk & Tríó Guðmundar Ingólfssonar Guðmundsdóttir - Gling-Gló.jpg';
const GLING_GLO = [
  'Gling Gló', 'Luktar-Gvendur', 'Kata Rokkar', 'Pabbi Minn', 'Brestir Og Brak', 'Ástartöfrar',
  'Bella Símamær', 'Litli Tónlistarmadurinn', 'ßad Sést Ekki Sætari Mey', 'Bílavísur', 'Tondeleyo',
  'Ég Veit el Hvad Skal Segja', 'Í Dansi Med þÉr', 'Börnin Vid Tjörnina', 'Ruby Baby', "Can't Help Lovin' Dat Man",
];

// ── Tables that identify a track by (title, artist) text rather than an id ──
async function tablesWithArtist() {
  const r = await pool.query(
    `SELECT table_name FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'artist'
       AND table_name IN ('playlist_tracks', 'user_play_history', 'user_search_selections')`
  );
  return r.rows.map(x => x.table_name);
}

async function renameElsewhere(tables, oldArtistLike, newArtist) {
  for (const t of tables) {
    try {
      const r = await pool.query(`UPDATE ${t} SET artist = $2 WHERE artist LIKE $1`, [oldArtistLike, newArtist]);
      if (r.rowCount) console.log(`  ${t}: ${r.rowCount} rows`);
    } catch (err) {
      console.log(`  ${t}: skipped (${err.code === '23505' ? 'would duplicate an existing entry' : err.message})`);
    }
  }
}

async function fix() {
  const tables = await tablesWithArtist();

  // ── "<name> m4a" → "<name>" (PJ Morton, Rachelle Ferrell, Biscuits & Gravy) ──
  const m4a = await pool.query(`SELECT id, title, artist FROM seed_tracks WHERE artist LIKE '% m4a'`);
  let m4aFixed = 0;
  for (const row of m4a.rows) {
    const clean = row.artist.replace(/ m4a$/, '');
    try {
      await pool.query(
        `UPDATE seed_tracks SET artist = $2, cover = REPLACE(cover, $3, $2) WHERE id = $1`,
        [row.id, clean, row.artist]
      );
      m4aFixed++;
    } catch (err) {
      if (err.code !== '23505') throw err;
      // the clean name already has a track with this exact title on another album
      console.log(`  Left as is: "${row.title}" (${clean} already has a track with that title)`);
    }
  }
  console.log(`"m4a" names: ${m4aFixed} of ${m4a.rows.length} tracks renamed`);
  for (const old of [...new Set(m4a.rows.map(r => r.artist))]) await renameElsewhere(tables, old, old.replace(/ m4a$/, ''));

  // ── Björk, Gling-Gló ──
  const bj = await pool.query(`SELECT id, filename FROM seed_tracks WHERE artist LIKE $1`, [BJORK_OLD_ARTIST]);
  let bjFixed = 0;
  for (const row of bj.rows) {
    const m = /(\d{2}) /.exec(row.filename || '');
    const title = m && GLING_GLO[parseInt(m[1], 10) - 1];
    if (!title) { console.log(`  Left as is: ${row.filename} (couldn't read its track number)`); continue; }
    await pool.query(
      `UPDATE seed_tracks SET artist = $5, album = $6, title = $2, filename = $3, cover = $4 WHERE id = $1`,
      [row.id, nfd(title), nfd(`bin/mp3/${m[1]} ${title}.mp3`), nfd(BJORK_COVER), BJORK, nfd('Gling-Gló')]
    );
    bjFixed++;
  }
  console.log(`Björk (Gling-Gló): ${bjFixed} of ${bj.rows.length} tracks repaired`);
  await renameElsewhere(tables, BJORK_OLD_ARTIST, BJORK);

  // ── Leftover duplicates. A database seeded more than once can hold the same
  // track twice: once under the good name and once under the bad one. Those
  // can't be renamed (the good row already exists), are unplayable, and show
  // up in Discovery as a second copy of the album. They are only removed when
  // asked for, and only when the good copy is confirmed to exist. ──
  const m4aDupes = `artist LIKE '% m4a' AND EXISTS (
      SELECT 1 FROM seed_tracks t
      WHERE t.title = seed_tracks.title AND t.artist = regexp_replace(seed_tracks.artist, ' m4a$', ''))`;
  const bjorkDupes = `artist LIKE $1 AND filename = 'bin/mp3/dummy.mp3' AND EXISTS (
      SELECT 1 FROM seed_tracks t WHERE t.artist = $2 AND t.album = $3)`;
  const bjorkParams = [BJORK_OLD_ARTIST, BJORK, nfd('Gling-Gló')];

  if (process.argv.includes('--delete-duplicates')) {
    const a = await pool.query(`DELETE FROM seed_tracks WHERE ${m4aDupes}`);
    const b = await pool.query(`DELETE FROM seed_tracks WHERE ${bjorkDupes}`, bjorkParams);
    console.log(`Removed ${a.rowCount} duplicate "m4a" rows and ${b.rowCount} duplicate Gling-Gló rows.`);
  } else {
    const a = await pool.query(`SELECT COUNT(*)::int AS n FROM seed_tracks WHERE ${m4aDupes}`);
    const b = await pool.query(`SELECT COUNT(*)::int AS n FROM seed_tracks WHERE ${bjorkDupes}`, bjorkParams);
    if (a.rows[0].n + b.rows[0].n > 0) {
      console.log(`${a.rows[0].n} "m4a" rows and ${b.rows[0].n} Gling-Gló rows are duplicates of tracks that already exist under the correct name.`);
      console.log('To remove them: node scripts/fixArtistNames.js --delete-duplicates');
    }
  }

  console.log('Done. Restart the backend, then run enrichArtistLocations.js so these tracks get a location.');
}

fix()
  .catch(err => { console.error('fixArtistNames failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());
