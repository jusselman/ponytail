# Ponytail 𓃗

**Ponytail** is a modern, artist-first music platform built for independent musicians to showcase, stream, and monetize their work directly with fans — without gatekeepers or unfair royalty splits.

Unlike mainstream services, Ponytail prioritizes creator control, fair payouts, deep fan-artist connections, and real discovery tools tailored to indie creators.

## Why Ponytail?

Independent artists deserve better:
- Upload and stream your music with full ownership
- Receive direct tips, pay-what-you-want downloads, and future subscriptions
- Build real relationships through follows, playlists, and play analytics
- Keep the majority of earnings (platform takes only a small, transparent cut via Stripe Connect)
- No algorithmic suppression — fans discover you through tags, genres, follows, and curated browsing

This is the backend foundation for a cross-platform app (web + mobile via React Native planned) that puts power back in the hands of creators.

## Core Features (Planned & In Progress)

- **Artist Profiles** — bio, avatar, genre tags, location, links, monthly listeners
- **Music Catalog** — albums, singles/EPs, track uploads with HLS adaptive streaming support
- **Streaming** — secure, high-quality playback with waveforms and play tracking
- **Playlists** — user-created, ordered, public/private
- **Discovery** — follows, trending by plays, genre browsing
- **Direct Monetization** — tips, paid downloads, future subscriptions via Stripe Connect
- **Analytics** — detailed play counts, listener history, transaction audit trail
- **Relational Integrity** — ACID-compliant PostgreSQL for financial & catalog data

## Tech Stack

| Layer          | Technology                          | Why? |
|----------------|-------------------------------------|------|
| Backend       | Node.js + Express                  | Fast, familiar, great ecosystem |
| Database      | PostgreSQL                         | Strong relational model, ACID transactions (critical for payments), excellent joins for discovery & analytics |
| Auth          | (Next: Auth0 / Supabase Auth)      | Secure social/email login, artist onboarding |
| Payments      | Stripe Connect (Express accounts)  | Marketplace payouts, tips, compliance |
| Storage/CDN   | AWS S3 + Cloudflare (planned)      | Reliable, fast global delivery for audio files |
| Streaming     | HLS via FFmpeg encoding pipeline   | Adaptive bitrate, mobile-friendly |
| Frontend      | (Planned: React Native + Expo)     | Single codebase for web + iOS + Android |

## Current Status

- Fully scaffolded backend (Express server running)
- PostgreSQL database created with complete schema (9 tables + indexes)
- Database connection pool & health endpoint
- Environment config & .gitignore best practices
- 🔜 Authentication & user registration
- 🔜 Artist upload endpoint & FFmpeg encoding trigger
- 🔜 Stripe Connect onboarding flow

The foundation is production-ready and scalable — ready to layer on features starting with auth and uploads.

## Getting Started (Local Development)

### Prerequisites

- Node.js ≥18
- PostgreSQL (installed & running)
- Git

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/yourusername/ponytail.git
   cd ponytail
