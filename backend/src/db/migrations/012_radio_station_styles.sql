-- 012_radio_station_styles.sql
-- Lets a listener restyle the name of each station on their Radio dial: the
-- sign's font and color, picked in the "Edit Station Name" sheet.
--
-- users.radio_station_styles is one JSON object per user, keyed by station:
--   { "hot-in-here": { "font": "Bangers", "color": "#44f729" },
--     "<custom station uuid>": { "font": "Monoton", "color": "#ff5ad1" } }
-- Built-in stations (hot-in-here, your-station, goat) have no row of their
-- own in radio_stations, so the styles for every station live together here
-- rather than as columns on radio_stations. A station with no entry uses the
-- default (Permanent Marker, yellow).
--
-- Hot in Here can be restyled but never renamed, moved or deleted — that is
-- enforced by the API (it has no radio_stations row to rename or delete).
--
-- Run this once against your dev database:
--   psql "$DATABASE_URL" -f backend/src/db/migrations/012_radio_station_styles.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS radio_station_styles JSONB NOT NULL DEFAULT '{}'::jsonb;
