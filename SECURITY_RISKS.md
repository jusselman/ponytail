# Ponytail Security Risk Register

A running list of every known security and privacy risk in Ponytail: what it is, where it lives in the code, how serious it is, and what the fix is. Add new risks as they are found and update the status as they are fixed.

**Current priority:** while Ponytail is an investor demo, fix the risks a person could see or run into while using the app first ("Visible in demo: Yes"). Risks that only matter once real users, real money or a public server are involved stay open here until we come back for them.

**Last updated:** 2026-11-06 (Google sign-in and the session cookie removed)

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
| SR-10 | Login messages could reveal which emails have accounts | No | Low | Fixed |
| SR-11 | Login token stored unencrypted and valid for 7 days with no revocation | No | High | Open |
| SR-12 | Session cookie not ready for production | No | Medium | Fixed (removed) |
| SR-13 | Password hashes loaded by `SELECT * FROM users` | No | Low | Open (one query left) |
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
| SR-31 | Login takes longer for emails that exist | No | Low | Fixed |
| SR-32 | "Continue with Google" leads to a dead page, and puts the login token in the address | — | — | Retired (Google sign-in removed) |
| SR-33 | Emails are case-sensitive: "Josh@" and "josh@" are different accounts | Yes | Medium | Fixed |
| SR-34 | Password sign-in on a Google account gives "Something went wrong" and reveals the account | Yes | Medium | Fixed |
| SR-35 | Usernames were built from the email address and shown publicly | Yes | Medium | Fixed for new accounts |
| SR-36 | No email verification | No | Medium | Open |
| SR-37 | Deleting an account doesn't ask for the password | No | Medium | Open |
| SR-38 | The server doesn't check email format or password length at signup | No | Medium | Open (usernames now checked) |
| SR-39 | Google sign-in has no protection against forged sign-in requests | — | — | Retired (Google sign-in removed) |
| SR-40 | Duplicate-email race returns the wrong message | No | Low | Open |
| SR-41 | No security emails (new sign-in, password changed) | No | Low | Roadmap |
| SR-42 | Usernames were case-sensitive: @Josh and @josh could be different people | Yes | Medium | Fixed |
| SR-43 | Login token carries the email address | No | Low | Open |
| SR-44 | Logging out leaves the music playing, and the next person inherits the queue and recent plays | Yes | Medium | Fixed |
| SR-45 | "Loved" albums and the saved card belong to the device, not the account | Yes | Medium | Fixed |
| SR-46 | Logging out doesn't clear all of the previous account's in-app data | Yes | Low | Fixed |
| SR-47 | A deleted account's login token keeps working | No | Medium | Open |
| SR-48 | An expired or rejected session isn't noticed by the app | No | Low | Open |
| SR-49 | The login token is read from storage in a dozen places | No | Low | Open |
| SR-50 | Token signing: algorithm not pinned, secret not managed | No | Low | Open |
| SR-51 | Two accounts in one browser: signing in on one tab silently switches the other tab's account | Yes | Medium | Fixed |
| SR-52 | A fresh setup is missing login settings, so nobody can sign in, with no clear error | Yes | Medium | Fixed |
| SR-53 | No sign-out after inactivity on a shared device | No | Low | Open |
| SR-54 | Signed-in API responses can be kept in the browser cache | No | Low | Open |
| SR-55 | Unused signup form logs the new user's details to the console | No | Low | Open |
| SR-25 | Listeners can use catalog artist names | Yes | Low | Accepted |
| SR-26 | Usernames made from email get digits added when taken | — | — | Retired (people choose usernames now, SR-35) |
| SR-27 | Email already in use is only reported at the end of signup | Yes | Low | Accepted |
| SR-28 | Claims are approved by a person checking a code | No | Low | Accepted |

---

## Open risks

