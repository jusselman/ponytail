# Ponytail Security Risk Register

A running list of every known security and privacy risk in Ponytail: what it is, where it lives in the code, how serious it is, and what the fix is. Add new risks as they are found and update the status as they are fixed.

**Current priority:** while Ponytail is an investor demo, fix the risks a person could see or run into while using the app first ("Visible in demo: Yes"). Risks that only matter once real users, real money or a public server are involved stay open here until we come back for them.

**Last updated:** 2026-10-30 (rate limiting added)

## How to read this

| Field | Meaning |
| --- | --- |
| **Visible in demo** | **Yes**: someone using the app could see it or trip over it. **No**: it only matters with real users, real money or a public server. |
| **Severity** | **High**: money, accounts or private data could be taken or exposed. **Medium**: trust, privacy or availability harm. **Low**: hardening or tidy-up. |
| **Status** | **Fixed**, **Open**, **Accepted** (a deliberate trade-off) or **Roadmap** (a pre-launch or post-launch project). |

## Summary

| ID | Risk | Visible in demo | Severity | Status |
| --- | --- | --- | --- | --- |
| SR-01 | Uploads could be disguised web pages | No | High | Fixed |
| SR-02 | Upload deletes could reach outside the uploads folder | No | Medium | Fixed |
| SR-03 | Error pages leaked stack traces and server paths | No | Medium | Fixed |
| SR-04 | Anyone could register under a real artist's name | Yes | High | Fixed |
| SR-05 | Held tips paid to whoever picked the matching name | No | High | Fixed |
| SR-06 | A track upload could overwrite another artist's track | No | High | Fixed |
| SR-07 | Bulletin showed a verified badge for every artist account | Yes | Medium | Fixed |
| SR-08 | Reserved names only caught at the end of signup, in a browser alert | Yes | Low | Fixed |
| SR-09 | No rate limiting on login, signup, claims or uploads | No | High | Fixed (shared store before scaling) |
| SR-10 | Login messages could reveal which emails have accounts | No | Low | Open |
| SR-11 | Login token stored unencrypted and valid for 7 days with no revocation | No | High | Open |
| SR-12 | Session cookie not ready for production | No | Medium | Open |
| SR-13 | Password hashes loaded by `SELECT * FROM users` | No | Low | Open |
| SR-14 | Deleting an account leaves the artist's music and files online | Yes | High | Open |
| SR-15 | Uploaded photos keep hidden metadata, possibly GPS location | No | Medium | Open |
| SR-16 | Rejected uploads stay on disk; no storage limits | No | Medium | Open |
| SR-17 | Uploaded music can be downloaded by anyone with the link | No | Medium | Roadmap |
| SR-18 | Server addresses hard-coded as `http://localhost:5000`; no HTTPS | No | Medium | Roadmap |
| SR-19 | Payments are mocked; the real Stripe integration has its own requirements | No | High | Roadmap |
| SR-20 | Payouts to artists need identity checks | No | High | Roadmap |
| SR-21 | No takedown process for stolen music | No | Medium | Roadmap |
| SR-22 | Database and secrets not set up for production | No | High | Roadmap |
| SR-23 | Legal and app store requirements for user data | No | Medium | Roadmap |
| SR-24 | No dependency scanning, monitoring or incident plan | No | Medium | Roadmap |
| SR-29 | Signed-out search and catalog routes run heavy queries with only the flood guard | No | Medium | Open |
| SR-30 | Password reset not built yet; a real reset flow needs its own protections | No | Medium | Open |
| SR-31 | Login takes longer for emails that exist | No | Low | Open |
| SR-25 | Listeners can use catalog artist names | Yes | Low | Accepted |
| SR-26 | Usernames made from email get digits added when taken | Yes | Low | Accepted |
| SR-27 | Email already in use is only reported at the end of signup | Yes | Low | Accepted |
| SR-28 | Claims are approved by a person checking a code | No | Low | Accepted |

---

## Open risks

