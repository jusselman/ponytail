-- 004_user_follows.sql
-- A user can follow any other user directly (musician or not) — bypasses the
-- artist_profiles-based `follows` table sketched in schema.sql, since
-- artist_profiles isn't populated or used anywhere in the app yet. This keeps
-- following as simple, direct user-to-user rows, consistent with how the rest
-- of this app favors simple direct tables over the original aspirational schema.

CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id != followed_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