### SR-09: Rate limiting (fixed, one follow-up)
- **Done:** `backend/src/middleware/rateLimits.js` (`express-rate-limit`). Sign-in, counting failed attempts only, every 15 minutes: 8 per email from one address, 50 per email across all addresses, 20 per address. The per-email-and-address limit is the strict one, so a stranger typing wrong passwords for someone's email can't lock that person out from their own network. Signup: 20 per address per hour. Artist name checks: 60 per 10 minutes. Password changes: 10 per 15 minutes. Per account: claims 10 per hour, uploads 60 per hour (checked before the file is accepted), tips 60 per hour, posts and replies 30 per 10 minutes, messages 30 per minute. Every `/api` route: 600 per minute per address. A limited request gets a 429 with a plain message ("Please try again in 15 minutes"), shown in the in-app notice sheet on login and signup.
- **Follow-up before running more than one server:** counters live in memory, so they reset when the backend restarts and aren't shared between servers. Move them to Redis (`rate-limit-redis`). Behind a hosting proxy, set `TRUST_PROXY` to the number of proxies (usually `1`) so limits see real visitor addresses; only a number is accepted, because `true` would let visitors fake their address.

### SR-10: Login reveals which emails have accounts
- **Fixed 2026-10-31:** see the Fixed table below.
- **What:** in the server code, a wrong email gets "No account found with that email." and a wrong password gets "Incorrect password." Today Passport answers a failed login with a bare 401, so neither message reaches the app, and the login screen shows one message, "Email or password is incorrect." The distinct messages are still a trap: they'd leak the moment someone wires them through to the app.
- **Where:** `backend/src/config/passport.js` (local strategy).
- **Fix:** one message for both in `passport.js`: "Email or password is incorrect." Do it together with SR-31 and SR-34, which share the same code. The signup check for an email already in use stays (see SR-27), and is now rate limited (SR-09).

### SR-11: Login token storage and lifetime
- **What:** the login token is kept in AsyncStorage, which is unencrypted on the phone and becomes `localStorage` on web, so any script running on the page can read it. It lasts 7 days and can't be cancelled: logging out only deletes the app's copy, and neither logging out, changing the password nor deleting the account stops a copied token from working until it expires. It also stays in browser storage after the tab is closed (the app ignores it and always opens on the login screen, but it can still be copied out and used).
- **Why it isn't visible in the demo:** nothing on screen changes; it only matters once someone steals or copies a token.
- **Web vs phone:** `expo-secure-store` covers iOS (Keychain) and Android (Keystore) only; it doesn't work on web, and the demo runs in a browser. On web the safer equivalent is an `httpOnly` cookie, which page scripts can't read (it needs `secure`, `httpOnly` and `sameSite` settings plus CSRF protection; see the note in SR-12).
- **Where:** `frontend/src/services/authService.js` (`ponytail_token`) and the direct reads listed in SR-49; `JWT_EXPIRES_IN=7d` in `backend/.env`; `generateToken` in `controllers/authController.js`; `middleware/authMiddleware.js`.
- **Fix, in steps:**
  1. *Quick interim:* add `users.token_version`, put it in the token, check it in `requireAuth`, and bump it on password change, "log out everywhere" and account deletion. That gives instant revocation without new tables.
  2. *Proper:* short-lived access tokens (about 15 minutes) plus a refresh token stored hashed in a `sessions` table, rotated on every use and deleted on logout, password change or account deletion; reuse of an old refresh token revokes the whole session.
  3. *Storage:* `expo-secure-store` in the native apps, an `httpOnly` cookie on web, all behind one token helper (SR-49).

### SR-12: Session cookie not ready for production
- **Fixed 2026-11-06 by removal:** sessions were only used by Google sign-in, which was removed (SR-32). `express-session`, `cookie-parser` and `passport-google-oauth20` are uninstalled, `passport.session()` and `serializeUser`/`deserializeUser` are gone, `SESSION_SECRET` is no longer needed, and CORS no longer allows credentials. The API sets no cookies at all; sign-in uses the token in the `Authorization` header. If cookies come back later (for example the `httpOnly` login cookie in SR-11), set `secure`, `httpOnly` and `sameSite`, and add CSRF protection.
- **Was:** `express-session` runs with defaults. The cookie isn't marked `secure`, and sessions live in server memory, which loses them on restart and leaks memory over time. Sessions only seem to be needed for the Google sign-in handshake.
- **Where:** `backend/src/index.js`.
- **Fix:** limit sessions to the Google OAuth routes, set `cookie: { secure: true, httpOnly: true, sameSite: 'lax' }` in production, and use a Postgres-backed session store (`connect-pg-simple`).

