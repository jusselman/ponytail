-- Migration 002: denormalize playlist_tracks against seed_tracks instead of tracks(id)
--
-- Why: playlist_tracks.track_id originally referenced tracks(id) — the artist-upload
-- schema (tracks/albums/artist_profiles). But the real, playable catalog right now is
-- seed_tracks, which has no id exposed anywhere else in the app; every existing feature
-- that points at a specific track (user_play_history, user_search_selections) identifies
-- it by (track_title, artist), not a foreign key. This migration brings playlist_tracks
-- in line with that convention so playlists can actually hold seed_tracks songs.
--
-- Run this once against your dev database:
--   psql "$DATABASE_URL" -f backend/src/db/migrations/002_playlist_tracks_denormalized.sql

BEGIN;

-- Drop the old FK to tracks(id) — seed_tracks rows have no matching id there.
ALTER TABLE playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_track_id_fkey;
ALTER TABLE playlist_tracks DROP COLUMN IF EXISTS track_id;
ALTER TABLE playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_playlist_id_track_id_key;

-- Denormalized track identity + display data, mirroring seed_tracks' shape.
ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS track_title VARCHAR(255);
ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS artist VARCHAR(255);
ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS album VARCHAR(255);
ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS genre VARCHAR(100);
ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Required once existing rows (if any) have been backfilled or the table is empty.
ALTER TABLE playlist_tracks ALTER COLUMN track_title SET NOT NULL;
ALTER TABLE playlist_tracks ALTER COLUMN artist SET NOT NULL;

-- One entry per track per playlist, same identity convention as user_play_history.
ALTER TABLE playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_playlist_track_unique;
ALTER TABLE playlist_tracks ADD CONSTRAINT playlist_tracks_playlist_track_unique
  UNIQUE (playlist_id, track_title, artist);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);

COMMIT;
