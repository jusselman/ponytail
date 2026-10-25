-- 019_artist_identity.sql
-- Stops people from posing as real artists, and stops tips going to whoever
-- picks the right name.
--
-- Before this migration an artist name was just text: not unique, editable at
-- any time, and tips held for catalog artists went to any musician account
-- whose display name matched. Now:
--
--   1. ponytail_name_key() turns a name into a match key so look-alikes count
--      as the same name ("The Strokes", "strokes", "Str0kes", "Strоkes" with a
--      Cyrillic o). Every check, in SQL and in the app, goes through it.
--   2. Artist names are unique among artist accounts, and names of artists in
--      the imported catalog are reserved: they can only be taken through an
--      approved claim.
--   3. users.artist_verified marks an artist the Ponytail team has checked.
--      A verified artist's name is locked.
--   4. claim_requests records "this catalog artist is me" requests. They are
--      reviewed with backend/scripts/reviewClaims.js, never through the API.
--   5. Held tips are released only when a claim is approved, never by a name
--      match (see tipController.js).
--
-- Accounts that already exist keep their names. Any existing artist whose name
-- matches a catalog artist is flagged with a 'collision' claim for the team to
-- review; until it is approved that account gets no badge and no held tips.
--
-- Needs PostgreSQL 13 or newer (for normalize()).
--   psql "$DATABASE_URL" -f backend/src/db/migrations/019_artist_identity.sql

BEGIN;

-- ── 1. Match key ──
-- Steps: Unicode compatibility form (fullwidth letters, ligatures) → lower case
-- → strip accents → drop a leading "The " → "&"/"+" to "and" → look-alike
-- letters and digits to one Latin letter → drop spaces, punctuation and
-- invisible characters. Letters from other scripts (Japanese, Arabic, ...) are kept,
-- so names in those scripts still get a real key.
CREATE OR REPLACE FUNCTION ponytail_name_key(name TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT NULLIF(
    regexp_replace(
      translate(
        regexp_replace(
          regexp_replace(
            regexp_replace(lower(normalize(COALESCE(name, ''), NFKD)), '[\u0300-\u036f]', '', 'g'),
            '^[[:space:]]*the[[:space:]]+', ''),
          '[&+]', 'and', 'g'),
        -- look-alike letters (capitals too: lower() only folds A-Z on some
        -- servers), digit/symbol swaps, i vs l
        'аеорсухкмтвнѕіјԁһԛԝӏοαρτνικυεβ013457$@!|iАВЕКМНОРСТХУІЈЅΑΒΕΖΗΙΚΜΝΟΡΤΥΧ',
        'aeopcyxkmtbhsljdhqwloaptvlkueboleastsalllabekmhopctxyljsabezhlkmnoptyx'
      ),
      '[[:space:][:punct:]\u00a0\u00ad\u200b-\u200f\u2028-\u202f\u2060\ufeff´“”‘’«»¡¿·•–—]', '', 'g'),
    '')
$$;

-- ── 2. Verified artists ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_verified_at TIMESTAMPTZ;

-- Fast lookups of catalog artists and accounts by key
CREATE INDEX IF NOT EXISTS idx_seed_tracks_artist_key
  ON seed_tracks (ponytail_name_key(artist))
  WHERE is_user_upload IS NOT TRUE;
CREATE INDEX IF NOT EXISTS idx_users_name_key
  ON users (ponytail_name_key(COALESCE(NULLIF(trim(display_name), ''), username)));

-- ── 3. Claims ──
CREATE TABLE IF NOT EXISTS claim_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_name TEXT NOT NULL,             -- the catalog artist, as written in the catalog
    artist_key TEXT NOT NULL,              -- ponytail_name_key(artist_name)
    source TEXT NOT NULL DEFAULT 'claim'
        CHECK (source IN ('claim', 'collision')),
    evidence TEXT CHECK (evidence IS NULL OR length(evidence) <= 1000),
    verification_code TEXT NOT NULL,       -- artist posts this on a page they control
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_note TEXT,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- One open claim per account per artist, and only one account can ever win
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_one_pending
  ON claim_requests (user_id, artist_key) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_one_approved
  ON claim_requests (artist_key) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_claims_pending ON claim_requests (created_at) WHERE status = 'pending';

-- ── 4. Tips remember which artist they were for, by key ──
ALTER TABLE tips ADD COLUMN IF NOT EXISTS recipient_key TEXT;
UPDATE tips SET recipient_key = ponytail_name_key(recipient_name) WHERE recipient_key IS NULL;
CREATE INDEX IF NOT EXISTS idx_tips_held_key ON tips (recipient_key) WHERE recipient_id IS NULL;

-- ── 5. Flag existing artists whose names match a catalog artist ──
INSERT INTO claim_requests (user_id, artist_name, artist_key, source, evidence, verification_code)
SELECT u.id, c.artist, c.key, 'collision',
       'Account existed before artist verification. Name matches a catalog artist.',
       'ponytail-' || substr(md5(random()::text), 1, 8)
FROM users u
JOIN LATERAL (
  SELECT artist, ponytail_name_key(artist) AS key
  FROM seed_tracks
  WHERE is_user_upload IS NOT TRUE
    AND ponytail_name_key(artist) = ponytail_name_key(COALESCE(NULLIF(trim(u.display_name), ''), u.username))
  LIMIT 1
) c ON TRUE
WHERE u.is_artist = TRUE
ON CONFLICT DO NOTHING;

-- ── 6. Artist names unique among artist accounts ──
-- Only created if existing accounts don't already clash; otherwise the clash is
-- listed so the team can rename one, and the app still blocks new clashes.
DO $$
DECLARE clashes TEXT;
BEGIN
  SELECT string_agg(names, '; ') INTO clashes FROM (
    SELECT string_agg(COALESCE(NULLIF(trim(display_name), ''), username), ' / ') AS names
    FROM users WHERE is_artist = TRUE
    GROUP BY ponytail_name_key(COALESCE(NULLIF(trim(display_name), ''), username))
    HAVING COUNT(*) > 1
  ) d;
  IF clashes IS NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_artist_name_unique
      ON users (ponytail_name_key(COALESCE(NULLIF(trim(display_name), ''), username)))
      WHERE is_artist = TRUE;
  ELSE
    RAISE NOTICE 'Artist names that clash (rename one of each, then re-run this file): %', clashes;
  END IF;
END $$;

COMMIT;

-- Report what was flagged
SELECT u.username, COALESCE(u.display_name, u.username) AS name, c.artist_name AS matches_catalog_artist
FROM claim_requests c JOIN users u ON u.id = c.user_id
WHERE c.source = 'collision' AND c.status = 'pending';
