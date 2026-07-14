-- 005_playlist_follows.sql
-- Lets a user follow another user's public playlist, surfacing it in their own
-- "Playlists You Follow" row. Deliberately not gated at the DB layer on is_public —
-- the API layer (playlistController.js) enforces that a playlist must be public to
-- be followed, since is_public can change after the fact and the DB constraint
-- would need a trigger to stay in sync; simpler to enforce it where the follow
-- action originates.

CREATE TABLE IF NOT EXISTS playlist_follows (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, playlist_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_follows_playlist ON playlist_follows(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_follows_user ON playlist_follows(user_id);
