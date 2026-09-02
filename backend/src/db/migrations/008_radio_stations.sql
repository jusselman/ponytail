-- 008_radio_stations.sql
-- User-created radio stations for the frequency-dial Radio tab rebuild, plus
-- the GOAT / UN-GOAT single-station toggle and a per-user rating column on
-- user_play_history (so thumbs up/down in Radio feeds real personalization
-- signal instead of only the existing global thumb_up/thumb_down counters
-- on seed_tracks, which stay untouched as a separate all-users counter).
--
-- radio_stations: a user's own custom stations. Each is seeded from one
-- artist and auto-populated with that artist's catalog tracks plus tracks
-- similar_artist-matched to them (same matching pattern already used by
-- /radio/my-station and /albums/discover). hue/position are purely cosmetic
-- — where the station's colored blip sits along the tuner dial (position
-- 0-100) and what color it renders in (hue 0-360) — assigned once at
-- creation so a station doesn't jump around the dial between sessions.
--
-- users.goat_artist / users.goat_mode: the single GOAT/UN-GOAT station slot.
-- goat_mode = 'goat' means goat_artist + similar plays as its own station;
-- 'ungoat' means the opposite — that artist (and everyone similar_artist-
-- matched to them) gets excluded from every other station's track pool
-- (Hot in Here, custom stations) instead of being played anywhere.
--
-- user_play_history.rating: nullable, 1 (thumbs up) or -1 (thumbs down), set
-- by the Radio tuner's thumbs up/down via POST /history/rate. Upserted the
-- same way play_count already is.
--
-- Run this once against your dev database:
--   psql "$DATABASE_URL" -f backend/src/db/migrations/008_radio_stations.sql

BEGIN;

CREATE TABLE IF NOT EXISTS radio_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    seed_artist VARCHAR(255) NOT NULL,
    hue INT NOT NULL DEFAULT 200,
    position REAL NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radio_stations_user_id ON radio_stations(user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS goat_artist VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS goat_mode VARCHAR(10) NOT NULL DEFAULT 'goat';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_goat_mode_check;
ALTER TABLE users ADD CONSTRAINT users_goat_mode_check CHECK (goat_mode IN ('goat', 'ungoat'));

ALTER TABLE user_play_history ADD COLUMN IF NOT EXISTS rating SMALLINT;
ALTER TABLE user_play_history DROP CONSTRAINT IF EXISTS user_play_history_rating_check;
ALTER TABLE user_play_history ADD CONSTRAINT user_play_history_rating_check CHECK (rating IN (-1, 1));

COMMIT;