### SR-09: Rate limiting (fixed, one follow-up)
- **Done:** `backend/src/middleware/rateLimits.js` (`express-rate-limit`). Sign-in, counting failed attempts only, every 15 minutes: 8 per email from one address, 50 per email across all addresses, 20 per address. The per-email-and-address limit is the strict one, so a stranger typing wrong passwords for someone's email can't lock that person out from their own network. Signup: 20 per address per hour. Artist name checks: 60 per 10 minutes. Password changes: 10 per 15 minutes. Per account: claims 10 per hour, uploads 60 per hour (checked before the file is accepted), tips 60 per hour, posts and replies 30 per 10 minutes, messages 30 per minute. Every `/api` route: 600 per minute per address. A limited request gets a 429 with a plain message ("Please try again in 15 minutes"), shown in the in-app notice sheet on login and signup.
- **Follow-up before running more than one server:** counters live in memory, so they reset when the backend restarts and aren't shared between servers. Move them to Redis (`rate-limit-redis`). Behind a hosting proxy, set `TRUST_PROXY` to the number of proxies (usually `1`) so limits see real visitor addresses; only a number is accepted, because `true` would let visitors fake their address.

### SR-10: Login reveals which emails have accounts
- **What:** in the server code, a wrong email gets "No account found with that email." and a wrong password gets "Incorrect password." Today Passport answers a failed login with a bare 401, so neither message reaches the app, and the login screen shows one message, "Email or password is incorrect." The distinct messages are still a trap: they'd leak the moment someone wires them through to the app.
- **Where:** `backend/src/config/passport.js` (local strategy).
- **Fix:** one message for both in `passport.js`: "Email or password is incorrect." The signup check for an email already in use stays (see SR-27), and is now rate limited (SR-09).

### SR-11: Login token storage and lifetime
- **What:** the login token is kept in AsyncStorage, which is unencrypted on the phone and becomes `localStorage` on web, so any script running on the page can read it. It lasts 7 days and can't be cancelled; logging out or changing the password doesn't invalidate a stolen token.
- **Where:** `frontend/src/services/authService.js` (`ponytail_token`), plus direct reads in `PlayerContext.jsx`, `SearchScreen.jsx` and `placesService.js`; `JWT_EXPIRES_IN=7d` in `backend/.env`.
- **Fix:** on iOS and Android, store the token with `expo-secure-store` (Keychain / Keystore), and read it in one place only. Switch to short-lived access tokens (about 15 minutes) plus a refresh token stored in the database that can be revoked on logout, password change or account deletion.

### SR-12: Session cookie not ready for production
- **What:** `express-session` runs with defaults. The cookie isn't marked `secure`, and sessions live in server memory, which loses them on restart and leaks memory over time. Sessions only seem to be needed for the Google sign-in handshake.
- **Where:** `backend/src/index.js`.
- **Fix:** limit sessions to the Google OAuth routes, set `cookie: { secure: true, httpOnly: true, sameSite: 'lax' }` in production, and use a Postgres-backed session store (`connect-pg-simple`).

### SR-13: Password hashes loaded unnecessarily
- **What:** three queries use `SELECT * FROM users`, which loads `password_hash` along with everything else. Today it isn't sent to the app, but one careless `res.json(user)` would leak it.
- **Where:** `backend/src/config/passport.js` (local and Google strategies, `deserializeUser`).
- **Fix:** select only the columns each query needs, and load `password_hash` only in the password check.

### SR-14: Deleting an account leaves the artist's music online
- **What:** when an artist deletes their account, their uploaded tracks stay public, because the database only clears the owner (`ON DELETE SET NULL` on `seed_tracks.uploader_user_id`). Their audio, covers, playlist covers and Bulletin photos also stay on disk, downloadable by anyone with the link. That breaks the promise that artists own their work, and conflicts with privacy laws (CCPA, GDPR) and app store rules on account deletion.
- **Where:** `DELETE /api/auth/account` in `backend/src/routes/authRoutes.js` (only the avatar file is removed); migration `006_seed_tracks_uploads.sql`.
- **Fix:** in the same transaction, delete the user's uploaded `seed_tracks` rows, then remove every file the account owns (track audio and covers, playlist covers, post photos, avatar). Decide what happens to tips the artist received and to other users' playlists that include those tracks.

### SR-15: Hidden photo metadata
- **What:** photos are saved exactly as uploaded. Phone photos usually carry EXIF metadata such as camera model, date and often GPS location, so a Bulletin photo taken at home could reveal a home address. Two of the JPGs already in `assets/uploads` contain EXIF data (without GPS).
- **Where:** all image uploads (avatar, playlist cover, track cover, Bulletin photo); `backend/src/utils/uploads.js`.
- **Fix:** after `verifyUploads`, re-encode every image with `sharp`. That strips metadata, fixes rotation, caps dimensions, and removes anything hidden inside a file that only pretends to be an image. Run a one-off script over the existing uploads.

