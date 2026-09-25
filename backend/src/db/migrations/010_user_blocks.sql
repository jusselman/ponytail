-- 010_user_blocks.sql
-- One user blocking another, iPhone-Messages style. For now a block only
-- affects direct messages: the blocked person can no longer send messages to
-- the blocker, while the conversation itself stays exactly as it was for both
-- people, full history included. Profiles, follows, and playlists are
-- untouched. The blocked person is never told they were blocked; their
-- composer just says they can't message this account.
--
-- Deleting the row (unblock) lets them message again. Nothing is deleted when
-- blocking.

CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
