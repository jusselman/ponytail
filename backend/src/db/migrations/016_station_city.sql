-- 016_station_city.sql
-- An optional city per station, set from the Station Panel's location button.
-- A station with a city plays only artists located within 25 miles of it
-- (the same radius a city uses in Discovery's Sound | Place filter), shaped
-- by its mode's fields as usual. A station with no city plays from anywhere.
-- The Goat's own tracks are the exception: a Goat is guaranteed airtime
-- wherever they're from.
--
-- New stations start with no city. Hot in Here keeps using the listener's
-- own city (users.location_*) and its 10 mile radius. Your Station keeps its
-- city in users.radio_station_settings beside its other fields.
--
-- Run this once against your dev database:
--   psql "$DATABASE_URL" -f src/db/migrations/016_station_city.sql

BEGIN;

ALTER TABLE radio_stations ADD COLUMN IF NOT EXISTS city_place_id INT;
ALTER TABLE radio_stations ADD COLUMN IF NOT EXISTS city_label TEXT;
ALTER TABLE radio_stations ADD COLUMN IF NOT EXISTS city_lat DOUBLE PRECISION;
ALTER TABLE radio_stations ADD COLUMN IF NOT EXISTS city_lng DOUBLE PRECISION;

COMMIT;
