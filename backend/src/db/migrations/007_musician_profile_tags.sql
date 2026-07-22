-- 007_musician_profile_tags.sql
-- Extends users with the same tag vocabulary seed_tracks already uses (see
-- enriched_db.csv: Tag 1 Genre, Tag 2 Subgenre, Tag 4 Mood, Tag 5, Location),
-- captured once during musician onboarding. Two things read these columns:
--
--   1. The track upload endpoint stamps every new seed_tracks row a musician
--      uploads with their profile's genre/subgenre/mood/sound_description/
--      location, so an uploaded track looks just like any other catalog row
--      instead of asking the musician to re-enter the same tags per track.
--   2. The personalized radio station and "Hot in Here" (nearby musicians)
--      features match musicians against each other using these same columns.
--
-- location is a plain city string for now (e.g. "Kansas City") — there's no
-- geocoding/lat-long anywhere in the app yet, so "Hot in Here" starts out
-- doing a same-city text match as an interim stand-in. Real geo-radius
-- matching is a planned upgrade that only requires adding lat/long columns
-- later; the onboarding question and this column don't need to change.
--
-- sound_description is the free-text "how would you describe your sound"
-- answer (stored as Tag 5), capped at 30 characters at both the app layer
-- (onboarding input) and here via a CHECK constraint as a backstop.

ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subgenre TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mood TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sound_description VARCHAR(30);

-- ── Backstop the 30-character limit at the DB layer too, in case a row is ever
-- written outside the onboarding form's own maxLength enforcement ──
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_sound_description_length;
ALTER TABLE users ADD CONSTRAINT users_sound_description_length
  CHECK (char_length(sound_description) <= 30);

CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
