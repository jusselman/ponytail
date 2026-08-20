import { useState } from "react";

// ─── Colors — matches SettingsPanel.jsx / EditProfilePanel.jsx's palette ───────
const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#bbbbbb",
  muted: "#888888",
  border: "rgba(255,255,255,0.07)",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDown = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}
  >
    <path d="M6 9l6 6 6-6" stroke={colors.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── FAQ content — grouped the same way the source doc is: an intro line, five
// topic sections of question/answer pairs, then a closing contact block. ──
const INTRO = "Ponytail is built by musicians, for musicians. If something feels off, confusing, or just plain broken, tell us — that's how we fix things. This page covers the questions we get most.";

const FAQ_SECTIONS = [
  {
    section: "Getting Started",
    items: [
      {
        q: "How do I make an account?",
        a: "Download the app, tap “Sign Up,” and choose whether you're joining as a listener, a musician, or both (most people end up being both). If you're signing up as a musician, you'll need a valid ID and a way to receive payouts — we'll walk you through that during setup.",
      },
      {
        q: "Is Ponytail free?",
        a: "Listening is free with ads, or ad-free for $6.99/month. Musicians don't pay anything to upload or distribute their music. We make money on subscriptions and take a small cut of streams — around 10%. The rest goes to the person who made the song.",
      },
      {
        q: "Can I use Ponytail on more than one device?",
        a: "Yes. Your library, playlists, and listening settings sync across phone, tablet, and web.",
      },
    ],
  },
  {
    section: "Payments and Payouts",
    items: [
      {
        q: "How much do musicians actually get paid?",
        a: "About 90% of what a stream or sale generates goes directly to the musician. We think that's how it should work — you made the thing, you should get paid for it.",
      },
      {
        q: "When do payouts happen?",
        a: "Payouts go out monthly, as long as you've hit the $10 minimum. If you haven't hit it yet, it rolls over to the next month automatically.",
      },
      {
        q: "Where does my money actually come from?",
        a: "Subscription revenue gets split based on what you personally listened to, not lumped into one big pool and divided by total plays across the platform. If you streamed an artist 40 times this month, more of your subscription goes to them specifically. We think this is fairer than the industry standard, and it's one of the things we built Ponytail to fix.",
      },
      {
        q: "Why does my payout look different from last month?",
        a: "A few things move the number: total listening hours, subscriber count, and how many of your streams came from paid vs. ad-supported listeners. Check your Earnings dashboard for a full breakdown — we don't hide the math.",
      },
    ],
  },
  {
    section: "Your Algorithm, Your Rules",
    items: [
      {
        q: "What does it mean that I control my algorithm?",
        a: "Most streaming apps decide what you hear next based on what keeps you scrolling. We flipped that. In Settings > Discovery, you can adjust how much weight goes to new artists, genres you already love, friends' listening activity, and pure randomness. You can also turn off algorithmic recommendations entirely and build your own queue by hand.",
      },
      {
        q: "Why can't I find a song I know is on Ponytail?",
        a: "Try checking your Discovery settings — if you've turned down “new music” weighting, some tracks may be filtered out of search suggestions (though direct search should still find them). If it's still missing, search for the artist's page directly.",
      },
      {
        q: "How do I reset my algorithm settings back to default?",
        a: "Settings > Discovery > Reset to Default. This won't affect your saved playlists or library.",
      },
    ],
  },
  {
    section: "Uploading Music (For Musicians)",
    items: [
      {
        q: "How do I upload a track?",
        a: "Musician Dashboard > Upload. You'll need the audio file, cover art, and basic metadata (title, genre, release date). Uploads usually go live within a few hours.",
      },
      {
        q: "Do I keep the rights to my music?",
        a: "Yes, completely. Ponytail is a distribution platform, not a label. You own your masters, your publishing, all of it.",
      },
      {
        q: "Can I remove a track after uploading it?",
        a: "Yes, anytime, from the Musician Dashboard. Removal is instant, though it can take a day or two to fully clear from listeners' cached libraries.",
      },
    ],
  },
  {
    section: "Account and Privacy",
    items: [
      {
        q: "How do I change my email or password?",
        a: "Settings > Account.",
      },
      {
        q: "How do I delete my account?",
        a: "Settings > Account > Delete Account. This is permanent — your listening history, playlists, and (if you're a musician) uploaded tracks will be removed. If you're a musician with pending payouts, those get paid out first.",
      },
      {
        q: "Does Ponytail sell my data?",
        a: "No. We use your listening data to run your personal algorithm settings and calculate musician payouts. That's it.",
      },
    ],
  },
];

// ─── One collapsible question/answer row — collapsed by default, since five
// sections of open text would otherwise make this page unnavigable. Tapping
// the question toggles just that row. ──
const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${colors.border}` }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
          padding: "14px 4px", cursor: "pointer",
        }}
      >
        <div style={{
          fontSize: "14px", fontWeight: "600", color: colors.text,
          fontFamily: "'Kanit', sans-serif", lineHeight: 1.4,
        }}>
          {q}
        </div>
        <ChevronDown open={open} />
      </div>
      {open && (
        <div style={{
          fontSize: "13px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif",
          lineHeight: 1.6, padding: "0 4px 16px",
        }}>
          {a}
        </div>
      )}
    </div>
  );
};

// ─── Help Center Panel — slides in over the settings list, same nested-panel
// pattern as EditProfilePanel/ChangePasswordPanel. Structured as a standard
// grouped FAQ/accordion (industry-standard for a help center) rather than a
// bottom sheet, since this is reference content someone might revisit and
// scroll through at length, not a one-off confirmation. ──
export default function HelpCenterPanel({ isOpen, onClose }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 5,
      backgroundColor: colors.bg,
      transform: isOpen ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
      display: "flex", flexDirection: "column",
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Header */}
      <div style={{
        padding: "48px 20px 16px",
        borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: "12px",
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
        >
          <ChevronLeft />
        </button>
        <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px" }}>
          Help Center
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
        <div style={{
          fontSize: "16px", fontWeight: "700", color: colors.text,
          fontFamily: "'Kanit', sans-serif", marginBottom: "10px", letterSpacing: "-0.2px",
        }}>
          Ponytail Help Center
        </div>
        <div style={{
          fontSize: "13px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif",
          lineHeight: 1.6, marginBottom: "26px",
        }}>
          {INTRO}
        </div>

        {FAQ_SECTIONS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: "22px" }}>
            <div style={{
              fontSize: "11px", fontWeight: "600", color: colors.teal,
              fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px",
              textTransform: "uppercase", marginBottom: "4px",
            }}>
              {group.section}
            </div>
            {group.items.map((item, ii) => (
              <FAQItem key={ii} q={item.q} a={item.a} />
            ))}
          </div>
        ))}

        {/* Still Stuck? — closing contact block, styled as a card rather than
        another accordion row since it's a call to action, not a Q&A. */}
        <div style={{
          backgroundColor: colors.bgCard, borderRadius: "14px",
          padding: "18px", marginBottom: "24px",
        }}>
          <div style={{
            fontSize: "14px", fontWeight: "700", color: colors.text,
            fontFamily: "'Kanit', sans-serif", marginBottom: "8px",
          }}>
            Still Stuck?
          </div>
          <div style={{
            fontSize: "13px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif",
            lineHeight: 1.6, marginBottom: "12px",
          }}>
            Message us at{" "}
            <a
              href="mailto:support@ponytail.app"
              style={{ color: colors.teal, textDecoration: "none", fontWeight: "600" }}
            >
              support@ponytail.app
            </a>
            {" "}or use the in-app chat (Settings &gt; Contact Support). We're a small team, but we read everything, and if enough people flag the same problem, it jumps the queue.
          </div>
        </div>
      </div>
    </div>
  );
}
