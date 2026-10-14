-- 017_bulletin.sql
-- Real posting on the Bulletin tab: posts, likes and replies.
--
-- bulletin_posts: a text body plus a required tag (validated per role in
-- bulletinController.js), optional tag-specific details (show date/venue,
-- crowdfunding goal, what a musician is looking for...), an optional photo
-- (image_url, a file in assets/uploads) and an optional music attachment.
-- Following the messages convention (009), a shared track or album is
-- identified by (title/album, artist) with its display fields denormalized
-- into attachment JSONB rather than FK'd to seed_tracks.
--
-- Seeded demo posts: the old hardcoded MOCK_POSTS are inserted below so the
-- feed looks full for demos. Their authors are not real accounts, so those
-- rows have author_id NULL and carry seed_author (name, handle, isArtist,
-- hue) instead. seed_likes / seed_reposts are display offsets added to the
-- real counts. seed_key keeps this file safe to re-run.

CREATE TABLE IF NOT EXISTS bulletin_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (length(btrim(body)) > 0),
    tag TEXT NOT NULL,
    details JSONB,
    image_url TEXT,
    attachment_type TEXT CHECK (attachment_type IN ('track', 'album')),
    attachment JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    seed_key TEXT UNIQUE,
    seed_author JSONB,
    seed_media JSONB,
    seed_likes INTEGER NOT NULL DEFAULT 0,
    seed_reposts INTEGER NOT NULL DEFAULT 0,
    CHECK ((attachment_type IS NULL) = (attachment IS NULL)),
    CHECK (author_id IS NOT NULL OR seed_author IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bulletin_posts_created ON bulletin_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_author ON bulletin_posts(author_id);

CREATE TABLE IF NOT EXISTS bulletin_post_likes (
    post_id UUID NOT NULL REFERENCES bulletin_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS bulletin_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES bulletin_posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (length(btrim(body)) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    seed_key TEXT UNIQUE,
    seed_author JSONB,
    CHECK (author_id IS NOT NULL OR seed_author IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bulletin_replies_post ON bulletin_replies(post_id, created_at);

-- ── Seeded demo posts (the former MOCK_POSTS) ──
INSERT INTO bulletin_posts (seed_key, seed_author, body, tag, details, seed_media, seed_likes, seed_reposts, created_at) VALUES
('mock-1', '{"name":"Margot Veil","handle":"margotveil","isArtist":true,"hue":170}',
 'It''s official — Cartography of Silence drops July 4th. Three years in the making, and every note of it is exactly what I wanted to say. Thank you for waiting.',
 'New Release', NULL, '{"type":"album","label":"Cartography of Silence"}', 842, 214, NOW() - INTERVAL '2 hours'),
('mock-2', '{"name":"Jae Marlowe","handle":"jaehearsit","isArtist":false,"hue":340}',
 'Callow Kings at Bottom of the Hill last night absolutely destroyed. Ears still ringing, worth every bit of it. If you slept on this show I''m so sorry for you 😭',
 'Show Recap', '{"artist":"Callow Kings","venue":"Bottom of the Hill"}', '{"type":"photo","label":"Bottom of the Hill, SF"}', 231, 12, NOW() - INTERVAL '3 hours'),
('mock-3', '{"name":"Dusk Relay","handle":"duskrelay","isArtist":true,"hue":220}',
 'WE HIT THE GOAL. The van is real. West coast tour is happening this fall because 203 of you believed in three people and a lot of gear. See you out there.',
 'Crowdfunding', '{"goal":"12000","raised":"12000"}', NULL, 1104, 388, NOW() - INTERVAL '5 hours'),
('mock-4', '{"name":"Neon Parish","handle":"neonparish","isArtist":true,"hue":280}',
 'Glass & Copper is out now. Ten tracks, no filler, no gatekeepers — just us and you. Stream it straight from our profile.',
 'New Release', NULL, '{"type":"album","label":"Glass & Copper"}', 966, 260, NOW() - INTERVAL '7 hours'),
('mock-5', '{"name":"Priya Okonkwo","handle":"priyaspins","isArtist":false,"hue":40}',
 'The thing I love about Ponytail is I found Sable Junction on a Tuesday with zero algorithm telling me to. Just people posting what they actually love. This is what discovery is supposed to feel like.',
 'Recommendation', NULL, NULL, 412, 54, NOW() - INTERVAL '9 hours'),
('mock-6', '{"name":"Sable Junction","handle":"sablejunction","isArtist":true,"hue":120}',
 'One take, one warehouse in SoMa, one mic between the three of us. The live session EP is a document of exactly what that room sounded like. Out now.',
 'New Release', NULL, '{"type":"photo","label":"SoMa warehouse session"}', 578, 97, NOW() - INTERVAL '11 hours'),
('mock-7', '{"name":"Theo Baptiste","handle":"theoplaysdrums","isArtist":false,"hue":260}',
 'who''s pulling up to open mic night thursday. i need a bassist for two songs and i will owe you forever',
 'Question', NULL, NULL, 64, 3, NOW() - INTERVAL '13 hours'),
('mock-8', '{"name":"The Pelican Stairs","handle":"pelicanstairs","isArtist":true,"hue":30}',
 'Signed with Tide Pool Records this week — a label that gets it, run by people who actually go to shows. Vinyl pressing and the west coast run are both funded because of this. More soon.',
 'Milestone', NULL, NULL, 703, 176, NOW() - INTERVAL '1 day'),
('mock-9', '{"name":"Ren Castellano","handle":"rencastellano","isArtist":false,"hue":200}',
 'album release party for Neon Parish was UNREAL. sweatiest room in Oakland, best possible way. photo dump incoming',
 'Show Recap', '{"artist":"Neon Parish"}', '{"type":"photo","label":"Neon Parish release party"}', 289, 8, NOW() - INTERVAL '1 day 2 hours'),
('mock-10', '{"name":"Kaare Norge","handle":"kaarenorge","isArtist":true,"hue":200}',
 'Fjord Sessions Vol. 2 is streaming now. Recorded mostly in silence, mostly at night, mostly because I couldn''t sleep. Hope it does for you what it did for me.',
 'New Release', NULL, '{"type":"album","label":"Fjord Sessions Vol. 2"}', 445, 61, NOW() - INTERVAL '1 day 4 hours'),
('mock-11', '{"name":"Ponytail Curators","handle":"ponytailpicks","isArtist":false,"hue":190}',
 '5 independent artists quietly having the best year on Ponytail right now: Margot Veil, Dusk Relay, Neon Parish, Sable Junction, and Kaare Norge. Zero label money behind any of it. Just word of mouth.',
 'Recommendation', NULL, NULL, 921, 302, NOW() - INTERVAL '2 days'),
('mock-12', '{"name":"Petteri Sariola","handle":"petterisariola","isArtist":true,"hue":60}',
 'Open Strings just crossed 10,000 plays. No label, no ad spend, no algorithm push — just this community passing it along one person at a time. I genuinely don''t have the words. Thank you.',
 'Milestone', NULL, NULL, 1340, 410, NOW() - INTERVAL '2 days 3 hours'),
('mock-13', '{"name":"Nola Voss","handle":"nolavoss","isArtist":true,"hue":180}',
 'The Fillmore next Sunday. Ambient set, full room, no phones up front please — just be in it with me.',
 'Show', jsonb_build_object('date', to_char(CURRENT_DATE + 7, 'YYYY-MM-DD'), 'venue', 'The Fillmore', 'city', 'San Francisco'),
 NULL, 512, 88, NOW() - INTERVAL '3 days')
ON CONFLICT (seed_key) DO NOTHING;

-- ── A few seeded replies so threads aren't empty in demos ──
INSERT INTO bulletin_replies (seed_key, post_id, seed_author, body, created_at)
SELECT r.seed_key, p.id, r.seed_author::jsonb, r.body, p.created_at + r.after
FROM (VALUES
  ('mock-reply-1', 'mock-1', '{"name":"Priya Okonkwo","handle":"priyaspins","isArtist":false,"hue":40}', 'Counting down the days. The single has been on repeat all week.', INTERVAL '20 minutes'),
  ('mock-reply-2', 'mock-1', '{"name":"Jae Marlowe","handle":"jaehearsit","isArtist":false,"hue":340}', 'Please tell me there is a vinyl pressing', INTERVAL '45 minutes'),
  ('mock-reply-3', 'mock-3', '{"name":"Ren Castellano","handle":"rencastellano","isArtist":false,"hue":200}', 'Proud to be one of the 203. Bring the van to Oakland!', INTERVAL '30 minutes'),
  ('mock-reply-4', 'mock-7', '{"name":"Sable Junction","handle":"sablejunction","isArtist":true,"hue":120}', 'Our bassist might be free Thursday, sending you a DM.', INTERVAL '1 hour'),
  ('mock-reply-5', 'mock-12', '{"name":"Margot Veil","handle":"margotveil","isArtist":true,"hue":170}', 'So deserved. Open Strings got me through a whole winter.', INTERVAL '2 hours')
) AS r(seed_key, post_key, seed_author, body, after)
JOIN bulletin_posts p ON p.seed_key = r.post_key
ON CONFLICT (seed_key) DO NOTHING;
