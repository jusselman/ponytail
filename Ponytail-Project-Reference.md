# Ponytail — Project Reference Document

*Last updated: July 2026. This document is a grounding reference for ongoing development conversations. Update it periodically as the project evolves.*

---

## 1. Project Overview

**Ponytail** is a social music platform built for independent musicians and their listeners. It combines a Spotify-style listening experience (search, personalized feeds, queue management) with a Tinder-style swipe-to-discover mechanic for finding new music, and is designed around direct artist support (tipping) rather than a traditional purchase/subscription model.

**The problem it solves:** independent musicians struggle to get discovered and to monetize a direct relationship with listeners on major platforms, which are optimized for scale and algorithmic playlists rather than genuine fan connection. Ponytail aims to give listeners a low-friction way to discover independent artists they'll genuinely like (via the Discovery swipe mechanic and personalized recommendations), and to give those artists a direct line to fan support via tips rather than relying solely on tiny per-stream payouts.

**Vision:** a listening app where recommendations are grounded in genuine listening behavior (play history, search behavior, swipe preferences) rather than opaque algorithms, where playlists are personal and self-curated, and where supporting an artist directly (a tip) is as easy as liking a track.

**Primary stakeholder context:** Joshua is the founder/developer. Andrew is a collaborator supplying the real music database (an enriched CSV export of a personal music library with metadata tags) and its associated real mp3/cover art files. Decisions about the app get discussed in periodic "Ponytail meetings" and fed back into development.

---

## 2. Tech Stack & Architecture

### Frontend
- **Framework:** React Native via Expo (`expo start`, runs web/iOS/Android from one codebase; primary development and testing happens via `expo start --web` in Chrome)
- **State/Context:** React Context API — no Redux. Two major context providers:
  - `PlayerContext` — global audio player state and controls
  - `PlaybackProgressContext` — isolated fast-changing playback progress (see Section 3)
  - `UIContext` — cross-cutting UI state (profile panel open/closed, settings panel, etc.)
- **Storage:** `@react-native-async-storage/async-storage` for local persistence (auth token, loved tracks list)
- **Drag & drop:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (see Section 3 — replaced a hand-built manual drag system)
- **HTTP:** native `fetch()` throughout (some earlier code uses `axios` in `authService.js`)
- **Styling:** inline style objects throughout (no CSS-in-JS library, no Tailwind). A shared `colors` object is redefined per-file (not yet centralized — see Technical Debt).
- **Font:** Kanit (Google Fonts), loaded via `@import` in each screen's `<style>` block
- **Design language:** dark theme (`#222222` background), teal accent (`#5DEBD7`), rounded pill-shaped chips/buttons, a simulated "phone frame" (375×750px container with rounded corners and shadow) wrapping every screen for a native-app feel in the browser

**Directory structure (frontend):**
```
frontend/
  src/
    screens/         → HomeScreen, SearchScreen, MyMusicScreen, RadioScreen,
                        BulletinScreen, LoginScreen, OnboardingScreen
    components/       → FullPlayer, MiniPlayer, QueuePanel, FooterNav, AppHeader,
                        ProfilePanel, SettingsPanel, ArtistPanel, AlbumPanel
    context/           → PlayerContext.jsx, UIContext.jsx
    services/         → authService.js
  App.js               → root component, holds `screen` state, conditionally
                        renders one screen at a time (no router library)
```

### Backend
- **Runtime:** Node.js + Express
- **Database:** PostgreSQL, accessed via the `pg` package with a connection pool
- **Auth:** JWT-based (`jsonwebtoken`), password hashing via `bcrypt`, plus Google OAuth via Passport.js. Tokens stored client-side in AsyncStorage under key `ponytail_token`.
- **File uploads:** `multer` (used for profile picture upload)
- **Static file serving:** Express serves `/audio`, `/covers`, `/uploads`, and `/vinyl` (Discovery card overlay images) directly from the `assets/` directory
- **Dev tooling:** `nodemon` for auto-restart

**Directory structure (backend):**
```
backend/
  src/
    config/           → db.js (pg Pool), passport.js
    controllers/       → authController.js (register, login, getMe)
    middleware/        → authMiddleware.js (requireAuth)
    routes/             → authRoutes.js (the vast majority of API logic lives here —
                        this file has grown large and is a candidate for splitting,
                        see Technical Debt)
  scripts/              → seedTracks.js, listGenres.js, findArtistMismatches.js
  assets/
    dev_seed/
      enriched_db.csv  → Andrew's music metadata export
      mp3/              → real audio files, nested Artist/Album/track.mp3
      covers/           → real cover art, flat files named "Artist - Album.jpg"
      VinylCases/       → overlay images for Discovery card vinyl-case aesthetic
    uploads/            → user-uploaded profile pictures
```

