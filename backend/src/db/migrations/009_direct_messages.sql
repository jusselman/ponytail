-- 009_direct_messages.sql
-- One-to-one direct messages between any two users (musician or listener).
--
-- conversations: exactly one row per pair of users. user_a_id is always the
-- smaller UUID and user_b_id the larger (enforced by the CHECK), so the UNIQUE
-- constraint makes "get or create the conversation between X and Y" race-safe
-- regardless of who messages first.
--
-- messages: a text body and/or one shared-music attachment. Following the app's
-- existing convention (see 002_playlist_tracks_denormalized.sql), a shared track
-- is identified by (title, artist) and its display/playback fields are
-- denormalized into attachment JSONB rather than FK'd to seed_tracks. A shared
-- playlist stores its id (so tapping opens the live playlist) plus a snapshot of
-- title/cover for the card.
--
-- Unread state is simply read_at IS NULL on messages the other person sent.

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_a_id, user_b_id),
    CHECK (user_a_id < user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON conversations(user_a_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON conversations(user_b_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT,
    attachment_type TEXT CHECK (attachment_type IN ('track', 'playlist')),
    attachment JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    CHECK (
      (body IS NOT NULL AND length(btrim(body)) > 0)
      OR attachment_type IS NOT NULL
    ),
    CHECK ((attachment_type IS NULL) = (attachment IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id) WHERE read_at IS NULL;
