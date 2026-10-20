-- 018_tips.sql
-- Tipping: a listener sends money to a musician or another user, prompted by
-- something they made — a track, a playlist or a Bulletin post.
--
-- Payments are mocked for the demo. The app walks through a Stripe-style
-- checkout (frontend/src/services/paymentService.js), no money moves, and the
-- tip is saved here with payment_status 'succeeded' and a fake payment_ref
-- (pi_mock_...). When real Stripe goes in, payment_ref becomes the Stripe
-- PaymentIntent id and payment_status is set by Stripe's webhook instead.
--
-- Recipient: recipient_id is the account that gets the tip. Most of the
-- catalog comes from Andrew's import, so many artists don't have a Ponytail
-- account yet. Those tips are held: recipient_id is NULL and recipient_name
-- holds the artist's name. When a musician account with that name opens its
-- tips, the held tips are moved onto it (see tipController.js).
--
-- Privacy: tips are only ever shown to their recipient. is_anonymous hides
-- the tipper from the recipient; tipper_id is still kept so a tip can be
-- refunded or looked into later.
--
-- target holds what prompted the tip, denormalized like the rest of the app:
--   track    { title, artist, album }
--   playlist { playlistId, title }
--   post     { postId, excerpt }
-- target_label is a short display string ("Song Title", "Playlist Name").

CREATE TABLE IF NOT EXISTS tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipper_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('track', 'playlist', 'post')),
    target JSONB NOT NULL,
    target_label TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 100 AND 50000),
    fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'usd',
    message TEXT CHECK (message IS NULL OR length(message) <= 200),
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    payment_provider TEXT NOT NULL DEFAULT 'mock',
    payment_ref TEXT NOT NULL UNIQUE,
    payment_status TEXT NOT NULL DEFAULT 'succeeded'
        CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
    card_brand TEXT,
    card_last4 TEXT CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tips_recipient ON tips(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_held ON tips(lower(recipient_name)) WHERE recipient_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tips_tipper ON tips(tipper_id, created_at DESC);
