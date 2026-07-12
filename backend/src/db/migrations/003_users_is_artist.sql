-- 003_users_is_artist.sql
-- Ensures users.is_artist exists so search can distinguish musician accounts
-- (accounts that upload their own music) from regular listener accounts.
-- schema.sql already listed this column, but schema.sql has drifted from the
-- live database before (see 002_playlist_tracks_denormalized.sql), so this
-- is written defensively with IF NOT EXISTS rather than assumed to be there.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_artist BOOLEAN DEFAULT FALSE;
