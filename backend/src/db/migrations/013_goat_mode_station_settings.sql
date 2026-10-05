-- 013_goat_mode_station_settings.sql
-- Goat Mode: the four Station Panel fields, kept per station.
--
--   Artist   one artist; the station plays music similar to them
--   Tags     several; matched against each track's genre, subgenre, mood, tag5
--   Goat     one artist; shapes the station like Artist does and is also
--            guaranteed to come round often
--   Un-Goat  several artists; never played on this station
--
-- A custom station keeps these on its radio_stations row (seed_artist is the
-- Artist field, and is now optional because a station can be built from tags
-- or a Goat alone). The built-in stations have no row, so theirs live on the
-- user, keyed by station id:
--   users.radio_station_settings =
--     { "hot-in-here":  { "ungoat": ["..."] },
--       "your-station": { "artist": "...", "tags": ["..."], "goat": "...", "ungoat": ["..."] } }
-- Hot in Here only ever takes Un-Goat.
--
-- The old account-wide Goat / Un-Goat slot (users.goat_artist, goat_mode) and
-- its own station on the dial are no longer used. The columns are left alone.
--
-- Run this once against your dev database:
--   psql "$DATABASE_URL" -f src/db/migrations/013_goat_mode_station_settings.sql

BEGIN;

ALTER TABLE radio_stations ALTER COLUMN seed_artist DROP NOT NULL;
ALTER TABLE radio_stations ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE radio_stations ADD COLUMN IF NOT EXISTS goat_artist VARCHAR(255);
ALTER TABLE radio_stations ADD COLUMN IF NOT EXISTS ungoat_artists TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE users ADD COLUMN IF NOT EXISTS radio_station_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