### Database Schema

**Note on schema history:** an early, more elaborate schema (separate `albums`, `tracks`, `artist_profiles`, `follows`, `plays`, `transactions` tables with Stripe Connect fields) was designed at project inception but has **not been the operative schema** for a long time. The actual, currently-in-use schema is simpler and centers on a single denormalized `seed_tracks` table populated from Andrew's CSV. The original schema document may still exist in early commit history but should be treated as superseded/aspirational, not current.

**Current, real schema:**

```sql
-- Core user table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  password_hash TEXT,
  favorite_artists JSONB,        -- set during onboarding (user picks 3 artists)
  profile_picture TEXT,          -- URL, set via /upload-avatar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- The music catalog — one row per track, denormalized (artist/album as text, not FKs)
CREATE TABLE seed_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  genre TEXT,               -- from CSV "Tag 1 (Genre)"
  subgenre TEXT,             -- "Tag 2 (Subgenre)"
  similar_artist TEXT,       -- "Tag 3 (Similar Artist)" — used for recommendation seeding
  mood TEXT,                 -- "Tag 4 (Mood)"
  tag5 TEXT,                 -- "Tag 5"
  song_tag TEXT,
  track_number TEXT,
  year TEXT,
  length_seconds INTEGER,
  last_modified TEXT,
  filename TEXT,              -- raw path from CSV, e.g. "bin/mp3/01 Track.mp3"
  cover TEXT,                 -- raw path from CSV, e.g. "/bin/covers/Artist - Album.jpg"
  popularity INTEGER,
  location TEXT,
  thumb_up INTEGER DEFAULT 0,   -- global like counter (see Section 3)
  thumb_down INTEGER DEFAULT 0, -- global dislike counter
  skips INTEGER DEFAULT 0,
  plays INTEGER DEFAULT 0,
  avg_playtime NUMERIC,
  usertag1 TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(title, artist)
);

-- Per-user permanent listening history — one row per unique track ever played
CREATE TABLE user_play_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  genre TEXT,
  first_played_at TIMESTAMP DEFAULT NOW(),
  last_played_at TIMESTAMP DEFAULT NOW(),
  play_count INTEGER DEFAULT 1,
  UNIQUE(user_id, track_title, artist)   -- upserted, no duplicates, no cap
);

-- Tracks specifically tapped from search results (only recorded once playback starts)
CREATE TABLE user_search_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  genre TEXT,
  selected_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, track_title, artist)
);
```

