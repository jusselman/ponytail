-- 006_seed_tracks_uploads.sql
-- Lets musician accounts upload their own tracks into the same seed_tracks catalog
-- that Andrew's imported data lives in, so uploaded tracks are searchable and
-- playable through all the same paths as the rest of the library.
--
-- uploaded_audio_url / uploaded_cover_url store an already-public URL directly,
-- because playback for the existing catalog works by fuzzy-matching artist/album/
-- filename against a pre-scanned cache of the mp3/ and covers/ directories on disk
-- (see authRoutes.js resolveAudio/resolveCover) — an uploaded file was never part
-- of that scan, so it can't be found that way. is_user_upload tells the URL-resolution
-- helpers (getCoverUrl/getAudioUrl in authRoutes.js) to use these columns directly
-- instead of attempting the fuzzy filesystem match.

ALTER TABLE seed_tracks ADD COLUMN IF NOT EXISTS uploader_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE seed_tracks ADD COLUMN IF NOT EXISTS is_user_upload BOOLEAN DEFAULT FALSE;
ALTER TABLE seed_tracks ADD COLUMN IF NOT EXISTS uploaded_audio_url TEXT;
ALTER TABLE seed_tracks ADD COLUMN IF NOT EXISTS uploaded_cover_url TEXT;

CREATE INDEX IF NOT EXISTS idx_seed_tracks_uploader ON seed_tracks(uploader_user_id);