### SR-13: Password hashes loaded unnecessarily
- **What:** the sign-in check uses `SELECT * FROM users`, which loads `password_hash` along with everything else and passes the whole row on as the signed-in user. Today it isn't sent to the app, but one careless `res.json(user)` would leak it. (The Google strategy and `deserializeUser`, which did the same, were removed with Google sign-in.)
- **Where:** local strategy in `backend/src/config/passport.js`.
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
- **Fixed 2026-10-31:** see the Fixed table below.
- **What:** for an email with no account, login returns immediately; for a real account it first checks the password with bcrypt, which takes a noticeable fraction of a second. Someone measuring response times can tell which emails are registered. Rate limiting slows this down but doesn't remove it.
- **Where:** `backend/src/config/passport.js`.
- **Fix:** when the email isn't found, still run `bcrypt.compare` against a dummy hash so both cases take the same time. Pair with SR-10.

## Email and account risks (item 3 review, 2026-10-31)

The original item 3 (SR-10, different login messages) is not visible today, but the review found the account problems below. SR-32 to SR-35 can be seen or hit while using the app.

### SR-32: Google sign-in is a dead end, and exposes the login token
- **Retired 2026-11-06: Google sign-in removed.** The buttons, the Google strategy, both `/api/auth/google` routes, the Google settings and the `passport-google-oauth20` package are gone; the routes return 404. If the board wants it back, rebuild it after email verification (SR-36) using the notes below, with OAuth `state`/PKCE (old SR-39), a single-use code instead of a token in the address, and the username step for new Google accounts. Accounts created earlier with Google have no password and can't sign in any more (see SR-34).
- **Switched off 2026-10-31:** the three "Continue with Google" buttons are hidden (`GOOGLE_SIGNIN_ENABLED` in `LoginScreen.jsx`), and the server's Google routes answer 404 and the Google strategy isn't loaded unless `GOOGLE_SIGNIN_ENABLED=true` is set in `backend/.env`. Rebuild it together with SR-36, using the fix below, and give Google sign-ups the username step too.
- **What:** "Continue with Google" (three buttons on the login screens) sends people through Google, then back to `http://localhost:19006/auth/google/success?token=...`. The app now runs on port 8081 and nothing handles that address, so the person lands on a browser error page and isn't signed in. The redirect also puts the login token in the address itself, where it's kept in browser history, server logs and anything the page links to.
- **Where:** `GET /api/auth/google/callback` in `backend/src/routes/authRoutes.js`; Google buttons in `frontend/src/screens/LoginScreen.jsx`.
- **Also:** a new Google account takes the start of the email as its username without checking it's free, so if that username exists, sign-in crashes; and that username isn't checked against artist names the way the display name is (SR-04).
- **Fix:** send people back to the running app (address from config, not hard-coded) with the token after `#` rather than `?` (the part after `#` is never sent to servers), have the app read it, store it and clear it from the address bar. Better, before launch: send a single-use code that the app exchanges for a token. For the demo, the alternative is hiding the Google buttons until this is done.

### SR-33: Emails are case-sensitive
- **Fixed 2026-10-31:** see the Fixed table below.
- **What:** emails are stored and compared exactly as typed. Someone who signs up as `Josh@gmail.com` can't sign in as `josh@gmail.com` (they see "Email or password is incorrect"), and `Josh@` and `josh@` can be registered as two separate accounts. Laptop autofill and capitalised first letters make this easy to hit.
- **Where:** `WHERE email = $1` in `config/passport.js` and `controllers/authController.js`; `users.email` has a plain (case-sensitive) unique constraint.
- **Fix:** trim and lowercase emails on signup, sign-in and Google sign-in; a migration that lowercases stored emails and adds a unique index on `lower(email)` (after checking for existing case-duplicates with `SELECT lower(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;`).