**Indexes:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_seed_tracks_artist_trgm ON seed_tracks USING GIN (artist gin_trgm_ops);
CREATE INDEX idx_seed_tracks_title_trgm ON seed_tracks USING GIN (title gin_trgm_ops);
CREATE INDEX seed_tracks_artist_idx ON seed_tracks(artist);
CREATE INDEX seed_tracks_genre_idx ON seed_tracks(genre);
CREATE INDEX seed_tracks_search_idx ON seed_tracks USING GIN (to_tsvector('english', title || ' ' || artist));
```

**Known schema gaps (things designed early but never built, or referenced in UI as placeholders):** no `playlists`/`playlist_tracks` tables yet (Section 5), no `follows` table (follower/following counts are hardcoded to 0 in `ProfilePanel`), no per-transaction/tip table yet.

### Key Integrations
- **Andrew's music database:** delivered as a semicolon-delimited CSV (`enriched_db.csv`) plus a password-protected zip of real mp3/cover files (~17,153 tracks, 17,659 rows currently in `seed_tracks` after dedup). Columns: `Track;Title;Artist;Album;Year;Length;Last Modified;Filename;Cover;Tag 1 (Genre);Tag 2 (Subgenre);Tag 3 (Similar Artist);Tag 4 (Mood);Tag 5;Song Tag;Popularity;Location;thumbUp;thumbDown;skips;plays;avgPlaytime;usertag1`. Re-seeding is idempotent (`ON CONFLICT (title, artist) DO UPDATE`) via `scripts/seedTracks.js`.
- **Google OAuth:** via Passport.js, alongside standard email/password auth.
- **No payment processor integrated yet** — tipping is planned but not built (see Roadmap).
- **No dedicated search engine** — using Postgres `pg_trgm` for fuzzy search (see below), consciously chosen as a lower-effort stepping stone in case a real search engine (Meilisearch was discussed) is warranted once Andrew's database work stabilizes.

---

## 3. Core Features Implemented

### Screens
- **LoginScreen** — email/password + Google OAuth
- **OnboardingScreen** — new users pick 3 favorite artists, saved to `users.favorite_artists`
- **HomeScreen** — personalized vertical feed of individual tracks (see below)
- **SearchScreen** — two tabs: **Search** (text search + Recent/Loved rows + genre browsing) and **Discover** (Tinder-style swipe deck)
- **MyMusicScreen** — Recently Played / Suggested For You / New Releases horizontal rows (Purchased section is being removed in favor of a Playlists row — in progress, see Roadmap)
- **RadioScreen**, **BulletinScreen** — built out structurally in earlier sessions; largely static/placeholder content, lowest priority for further work right now

### PlayerContext — Audio System (current state)
Split into **two contexts** for performance:
- `PlayerContext` (`usePlayer()`) — stable state: `currentTrack`, `isPlaying`, `queue`, `queueIndex`, `isPlayerOpen`, `playHistory`, and all action functions (`playTrack`, `playStandaloneTrack`, `togglePlay`, `nextTrack`, `prevTrack`, `seekTo`, `jumpToQueueIndex`, `reorderQueue`, `openPlayer`, `closePlayer`)
- `PlaybackProgressContext` (`usePlaybackProgress()`) — only `progress`, `duration`, `currentTime`, which update many times per second via the shared `<audio>` element's `onTimeUpdate`

**Why split:** originally one context bundled everything, meaning every component consuming `usePlayer()` re-rendered on every audio progress tick (dozens of times/sec during playback), regardless of whether it cared about progress. Splitting means components like `QueuePanel` that only need track/queue data never re-render on progress ticks. Both context values are `useMemo`'d.

**Key playback functions:**
- `playTrack(track, queue, startIndex)` — plays as part of a meaningful queue (e.g. an album)
- `playStandaloneTrack(track)` — plays a single tapped track (search result, loved track, HomeScreen card), then silently builds a real queue behind it via `extendQueue(track, 'append')`, and records both play history and search-selection history
- `extendQueue(lastTrack, mode)` — fetches similar tracks from `/tracks/similar`, deduplicates against the existing queue by `title|artist` key before appending (fixes a duplicate-React-key bug that surfaced during long autoplay sessions), and filters out any track missing `title`/`artist` (data quality guard)
- `ensureQueueDepth` — maintains ~15 upcoming tracks at all times, auto-replenishing via `extendQueue`
- `reorderQueue(fromIndex, toIndex)` — used by the drag-and-drop queue reorder feature; protects the currently-playing track and anything already played from being moved

**Queue reordering UI (`QueuePanel.jsx`):** After an extensive, ultimately-abandoned attempt to hand-build drag-and-drop with manual mouse/touch event tracking (position math, FLIP animation technique, etc. — all of which hit persistent visual snapping bugs), the component was **rebuilt using `@dnd-kit`** (`DndContext` + `SortableContext` + `useSortable`). This was the right call: `@dnd-kit` handles cross-platform (mouse + touch) drag natively and the animation "just worked" once switched over. **Lesson learned and worth remembering:** don't hand-roll complex drag/reorder interactions — reach for a proven library first.

### Search — Fuzzy Matching & pg_trgm
- **`/api/auth/search`** endpoint uses Postgres `pg_trgm` `similarity()` scoring rather than plain `LIKE`, combined with query normalization (lowercase, strip punctuation, collapse whitespace, strip a leading "the ") to handle typos and minor misspellings.
- Deliberately **not** attempting Spotify-level fuzzy coverage — estimated ~70–85% coverage of realistic typo variants with `pg_trgm` + normalization alone. A dedicated search engine (Meilisearch was the leading candidate) was discussed and consciously deferred until Andrew's database work is more settled, since migrating later only requires rewriting the one `/search` endpoint (frontend is decoupled from the search implementation).

### File Resolution — Fuzzy Filesystem Matching
Real audio/cover files often don't match the database's `filename`/`cover` values exactly (encoding issues, punctuation differences, folder-naming inconsistencies like "and" vs "-"). Solved via `resolveCover()` / `resolveAudio()` in `authRoutes.js`:
- At server startup, directory listings for `covers/` and top-level artist folders in `mp3/` are read once and cached as **normalized-name → real-filename maps** (normalization strips all non-alphanumeric characters and common connector words like "and", "feat", "ft", "with", "vs").
- Album-folder and track-file listings within an artist folder are cached **lazily** on first access (avoids the cost of pre-walking all ~17k nested folders at boot).
- `buildTrackUrls(track)` is the shared helper that turns a raw DB row into `{ coverUrl, audioUrl }`, falling back to `dummy.mp3` when no match is found.
- A companion script, `scripts/findArtistMismatches.js`, quantifies how many CSV artist names fail to resolve to a real folder, for reporting data-quality issues back to Andrew.

### Personalization & Recommendations (built this session)
- **`user_play_history`** and **`user_search_selections`** tables (see schema above), populated automatically via `recordPlayHistory`/`recordSearchSelection` inside `PlayerContext`'s `playTrack`/`playStandaloneTrack` — no manual instrumentation needed elsewhere.
- **`/api/auth/albums/discover`** — powers the Discovery swipe tab. Two modes: genre-filtered (user selects up to 5 genre chips in Search, shared as state with Discovery) or, with no genre filter, a personalized fallback weighted toward the user's 3 onboarding `favorite_artists` (weight 2) plus their play-history artists/genres (weight 1), via a `UNION ALL` of two sub-queries. **Important bug fixed:** naive `DISTINCT ON (artist, album)` before randomizing caused severe alphabetical clustering (results always starting with "A"/"1..."); fixed by randomly sampling a large pool first (`ORDER BY RANDOM() LIMIT 500/1000`), then applying `DISTINCT ON` on the already-shuffled sample.
- **`/api/auth/home/feed`** — powers the HomeScreen vertical feed. Loops over the user's *entire* play history, fetches a small batch of similar tracks per history track (via `similar_artist` tag match or genre match), deduplicates across all batches, shuffles, and tags each result with `similarTo` (which history track seeded it, shown on the card). Falls back to favorite artists, then pure random, for users with no history yet.
- **`/api/auth/history/recent`** — powers the "Recent" row on SearchScreen. Unions `user_play_history` and `user_search_selections` by recency timestamp, deduplicates by track identity (keeping only the most recent occurrence), joins back to `seed_tracks` for real cover/audio URLs.
- **Genre browsing:** `MOCK_GENRES` replaced with the real 32-genre catalog from the database (via `scripts/listGenres.js`), ordered by track count (Rock 6304 → Flamenco 11). Multi-select up to 5, shared as state between Search and Discovery tabs.

### Like/Dislike
- Deliberately **global counters**, not per-user preference rows — a product decision to keep scope small for now. Uses the existing `thumb_up`/`thumb_down` columns already present in `seed_tracks` from Andrew's CSV schema (no new columns added).
- `/api/auth/tracks/like` and `/api/auth/tracks/dislike` — simple `COALESCE(col, 0) + 1` increments.
- Frontend (`HomeScreen` `TrackCard`): three-state `reaction` (`null` / `'liked'` / `'disliked'`), with undo support (tapping the active reaction again returns to neutral, purely local state — does **not** decrement the DB counter, a known accepted limitation of the global-counter approach).
- Icons are custom SVGs (thumbs up/down) — **no emoji anywhere in the app**, this is a firm stylistic preference.

### Loved Tracks & Recent Row (SearchScreen)
- **Loved row:** persisted via AsyncStorage (`ponytail_loved` key), capped at 15, newest-first, oldest falls off. Loaded on mount, saved on every change.
- Both Loved and Recent rows use **skeleton loading states** (5 gray circle placeholders reserving the exact layout space) rather than conditionally mounting/unmounting, which was the actual root cause of a stubborn "jolting" navigation bug (async data arriving after mount caused layout reflow — looked like a CSS/animation bug for a long time but was purely a missing-space-reservation issue).
- Staggered `fadeSlideUp` entrance animation (50ms offsets) across Recent → Loved → Genre chips sections.

### UI Overlays / Panels
- **ArtistPanel**, **AlbumPanel** — slide-up detail panels, support unlimited nested navigation (artist → album → artist → …) via a `panelStack` array in `SearchScreen`, each panel's z-index computed from its stack position.
- **QueuePanel** — see PlayerContext section above.
- **ProfilePanel** / **SettingsPanel** — profile picture upload (via multer), stat blocks (Followers/Following hardcoded 0, Playlists count from mock data), taste pills from `favorite_artists`, mock playlist list (see Roadmap — being made real).
- **FullPlayer** / **MiniPlayer** — global playback controls; `MiniPlayer` hidden specifically on the Discovery tab to avoid audio conflicts with Discovery's own auto-playing card audio.

---

## 4. Known Issues & Technical Debt

### Data Quality (music database)
- **Encoding corruption:** some special characters (e.g. curly apostrophes `'`) in the CSV were corrupted during import to a Unicode replacement character (`�`). This is a character-level corruption, not fixable by fuzzy matching alone — requires either fixing at the CSV source or continuing to rely on the alphanumeric-only fuzzy fallback that sidesteps punctuation entirely.
- **Artist/folder name mismatches:** some artist names in the CSV don't map cleanly to real folder names on disk (e.g. connector-word differences like "and" vs "-"). `findArtistMismatches.js` quantifies this; as of last run it was a small percentage but not zero. **Ongoing:** waiting on further corrected data from Andrew for ~57 known problem artists.
- Real mp3/cover files were **not available at all** for a period of development; the app was built to gracefully fall back to `dummy.mp3` / null cover art the whole time, so this never blocked frontend work — worth remembering this pattern (build against the shape of the data before the real files exist).

