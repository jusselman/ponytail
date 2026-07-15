feat: musician accounts, track uploads, and playlist cover art fixes

Musician Accounts

Added a separate signup path letting a new user choose listener or musician at registration, keeping the existing listener onboarding completely untouched
Built a streamlined musician onboarding flow collecting email, password, and artist name, skipping the favorite artists picker since it does not apply to an upload focused account
Added an is_artist flag to registration and to the current user endpoint so the frontend can gate musician only features

Track Uploads

Added a track upload endpoint restricted to musician accounts, storing audio and optional cover art and inserting directly into the shared track catalog so uploads are searchable and playable everywhere else in the app
Added a Your Uploads row in My Music with an upload button opening a panel to submit title, album, genre, audio file, and cover art

Track Management

Replaced tap to play on your own uploaded tracks with a bottom rising panel matching the rest of the app rather than browser popups, letting a musician edit title, album, genre, and cover art, or delete the track
Delete and edit both enforce ownership server side and clean up the old audio or cover file from disk
Removed the play button overlay from the Your Uploads row since tapping now opens the edit panel instead of playing

Playback and Cover Art Fixes

Extended cover and audio URL resolution to branch correctly for uploaded tracks across every remaining endpoint that still used the old catalog only lookup, including album browsing, artist pages, and discovery
Extracted the shared cover and audio resolution logic into its own module so it is defined once instead of duplicated across files
Fixed playlist tracks showing a blank cover image by adding a self healing check that repairs stale stored cover and audio URLs the first time an affected playlist is opened, without disturbing playlists whose original track was later removed
