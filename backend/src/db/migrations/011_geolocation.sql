-- 011_geolocation.sql
-- Real geolocation for the Discovery "Place" filter (Sound | Place panel),
-- replacing the plain-city-string stand-in described in 007.
--
-- places: every city, region and country a listener can pick, plus a few
-- hand-drawn metros (e.g. "Bay Area"). Cities come from GeoNames
-- (backend/assets/geo/cities.tsv, population >= 15,000) and are loaded by
-- `node scripts/importPlaces.js`, which also derives the region/country rows.
--   kind = 'city'    → matches anything within CITY_RADIUS_MI of lat/lng
--   kind = 'metro'   → matches anything within radius_mi of lat/lng
--   kind = 'region'  → matches country_code + admin1_code
--   kind = 'country' → matches country_code
--
-- users / seed_tracks get the same four resolved columns. location (TEXT)
-- stays as the human-readable label ("Oakland, CA") so nothing that already
-- reads it breaks. seed_tracks rows are filled per artist by
-- `node scripts/enrichArtistLocations.js` (catalog) and stamped from the
-- musician's profile on upload (user uploads).
--
-- Run once against your dev database:
--   psql "$DATABASE_URL" -f backend/src/db/migrations/011_geolocation.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS places (
  id            SERIAL PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('city', 'metro', 'region', 'country')),
  geoname_id    INTEGER,
  name          TEXT NOT NULL,
  ascii_name    TEXT NOT NULL,
  country_code  CHAR(2),
  country_name  TEXT,
  admin1_code   TEXT,
  region_name   TEXT,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  radius_mi     DOUBLE PRECISION,
  population    BIGINT DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_places_geoname ON places(geoname_id) WHERE geoname_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_places_region ON places(country_code, admin1_code) WHERE kind = 'region';
CREATE UNIQUE INDEX IF NOT EXISTS idx_places_country ON places(country_code) WHERE kind = 'country';
CREATE UNIQUE INDEX IF NOT EXISTS idx_places_metro ON places(name) WHERE kind = 'metro';
CREATE INDEX IF NOT EXISTS idx_places_ascii_trgm ON places USING gin (lower(ascii_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_places_ascii_lower ON places(lower(ascii_name) text_pattern_ops);

ALTER TABLE users ADD COLUMN IF NOT EXISTS location_place_id INTEGER REFERENCES places(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_country CHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_region TEXT;

ALTER TABLE seed_tracks ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE seed_tracks ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE seed_tracks ADD COLUMN IF NOT EXISTS location_country CHAR(2);
ALTER TABLE seed_tracks ADD COLUMN IF NOT EXISTS location_region TEXT;

CREATE INDEX IF NOT EXISTS idx_seed_tracks_geo ON seed_tracks(location_lat, location_lng) WHERE location_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seed_tracks_country ON seed_tracks(location_country, location_region);

COMMIT;