### Architectural / Code Organization
- **`authRoutes.js` is large and doing a lot** — auth, search, discovery, history, home feed, likes, avatar upload, etc. are all in one file. Worth splitting into multiple route files (`trackRoutes.js`, `historyRoutes.js`, `userRoutes.js`, etc.) as it continues to grow, but not urgent.
- **`colors` object is redefined per-screen/component** rather than imported from a single shared theme file. Low risk today but will cause drift if the palette changes.
- **Global like/dislike is a known simplification** — if a future decision calls for per-user preference tracking (needed for any serious recommendation weighting on liked tracks), this will need a dedicated table (`user_track_reactions` or similar), not a retrofit of the global counters.
- **Original elaborate schema (`albums`, `tracks`, `plays`, `transactions`, `follows`, `artist_profiles` with Stripe Connect fields) was designed early and is not what's actually running.** If revisiting monetization/payments/artist-upload features, decide explicitly whether to resurrect pieces of that original design or design fresh against the current simpler `seed_tracks`-centric schema — don't assume the old schema is still relevant without checking.

### Performance
- `extendQueue` calls `/tracks/similar` once per seed track when building `home/feed` results — fine at current scale (a handful of history tracks per user) but would need batching/optimization if a user's play history grows very large.
- Lazy per-album/per-track directory-listing caches in `resolveAudio` grow unbounded in memory for the life of the server process — acceptable at current catalog size (~17k tracks) but worth revisiting if the catalog grows an order of magnitude.
- No pagination anywhere yet (search results, discover feed, etc. all use hard limits like `LIMIT 10/15/20`).