### SR-34: Password sign-in on a Google account
- **Fixed 2026-10-31:** see the Fixed table below.
- **Note 2026-11-06:** with Google sign-in removed, any account created through Google has no password and no way to sign in. Find them with `SELECT username, email FROM users WHERE password_hash IS NULL;` and delete them, or give the owner a password once password reset (SR-30) exists.
- **What:** accounts created with Google have no password. Trying to sign in to one with a password crashes the password check (`bcrypt.compare` with no hash), so the server answers 500 and the app shows "Something went wrong". Because only a real Google account produces that error, it also tells an attacker the email is registered, whatever the login messages say.
- **Where:** local strategy in `backend/src/config/passport.js`.
- **Fix:** in one pass with SR-10 and SR-31: treat a missing password like a wrong one; one message, "Email or password is incorrect"; run the same bcrypt check against a dummy hash when the email isn't found or has no password, so every failure takes the same time.

### SR-35: Usernames reveal email addresses
- **Fixed for new accounts 2026-10-31:** both signups now have a "Choose a username" step (`components/UsernameStep.jsx`) with a suggestion (from the artist name for musicians), live checking while typing, and the same rules enforced again at signup: 3 to 30 lower-case letters, digits, `.` and `_`; Ponytail's own words reserved (look-alikes too); not taken, ignoring capitals; not a catalog or Ponytail artist's name, look-alikes included (`services/usernames.js`, `POST /api/auth/check-username`, rate limited). **Still open:** existing accounts keep their email-based usernames. Offer a one-time username change in Edit Profile using the same rules.
- **What:** both signup screens build the @username from the start of the email address (`joshua.smith@gmail.com` becomes `@joshuasmith`), and usernames are shown on profiles, Bulletin posts, search and messages. That publishes half of everyone's email address, which is a privacy leak and gives attackers a head start on guessing emails to try (SR-33, SR-36).
- **Where:** `handleFinishSignup` in `MusicianOnboardingScreen.jsx` and `OnboardingScreen.jsx`; `registerFromEmail` in `services/authService.js`; Google sign-in in `config/passport.js` does the same.
- **Fix:** let people choose a username at signup (a step with a suggestion and a live "available" check), or build it from the artist name for musicians. Run new usernames through the same artist-name check as display names, so nobody can take @radiohead. Existing accounts keep theirs; offer a one-time username change in Edit Profile.

### SR-36: No email verification
- **What:** nothing checks that someone owns the email they sign up with, so people can sign up with addresses that aren't theirs (blocking the real owner from signing up), and a future password reset (SR-30) would send links to unverified addresses. (With Google sign-in this was worse, allowing account pre-hijacking; Google sign-in has been removed, see SR-32.)
- **Where:** `register` in `controllers/authController.js`.
- **Fix:** send a verification link at signup and mark `email_verified`; limit unverified accounts (no tips, uploads or messages); let the real owner of an email reclaim it from an unverified account. Once verification exists, signup can answer "check your inbox" for every email, which also retires SR-27. If Google sign-in returns, only join it to an account whose email is verified.

### SR-37: Deleting an account without the password
- **What:** `DELETE /api/auth/account` only needs a valid login token. Anyone holding a stolen token (SR-11), or using an unlocked laptop, can wipe the account, its playlists and its music.
- **Where:** `DELETE /api/auth/account` in `authRoutes.js`; `frontend/src/components/DeleteAccountModal.jsx`.
- **Fix:** ask for the current password in the delete modal and check it on the server.

### SR-38: Signup details aren't checked by the server
- **What:** the 8-character password minimum and the email format exist only in the app's screens. Calling the API directly can create an account with a one-letter password or a malformed email. bcrypt also silently ignores anything past 72 bytes of a password. (Usernames are now checked on the server, see SR-35.)
- **Where:** `register` in `controllers/authController.js`.
- **Fix:** validate on the server: email format and length, password 8 to 72 bytes (optionally rejecting known breached passwords), and a length cap on display names.

### SR-39: Forged Google sign-in requests
- **Retired 2026-11-06:** Google sign-in was removed (SR-32). Kept here as a requirement if it's ever rebuilt.
- **What:** the Google sign-in flow doesn't use OAuth's `state` check, so a malicious page can complete a Google sign-in for the attacker's own account inside a victim's browser. The victim then uses Ponytail signed in as the attacker, and anything they upload, message or tip lands in the attacker's account.
- **Where:** `GET /api/auth/google` and `/google/callback` in `authRoutes.js`.
- **Fix:** turn on `state` (passport-google-oauth20 supports it) or PKCE, using a short-lived cookie rather than server sessions.