### SR-16: Rejected uploads stay on disk; no storage limits
- **What:** the track upload saves the file (up to 25MB) before checking that the account is an artist, and the file isn't deleted when the request is refused (not an artist, missing title). Someone could fill the server's disk with repeated attempts. There is also no per-account storage limit, and the multer setups don't cap the number of form fields.
- **Where:** `POST /api/auth/tracks/upload` and `PUT /api/auth/tracks/:id` in `authRoutes.js`; `playlistRoutes.js` and `bulletinRoutes.js`.
- **Fix:** check permission before multer runs; delete any saved file whenever a request ends without success (one shared helper); add per-account storage limits and multer `fields`/`files` limits; rate limit uploads (SR-09).

### SR-29: Heavy signed-out routes
- **What:** search (`GET /api/auth/search`) and the catalog routes (`/artists/detail`, `/albums/detail`, `/tracks/similar`, `/artists/search`, `/tracks/random` and others) need no account and run fuzzy (trigram) searches across the catalog. They're covered only by the 600-a-minute flood guard, which is enough to keep the database very busy, and search doesn't cap the length of the text it searches for.
- **Where:** `backend/src/routes/authRoutes.js`.
- **Fix:** a search limiter (around 120 a minute per address), a 100-character cap on search text, and before launch a database statement timeout so no single query can run long.

### SR-30: Password reset
- **What:** password reset isn't built. The "Forgot password?" button on the login screen now opens a notice saying reset is coming soon and the team can help in the meantime. When reset is built it becomes a target: it can be used to spam someone's inbox, to test which emails have accounts, or to guess reset codes.
- **Where:** `frontend/src/screens/LoginScreen.jsx`; no backend route yet.
- **Fix:** always answer "If that email has an account, we've sent a link" whether or not it exists; strict limits per email and per address; single-use reset links that expire within an hour, stored hashed; sign out other sessions after a reset (needs SR-11).

### SR-31: Login timing
- **What:** for an email with no account, login returns immediately; for a real account it first checks the password with bcrypt, which takes a noticeable fraction of a second. Someone measuring response times can tell which emails are registered. Rate limiting slows this down but doesn't remove it.
- **Where:** `backend/src/config/passport.js`.
- **Fix:** when the email isn't found, still run `bcrypt.compare` against a dummy hash so both cases take the same time. Pair with SR-10.

---

## Roadmap (before or soon after public launch)

### SR-17: Music can be downloaded by anyone with the link
Everything in `/uploads` is public, so any listener can save an artist's audio file. Move uploads to object storage (S3 or Cloudflare R2) behind a CDN, serve audio through signed links that expire after a few minutes, and consider streaming formats (HLS) that are harder to rip.

### SR-18: Hard-coded server addresses, no HTTPS
Upload URLs saved in the database (`http://localhost:5000/uploads/...`) and the frontend's `API_URL` are hard-coded, and CORS only allows localhost. In production every connection must use HTTPS. Store relative paths in the database, read server addresses from environment config, and set CORS origins per environment.

### SR-19: Real payments
Payments are mocked (`frontend/src/services/paymentService.js`). The current design is sound: the full card number never reaches the server. With real Stripe:
- use Stripe's own card input (PaymentSheet on mobile, Elements on web) so card details never pass through Ponytail's code, keeping PCI scope at SAQ A;
- create PaymentIntents on the server;
- set `payment_status` only from Stripe webhooks, and verify every webhook signature;
- never trust amounts or recipients sent by the app (already the case in `tipController.js`).

### SR-20: Artist payouts
Use Stripe Connect so Stripe handles identity checks, bank details and tax forms. Ponytail stores none of them. Release a payout only to a verified artist (SR-05), and check that the identity on the Stripe account matches the artist.

### SR-21: Stolen music and takedowns
Someone could upload a real artist's songs under a made-up name and pass every name check. Add a "Report this track" button and a takedown process, register a DMCA designated agent with the U.S. Copyright Office (required for safe harbor), and later add audio fingerprinting (ACRCloud or Audible Magic) to match uploads against known recordings.