### UI/UX polish items resolved this session (documented in case they resurface)
- The infamous "jolting on navigation" bug — root cause was **not** CSS/animation, it was async data causing layout reflow after mount. If similar jolting appears elsewhere, check for the same pattern first (missing skeleton/placeholder reserving space) before assuming it's a transition/animation issue.
- Alphabetical clustering in randomized SQL queries — always sample-then-distinct, never distinct-then-sample-with-random-as-a-tiebreaker (`ORDER BY x, RANDOM()` does **not** meaningfully randomize when `x` already produces a unique sort).

---

## 5. Next Steps & Roadmap

### In progress (partially built, needs finishing)
- **MyMusicScreen restructure:** remove the Purchased section (tipping will replace the purchase model entirely — confirmed at a Ponytail meeting), promote a new **Playlists row to the top** of the screen. Currently at the "hardcoded dummy playlists to get the shape right" stage — real playlist CRUD is not built yet.

### Not yet started — clear next priorities
1. **Real playlist functionality** — needs `playlists` and `playlist_tracks` tables (position-ordered), CRUD endpoints, and UI wiring for create/rename/delete/add-track/reorder. `ProfilePanel` already has a mock playlist list UI ready to be wired to real data.
2. **Tipping / artist support** — no payment integration exists yet. This is explicitly the planned replacement for the old "Purchased" music model. Will need a payment processor (Stripe was the original assumption in the early schema) and a `transactions`-equivalent table designed fresh against the current schema.
3. **Followers/following** — currently hardcoded to 0 in `ProfilePanel`. No `follows` table exists in the current schema.
4. **AlbumDetailPanel-equivalent for the Loved section** — mentioned as pending but not detailed further; revisit scope when picked up.
5. **Radio/Bulletin screens** — still largely static/hardcoded; lowest priority, no specific plan yet.
6. **Per-user like/dislike** (if ever needed) — would require a new table; global counters are the deliberate current choice.
7. **Continued data quality passes** as Andrew delivers corrected artist/folder mappings.
8. **Revisit search** (Meilisearch or similar) once the database is more stable — currently intentionally deferred.