### SR-40: Duplicate-email race
- **What:** if two signups with the same email arrive at the same moment, the database's unique rule catches the second, but the app answers "That name or username is already taken."
- **Where:** `register` in `authController.js` (the `23505` handler).
- **Fix:** read which constraint failed and answer accordingly.

### SR-43: Email inside the login token
- **What:** the login token includes the account's email. A token isn't encrypted, only signed, so anyone who sees one (SR-11, SR-32) can read the email; and if email changes are ever added, old tokens would carry a stale address.
- **Where:** `generateToken` in `controllers/authController.js`; the Google callback in `authRoutes.js`.
- **Fix:** put only the account id in the token and look everything else up on the server. Do it with SR-11.

### SR-41: Security emails
Once Ponytail sends email (SR-36), notify people about a new sign-in, a password change, an email change and account deletion, so a takeover doesn't go unnoticed.

## Session and device risks (item 4 review, 2026-10-31)

The original item 4 is SR-11 above. Reviewing it found three problems that show up when several people use the same laptop, which is what a demo looks like (SR-44 to SR-46), and some quieter ones.

### SR-44: Logging out leaves the previous person's music
- **Fixed 2026-10-31:** see the Fixed table below.
- **What:** the player sits above every screen and nothing resets it on logout. Music keeps playing on the login screen, and the next person who signs in finds the previous person's current track, queue and recent plays in the mini player and full player.
- **Where:** `frontend/src/context/PlayerContext.jsx` (no reset); `endSession` in `components/SettingsPanel.jsx`.
- **Fix:** a `resetPlayer()` in the player context (pause, clear current track, queue and history, close the full player), called from `endSession`.

### SR-45: Loved albums and saved card belong to the device
- **Fixed 2026-10-31:** see the Fixed table below.
- **What:** the Search screen's "Loved" list (`ponytail_loved`) and the tip panel's saved card (`ponytail_saved_card`: brand, last four digits and expiry) are stored on the device under one shared name, not per account, and logging out doesn't clear them. The next person to sign in on that laptop sees the previous person's loved albums, and their tip checkout offers the previous person's card. No full card number is involved, but it's someone else's payment detail and taste on show. "Loved" also never reaches the server, so it doesn't follow a person to another device.
- **Where:** `screens/SearchScreen.jsx` (`ponytail_loved`), `services/paymentService.js` (`SAVED_CARD_KEY`).
- **Fix:** store both under the account (`ponytail_loved:<user id>`, `ponytail_saved_card:<user id>`) and clear the device's copies on logout. With real Stripe, saved cards live in Stripe against the customer and nothing is kept on the device (SR-19). Later, save "Loved" on the server.

### SR-46: Logging out doesn't clear all in-app data
- **Fixed 2026-10-31:** see the Fixed table below.
- **What:** logging out clears the signed-in user and avatar but not the rest of the shared app state: your playlists and uploads lists, an open conversation, a viewed profile or playlist, a pending tip. Most of it is re-fetched when the next person opens those screens, but it can briefly show the previous account's playlists or reopen their panels.
- **Where:** `context/UIContext.jsx`; `endSession` in `components/SettingsPanel.jsx`.
- **Fix:** one `resetSession()` in the UI context that returns every per-account value to its starting state, called from `endSession` alongside SR-44's player reset.

### SR-47: A deleted account's token keeps working
- **What:** `requireAuth` only checks the token's signature and expiry, not that the account still exists. After an account is deleted, its token still passes for up to 7 days; most routes then fail, and some would try to save rows for an account that no longer exists.
- **Where:** `middleware/authMiddleware.js`; `PUT /api/auth/update-profile` checks tokens itself.
- **Fix:** comes with SR-11 step 1: `requireAuth` looks up the account and its `token_version`, so a deleted account (or a revoked token) is refused with 401. Move `update-profile` onto `requireAuth`.