### SR-22: Database and secrets in production
Use managed Postgres (RDS, Supabase or Neon) with encryption at rest, automatic backups and a database user with only the permissions the app needs. Keep secrets in a secrets manager, not `.env` files on servers (`.env` is already gitignored and has never been committed). Treat location data (Places) and direct messages as the most sensitive data Ponytail holds.

### SR-23: Legal and app store requirements
Before launch: a privacy policy and terms of service, in-app account deletion that really deletes (SR-14, required by Apple), data export and deletion requests for CCPA (and GDPR for an EU launch), and a 13+ age gate for COPPA.

### SR-24: Monitoring and response
Turn on Dependabot or `npm audit` in CI, keep personal data out of logs, add error monitoring, write a short incident-response plan, and get a third-party penetration test before public launch. SOC 2 can wait until partners ask for it.

---

## Accepted trade-offs

- **SR-25: listeners can use catalog artist names.** The catalog contains common names ("Bob", "Sam"), so reserving them for listeners would block ordinary users. Listeners never get a badge or artist money. Listeners still can't use the name of an artist account on Ponytail.
- **SR-26: usernames made from email get digits added.** The signup screens build the username from the email address. If it's taken or matches an artist's name, signup retries once with three digits added (`@radiohead` becomes `@radiohead482`). The display name and the verified badge remain what identify an artist.
- **SR-27: email already in use is reported at the end of signup.** Checking it earlier would let anyone test which emails have accounts (see SR-10).
- **SR-28: claims are approved by a person.** A team member confirms the claim's code on the artist's own page using `backend/scripts/reviewClaims.js`. That's fine at MVP scale; Stripe identity checks (SR-20) add a second gate once payouts are real.

---

## Fixed

| ID | What was wrong | What changed | Where |
| --- | --- | --- | --- |
| SR-01 | The server trusted the file type and filename the uploader sent, so an `.html` file labelled as an image would be served as a web page on Ponytail's own domain. | The server reads each file's first bytes and accepts it only if they are an allowed image or audio format of the kind claimed, then names the file by what it really is (so a PNG renamed to .jpg still works). Anything else is deleted. `/uploads` serves only image and audio extensions, with headers that block scripts. | `backend/src/utils/uploads.js`, all upload routes, `index.js` |
| SR-02 | Deleting an old upload built a file path from a URL, so a crafted URL with `../` could point outside the uploads folder. | Paths are reduced to a bare filename inside the uploads folder. | `uploadPathFromUrl` in `uploads.js` |
| SR-03 | A rejected upload returned the full stack trace and server file paths. | A final error handler returns short messages and logs details on the server only. | `backend/src/index.js` |
| SR-04 | Artist names weren't unique or reserved, so anyone could sign up as "Radiohead". | Names are compared by a match key that ignores case, accents, spacing, punctuation and look-alike characters. Catalog artist names are reserved, artist names are unique, verified names are locked, and artists claim their catalog profile through a reviewed claim. | migration `019_artist_identity.sql`, `services/artistIdentity.js`, `controllers/claimController.js`, `scripts/reviewClaims.js` |
| SR-05 | Tips held for catalog artists went to any artist account whose name matched, collected the next time it opened its Tips list. | Held tips are released only when a claim is approved; catalog-track tips go only to the verified account. | `controllers/tipController.js`, `scripts/reviewClaims.js` |
| SR-06 | Uploading a track with the same title and artist name replaced the existing track's audio. | A re-upload only overwrites the same musician's own earlier upload; otherwise it returns "already exists". | `POST /api/auth/tracks/upload` |
| SR-07 | Bulletin showed a verified checkmark next to every artist account, handing impostors credibility. | The badge follows `artist_verified` only. | `components/bulletin/shared.jsx`, `PostThreadSheet.jsx` |
| SR-08 | A reserved name was only rejected at the last signup step, in a browser `alert()`. | The name step checks with the server before moving on and shows an in-app notice sheet. | `POST /api/auth/check-artist-name`, `MusicianOnboardingScreen.jsx`, `components/PonytailNotice.jsx` |

---

## Related UX follow-up (not a security risk)

Six browser `alert()` popups remain in `BlockedUsersPanel.jsx`, `ConversationPanel.jsx` and `UserProfilePanel.jsx` (login and signup now use the in-app sheet). They look like desktop dialogs on a phone. Replace them with `PonytailNotice`.
