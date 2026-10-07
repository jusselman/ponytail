-- 014_station_mode.sql
-- Station modes. Every station is in Goat Mode or Pony Mode (Duck Mode is
-- still to come), switched by tapping the mode icon in the Station Panel.
--
--   goat   all four fields play a part: Artist, Tags, Goat, Un-Goat
--   pony   only Artist and Tags; the station's Goat and Un-Goat are kept but
--          ignored, so switching back to Goat Mode brings them back
--
-- Custom stations keep their mode here. The built-in stations keep theirs
-- beside their other fields in users.radio_station_settings ("mode": "pony").
--
-- Run this once against your dev database:
--   psql "$DATABASE_URL" -f src/db/migrations/014_station_mode.sql

BEGIN;

ALTER TABLE radio_stations ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'goat';
ALTER TABLE radio_stations DROP CONSTRAINT IF EXISTS radio_stations_mode_check;
ALTER TABLE radio_stations ADD CONSTRAINT radio_stations_mode_check CHECK (mode IN ('goat', 'pony'));

COMMIT;