### SR-48: Expired sessions aren't noticed
- **What:** when the server refuses a token (expired after 7 days, revoked once SR-11 exists, or the account deleted), the app doesn't notice: screens just load empty or show generic errors instead of returning to the login screen. Unlikely during a short demo, since every visit starts at login, but it will matter once sessions last across visits.
- **Where:** API calls across `frontend/src` (axios and `fetch`, no shared 401 handling).
- **Fix:** one shared API client that, on a 401 from a signed-in request, ends the session (SR-44/46) and shows a "You've been signed out" notice.

### SR-49: The token is read in a dozen places
- **What:** the token is read straight from AsyncStorage under its key in 11 places (`PlayerContext.jsx`, `SearchScreen.jsx`, `placesService.js`, `authService.js` and others) rather than through one helper, so changing how it's stored (SR-11) means finding every copy.
- **Fix:** use `getToken()` everywhere, ideally inside the shared API client from SR-48. (`accountKey()` in `authService.js` already reads the account through `getToken()`.)

### SR-50: Token signing
- **What:** `jwt.verify` doesn't pin the signing algorithm (the library's defaults are safe today, but pinning removes any doubt), and `JWT_SECRET` is a hand-made value in `.env` with no plan for replacing it.
- **Fix:** `jwt.verify(token, secret, { algorithms: ['HS256'] })`; generate a 64-byte random secret, keep it in the secrets manager (SR-22), and support a previous secret during rotation.

### SR-51: Two accounts in one browser
- **Fixed 2026-11-05:** see the Fixed table below.
- **What:** every tab in a browser shares one stored login token. With Ponytail open in two tabs, signing in as account B in the second tab makes the first tab, which still shows account A, act as B: anything sent, liked or tipped from it goes out as B. Logging out in one tab likewise leaves the other looking signed in while its requests fail. A demo of two accounts messaging each other would run straight into this.
- **Where:** `ponytail_token` in `services/authService.js`; no tab listens for the token changing.
- **Fix:** listen for the browser's `storage` event; when the token changes or disappears in another tab, end this tab's session (SR-44/46) and show "You signed in with a different account in another tab". To demo two accounts side by side, use two browsers or a private window.

### SR-52: Missing login settings on a fresh setup
- **Fixed 2026-11-05:** see the Fixed table below.
- **What:** `backend/.env.example` lists only `PORT`, `DATABASE_URL` and `NODE_ENV`. A laptop set up from it has no `JWT_SECRET`, `JWT_EXPIRES_IN` or `SESSION_SECRET`, so creating a login token throws and every sign-in and signup fails with "Something went wrong on our end", with nothing explaining why.
- **Where:** `backend/.env.example`; `generateToken` in `controllers/authController.js`.
- **Fix:** list every setting in `.env.example` with a placeholder and a comment (`JWT_SECRET`, `JWT_EXPIRES_IN`, `SESSION_SECRET`, `GOOGLE_*`, `GOOGLE_SIGNIN_ENABLED`, `TRUST_PROXY`), and check at startup that the required ones are set (and `JWT_SECRET` is long enough), stopping with a clear message if not.

### SR-53: No sign-out after inactivity
- **What:** a tab left open stays signed in for as long as it's open, so on a shared laptop the next person can use the previous person's account.
- **Fix:** an optional idle timeout (for example 30 minutes without interaction ends the session with a notice), configurable and off during demos. Goes with SR-11 and SR-48.

### SR-54: Browser cache of signed-in responses
- **What:** API responses carry no `Cache-Control` header, so the browser may keep copies of signed-in data (profile, messages, tips) in its cache on a shared machine after logout.
- **Fix:** send `Cache-Control: no-store` on every `/api` response (one middleware in `index.js`).

