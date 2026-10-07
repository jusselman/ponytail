-- 015_duck_mode.sql
-- Adds Duck Mode, the third station mode. Tapping the mode icon in the
-- Station Panel now goes Goat -> Pony -> Duck -> Goat.
--
--   goat   all four fields: Artist, Tags, Goat, Un-Goat
--   pony   Artist and Tags only
--   duck   Goat and Un-Goat only
--
-- Fields a mode leaves out stay saved on the station and come back when the
-- mode that uses them does.
--
-- Run this once against your dev database:
--   psql "$DATABASE_URL" -f src/db/migrations/015_duck_mode.sql

BEGIN;

ALTER TABLE radio_stations DROP CONSTRAINT IF EXISTS radio_stations_mode_check;
ALTER TABLE radio_stations ADD CONSTRAINT radio_stations_mode_check CHECK (mode IN ('goat', 'pony', 'duck'));

COMMIT;
