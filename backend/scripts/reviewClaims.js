// reviewClaims.js
// The only way an artist claim gets approved. Run by the Ponytail team, on a
// machine with database access — there is no API route for this on purpose, so
// a stolen login or a bug in the app can never verify anyone.
//
// Before approving, check the claim is real: open the links in the evidence and
// look for the claim's verification code (ponytail-xxxxxxxx) on a page only the
// real artist controls, e.g. their Bandcamp or Instagram bio or their website.
// For 'collision' claims (accounts made before verification existed) just
// confirm with the teammate who owns the account.
//
// Usage (from backend/):
//   node scripts/reviewClaims.js                         # list claims waiting for review
//   node scripts/reviewClaims.js show <id>               # one claim in full
//   node scripts/reviewClaims.js approve <id> "note"     # verify the account as that artist
//   node scripts/reviewClaims.js reject <id> "reason"    # the reason is shown to the artist
//
// Approving, in one transaction:
//   - the account takes the catalog artist's name and gets the verified badge
//     (its name is then locked)
//   - tips that were held for that artist are released to the account
//   - any other waiting claims for the same artist are rejected
// <id> can be the first 8 characters of the claim id.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/db');
const os = require('os');

const reviewer = process.env.REVIEWER || os.userInfo().username;

const findClaim = async (client, idPrefix) => {
  const { rows } = await client.query(
    `SELECT c.*, u.username, u.display_name, u.email, u.is_artist, u.artist_verified
     FROM claim_requests c JOIN users u ON u.id = c.user_id
     WHERE c.id::text LIKE $1 || '%'`,
    [String(idPrefix || '').toLowerCase()]
  );
  if (rows.length === 0) throw new Error(`No claim starts with "${idPrefix}".`);
  if (rows.length > 1) throw new Error(`"${idPrefix}" matches ${rows.length} claims; use more characters.`);
  return rows[0];
};

const heldTips = async (client, key) => {
  const { rows: [r] } = await client.query(
    `SELECT COUNT(*)::int AS n, COALESCE(SUM(amount_cents), 0)::int AS cents
     FROM tips WHERE recipient_id IS NULL AND recipient_key = $1 AND payment_status = 'succeeded'`,
    [key]
  );
  return r;
};

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

const list = async () => {
  const { rows } = await pool.query(
    `SELECT c.id, c.artist_name, c.source, c.created_at, u.username, COALESCE(u.display_name, u.username) AS name
     FROM claim_requests c JOIN users u ON u.id = c.user_id
     WHERE c.status = 'pending' ORDER BY c.created_at`
  );
  if (rows.length === 0) return console.log('No claims waiting for review.');
  console.log(`${rows.length} claim(s) waiting:\n`);
  for (const r of rows) {
    console.log(`  ${r.id.slice(0, 8)}  ${r.source === 'collision' ? '[existing account] ' : ''}@${r.username} ("${r.name}") claims "${r.artist_name}"  · ${r.created_at.toISOString().slice(0, 10)}`);
  }
  console.log('\nnode scripts/reviewClaims.js show <id>');
};

const show = async (id) => {
  const c = await findClaim(pool, id);
  const tips = await heldTips(pool, c.artist_key);
  console.log(`Claim ${c.id}
  status       ${c.status}${c.reviewed_by ? ` (by ${c.reviewed_by}, ${c.reviewed_at.toISOString().slice(0, 10)})` : ''}
  type         ${c.source === 'collision' ? 'existing account whose name matches a catalog artist' : 'artist claim'}
  account      @${c.username} · "${c.display_name || c.username}" · ${c.email}${c.artist_verified ? ' · already verified' : ''}
  claims       "${c.artist_name}"
  code         ${c.verification_code}   ← look for this on the artist's own page
  evidence     ${c.evidence || '(none)'}
  held tips    ${tips.n} tip(s), ${money(tips.cents)}${c.reviewer_note ? `\n  note         ${c.reviewer_note}` : ''}`);
};

const approve = async (id, note) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const c = await findClaim(client, id);
    await client.query('SELECT 1 FROM claim_requests WHERE id = $1 FOR UPDATE', [c.id]);
    if (c.status !== 'pending') throw new Error(`This claim is already ${c.status}.`);
    if (!c.is_artist) throw new Error('That account is not an artist account.');
    if (c.artist_verified) throw new Error('That account is already verified as an artist.');

    // Another account already showing this name would end up with the same name
    const { rows: clash } = await client.query(
      `SELECT username FROM users
       WHERE id <> $1 AND is_artist = TRUE
         AND ponytail_name_key(COALESCE(NULLIF(trim(display_name), ''), username)) = $2`,
      [c.user_id, c.artist_key]
    );
    if (clash.length) {
      throw new Error(`@${clash.map((r) => r.username).join(', @')} also uses this name. Rename that account first.`);
    }

    await client.query(
      `UPDATE users SET display_name = $2, artist_verified = TRUE, artist_verified_at = NOW() WHERE id = $1`,
      [c.user_id, c.artist_name]
    );
    const released = await client.query(
      `UPDATE tips SET recipient_id = $1, recipient_name = $3
       WHERE recipient_id IS NULL AND recipient_key = $2
       RETURNING amount_cents`,
      [c.user_id, c.artist_key, c.artist_name]
    );
    const others = await client.query(
      `UPDATE claim_requests
       SET status = 'rejected', reviewer_note = 'Another account was verified as this artist.',
           reviewed_by = $3, reviewed_at = NOW()
       WHERE artist_key = $1 AND status = 'pending' AND id <> $2
       RETURNING id`,
      [c.artist_key, c.id, reviewer]
    );
    await client.query(
      `UPDATE claim_requests SET status = 'approved', reviewer_note = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $1`,
      [c.id, note || null, reviewer]
    );
    await client.query('COMMIT');

    const cents = released.rows.reduce((t, r) => t + r.amount_cents, 0);
    console.log(`Approved. @${c.username} is now verified as "${c.artist_name}".`);
    console.log(`  Released ${released.rowCount} held tip(s), ${money(cents)}.`);
    if (others.rowCount) console.log(`  Rejected ${others.rowCount} other waiting claim(s) for this artist.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const reject = async (id, reason) => {
  if (!reason) throw new Error('Give a reason; the artist will see it.');
  const c = await findClaim(pool, id);
  const { rowCount } = await pool.query(
    `UPDATE claim_requests SET status = 'rejected', reviewer_note = $2, reviewed_by = $3, reviewed_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [c.id, reason, reviewer]
  );
  if (!rowCount) throw new Error(`This claim is already ${c.status}.`);
  console.log(`Rejected claim by @${c.username} for "${c.artist_name}".`);
};

(async () => {
  const [cmd, id, ...rest] = process.argv.slice(2);
  const text = rest.join(' ').trim();
  try {
    if (!cmd || cmd === 'list') await list();
    else if (cmd === 'show') await show(id);
    else if (cmd === 'approve') await approve(id, text);
    else if (cmd === 'reject') await reject(id, text);
    else throw new Error(`Unknown command "${cmd}". Use list, show, approve or reject.`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