### SR-55: Debug logging of a new user
- **What:** the unused `SignupScreen` in `LoginScreen.jsx` logs the new user, including the email, to the browser console.
- **Fix:** remove that unused form (the real signups are `OnboardingScreen.jsx` and `MusicianOnboardingScreen.jsx`), or at least the log line.

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
- **SR-26 (retired 2026-10-31): usernames made from email got digits added.** No longer applies: people choose their own username (SR-35), and a taken or artist-matching username is refused with a message instead of being changed silently.
- **SR-27: email already in use is reported at the end of signup.** Checking it earlier would let anyone test which emails have accounts (see SR-10). Signup is now rate limited; once email verification exists (SR-36), signup should answer "check your inbox" for every email instead.
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
| SR-10, SR-31, SR-34 | Sign-in had separate messages for an unknown email and a wrong password, answered faster for unknown emails, and crashed (500, "Something went wrong") for accounts created with Google, each revealing which emails are registered. | Every failed sign-in gets the same 401 and "Email or password is incorrect", and the password check always runs (against a stand-in hash when there's no real one), so all failures take the same time. | `backend/src/config/passport.js` |
| SR-33 | Emails were case-sensitive, so `Josh@gmail.com` couldn't sign in as `josh@gmail.com` and both could be registered. | Emails are trimmed and lowercased on signup, sign-in and Google sign-in; stored emails lowercased; unique index on `lower(email)`. | `backend/src/utils/email.js`, migration `020_email_case.sql` |
| SR-42 | Usernames were case-sensitive, and signup built them from the email as typed, so `@Josh` and `@josh` could be two different people. | New usernames are stored in lower case, every username lookup ignores capitals, and the database refuses a username that differs only by capitals. Existing usernames keep their capitals on screen. | `controllers/authController.js`, `config/passport.js`, username lookups in `authRoutes.js`, `blockController.js`, `messageController.js`; migration `021_username_case.sql` |
| SR-44, SR-45, SR-46 | On a shared laptop, logging out left the music playing and handed the next person the previous person's track, queue, recent plays, Radio stations, loved albums, saved card (brand, last four, expiry), playlists list and open panels. | Logout now runs one end-of-session routine: the player stops and empties (`resetPlayer`), every per-account value in the app resets (`resetSession`), the Radio dial cache is cleared (`context/radioSession.js`), and the token and saved card are removed. Loved albums and the saved card are stored per account (`accountKey` in `authService.js`), so another account on the same device never sees them; loved albums come back when their owner signs in again, while the card is forgotten at logout. Loved lists stored the old, shared way are discarded at the first logout. | `context/PlayerContext.jsx`, `context/UIContext.jsx`, `context/radioSession.js`, `components/SettingsPanel.jsx`, `services/authService.js`, `services/paymentService.js`, `screens/SearchScreen.jsx` |
| SR-51 | Every tab shares one stored login, so signing in as account B in one tab made another tab, still showing account A, act as B; signing out in one tab left others looking signed in. | Each tab listens for the stored login changing in another tab. If a different account signs in, or the login is removed, a signed-in tab ends its own session (player, app state and Radio cleared; the other tab's login left alone) and the login screen explains why. The same account signing in again elsewhere is ignored. Log Out and Delete Account use the same `endSession` routine, now in `UIContext.jsx`. | `context/UIContext.jsx`, `App.js`, `components/SettingsPanel.jsx`, `screens/LoginScreen.jsx`, `accountIdOf` in `services/authService.js` |
| SR-52 | `backend/.env.example` listed only three settings, so a laptop set up from it had no `JWT_SECRET`, `JWT_EXPIRES_IN` or `SESSION_SECRET`, and every sign-in failed with "Something went wrong". | `.env.example` lists every setting with comments and placeholders, and the backend checks them before starting (`JWT_SECRET` at least 32 characters, `JWT_EXPIRES_IN` a valid length of time, Google settings only when Google sign-in is on), stopping with a list of exactly what to fix. | `backend/.env.example`, `backend/src/config/checkEnv.js`, `backend/src/index.js` |
| SR-08 | A reserved name was only rejected at the last signup step, in a browser `alert()`. | The name step checks with the server before moving on and shows an in-app notice sheet. | `POST /api/auth/check-artist-name`, `MusicianOnboardingScreen.jsx`, `components/PonytailNotice.jsx` |

---

## Related UX follow-up (not a security risk)

Fixed 2026-10-31: when the server couldn't be reached, the login screen said "Email or password is incorrect", sending people (or a demo presenter) after a typo instead of a stopped server. Login and both signup screens now say "Couldn't reach Ponytail", and server errors on login say "Something went wrong on our end".

Six browser `alert()` popups remain in `BlockedUsersPanel.jsx`, `ConversationPanel.jsx` and `UserProfilePanel.jsx` (login and signup now use the in-app sheet). They look like desktop dialogs on a phone. Replace them with `PonytailNotice`.