### Longer-term / aspirational (from early planning, not actively worked on)
- Artist-side upload/publishing flow (`is_artist` flag, artist profiles) — exists conceptually in the earliest schema draft, not part of the current build.
- Analytics on plays/completion/skip behavior at the `plays`-table level (the current `user_play_history` table is a simpler, per-user-unique-track version of this idea, not the same as the original granular per-play-event table).

---

## 6. Important Decisions & Constraints

### Product/Design Decisions
- **Global engagement counters, not per-user preference tables** for likes/dislikes — deliberate scope-limiting choice.
- **Tipping over purchasing** — confirmed direction from a Ponytail team meeting; Purchased section is being actively removed in favor of this.
- **Onboarding favorite artists (3, fixed) are weighted more heavily than general play history** in personalization algorithms — an explicit, stated priority from the product owner, not an assumption.
- **No emojis anywhere in the UI** — firm stylistic constraint; use custom inline SVG icons instead, matching the existing icon style (stroke-based, teal/muted color scheme).
- **"Search-selected" is a stronger signal than general playback** — deliberately tracked in a separate table (`user_search_selections`) rather than folded into `user_play_history`, since a user searching for and tapping a specific track is a more deliberate act of preference than a track that happened to play next in a queue.

### Coding Conventions
- **Inline style objects** (`style={{...}}`) throughout — no CSS modules, no styled-components, no Tailwind in the React Native/Expo codebase.
- **`'Kanit', sans-serif`** is the consistent font family across every screen.
- Color palette convention (repeated per-file, not centralized): `bg: "#222222"`, `bgCard: "#2a2a2a"`, `teal: "#5DEBD7"`, `tealGlow: "rgba(93,235,215,0.15)"`, `text: "#ffffff"`, `muted: "#666666"`, `border: "rgba(255,255,255,0.07)"`.
- **`fadeSlideUp` keyframe** (`opacity 0→1`, `translateY(16px→0)`) is the standard entrance animation, usually staggered by index (`${index * 0.1}s` delay) for lists of cards/sections.
- Every screen wraps content in a simulated **375×750px phone frame** (`borderRadius: 40px`, drop shadow) centered in the viewport — this is core to the app's visual identity in browser-based testing and should be preserved.
- **Track identity key convention:** `${title}|${artist}` (pipe-delimited) is used consistently across the frontend wherever a unique track key is needed (queue dedup, React `key` props, `currentTrack` comparisons).
- **Auth token AsyncStorage key:** `ponytail_token` (not `token` — this has been a repeated source of bugs when writing new fetch calls, double-check the key name).
- **Backend base URL is hardcoded** as `http://localhost:5000` throughout the frontend (no environment-based config yet) — will need to become an env variable before any real deployment.

### Working-Relationship / Process Notes (useful context for how Joshua likes to work)
- Prefers to **verify things concretely** (curl tests, direct DB queries via `psql`) rather than taking success on faith — this has caught several real bugs (e.g. the alphabetical clustering issue) that "looked fine" on the surface.
- Appreciates **git commit messages with no quotes, backticks, or apostrophes** (a recurring, explicit formatting request), and prefers periodic summarized commit-message requests rather than one after every single change.
- Comfortable with iterative debugging via shared terminal output/error messages — expects direct file/line pointers rather than full-file rewrites when a small aspect of a shared code that already been given is wrong.
- Has directly pushed back on and improved suggested engineering approaches during this project (e.g. correctly questioning why a root-level `App.js` change was proposed to fix a `SearchScreen`-only bug) — treat his pushback as often correct and worth taking seriously, not just accommodating.
