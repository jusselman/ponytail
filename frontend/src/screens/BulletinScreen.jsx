import { useState, useEffect } from "react";
import { getMe } from '../services/authService';
import AppHeader from '../components/AppHeader';
import MiniPlayer from '../components/MiniPlayer';
import FooterNav from '../components/FooterNav';
import FullPlayer from '../components/FullPlayer';
import ProfilePanel from '../components/ProfilePanel';
import PublicPlaylistPanel from '../components/PublicPlaylistPanel';
import { usePlayer } from '../context/PlayerContext';

// ─── Colors ───────────────────────────────────────────────────────────────────
const colors = {
  bg: "#222222",
  bgDeep: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  gold: "#f5cf00",
  goldGlow: "rgba(245,207,0,0.15)",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const UPCOMING_CONCERTS = [
  { id: "c1", artist: "Nola Voss", venue: "The Fillmore", location: "San Francisco, CA", date: "Jun 14", distance: "2.1 mi", genre: "Ambient", hue: 180 },
  { id: "c2", artist: "Callow Kings", venue: "Bottom of the Hill", location: "San Francisco, CA", date: "Jun 19", distance: "3.4 mi", genre: "Post-Rock", hue: 340 },
  { id: "c3", artist: "Dusk Relay", venue: "Fox Theater", location: "Oakland, CA", date: "Jun 22", distance: "8.7 mi", genre: "Electronic", hue: 220 },
];

const PRESS_RELEASES = [
  { id: "p1", artist: "Margot Veil", title: "New album 'Cartography of Silence' out July 4th", excerpt: "After three years away from the studio, Margot Veil returns with her most ambitious record to date.", date: "2 days ago", hue: 170 },
  { id: "p2", artist: "The Pelican Stairs", title: "Signing with independent label Tide Pool Records", excerpt: "The band announces a new partnership that will fund their upcoming west coast tour and vinyl pressing.", date: "5 days ago", hue: 30 },
  { id: "p3", artist: "Sable Junction", title: "Limited edition live session EP available now", excerpt: "Recorded in one take at a warehouse in SoMa, this 4-track EP captures the band at their most raw.", date: "1 week ago", hue: 120 },
];

const NEW_ALBUMS = [
  { id: "a1", artist: "Neon Parish", album: "Glass & Copper", tracks: 10, released: "Today", hue: 280 },
  { id: "a2", artist: "Kaare Norge", album: "Fjord Sessions Vol. 2", tracks: 8, released: "3 days ago", hue: 200 },
  { id: "a3", artist: "Petteri Sariola", album: "Open Strings", tracks: 12, released: "1 week ago", hue: 60 },
];

const CROWDFUNDING = [
  { id: "f1", artist: "Margot Veil", project: "Vinyl pressing of 'Cartography of Silence'", goal: 4000, raised: 2840, backers: 94, daysLeft: 12, hue: 170 },
  { id: "f2", artist: "Callow Kings", project: "West Coast tour van fund", goal: 8000, raised: 6120, backers: 203, daysLeft: 5, hue: 340 },
  { id: "f3", artist: "Dusk Relay", project: "Studio time for debut LP", goal: 6000, raised: 1200, backers: 41, daysLeft: 28, hue: 220 },
];

const EVENTS = [
  { id: "e1", title: "Ponytail Listening Party", artist: "Various Artists", type: "Virtual Event", date: "Jun 15 · 8PM PST", attendees: 312 },
  { id: "e2", title: "Open Mic Night", artist: "Hosted by Nola Voss", type: "Live Stream", date: "Jun 17 · 7PM PST", attendees: 89 },
  { id: "e3", title: "Album Release Party", artist: "Neon Parish", type: "In Person + Stream", date: "Jun 20 · 9PM PST", attendees: 156 },
];

const CLASSIFIEDS = [
  { id: "cl1", title: "Drummer needed for indie rock band", poster: "The Pelican Stairs", location: "San Francisco, CA", tags: ["Drummer", "Indie Rock", "Touring"], hue: 30 },
  { id: "cl2", title: "Producer seeking vocalist for EP", poster: "Dusk Relay", location: "Oakland, CA", tags: ["Vocalist", "Electronic", "Studio"], hue: 220 },
  { id: "cl3", title: "Rehearsal space available weekends", poster: "SoMa Studios", location: "SoMa, SF", tags: ["Space", "Rehearsal", "$15/hr"], hue: 160 },
];

const GEAR_MERCH = [
  { id: "g1", title: "Fender Telecaster 2019 — Sunburst", seller: "Callow Kings", price: "$680", condition: "Excellent", type: "Gear", hue: 340 },
  { id: "g2", title: "'Glass & Copper' Tee — Limited Run", seller: "Neon Parish", price: "$32", condition: "New", type: "Merch", hue: 280 },
  { id: "g3", title: "Rode NT1 Condenser Mic + shock mount", seller: "Sable Junction", price: "$180", condition: "Good", type: "Gear", hue: 120 },
  { id: "g4", title: "Embroidered Ponytail Logo Cap", seller: "Ponytail", price: "$28", condition: "New", type: "Merch", hue: 180 },
];

// ─── Shared Components ────────────────────────────────────────────────────────

const SectionHeader = ({ title, subtitle, index = 0 }) => (
  <div style={{
    marginBottom: "14px",
    animation: `fadeSlideUp 0.4s ease ${index * 0.08}s forwards`,
    opacity: 0,
  }}>
    <div style={{ fontSize: "16px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px" }}>
      {title}
    </div>
    {subtitle && (
      <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
        {subtitle}
      </div>
    )}
  </div>
);

const PinIcon = ({ color = colors.muted }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={color} />
    <circle cx="12" cy="9" r="2.5" fill="#1a1a1a" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke={colors.muted} strokeWidth="2" />
    <path d="M16 2v4M8 2v4M3 10h18" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const UsersIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
    <circle cx="9" cy="7" r="4" stroke={colors.muted} strokeWidth="2" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const TagIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7" cy="7" r="1.5" fill={colors.muted} />
  </svg>
);

// ─── Upcoming Concerts ────────────────────────────────────────────────────────
const ConcertCard = ({ item, index }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "14px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: "12px",
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: "10px", flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${item.hue}, 55%, 30%), hsl(${item.hue + 40}, 45%, 20%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.8" />
          <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.8" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.artist}
        </div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.venue}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <PinIcon />
          <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.distance}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: "700", color: colors.gold, fontFamily: "'Kanit', sans-serif" }}>{item.date}</div>
        <div style={{ fontSize: "10px", color: colors.teal, fontFamily: "'Kanit', sans-serif", backgroundColor: colors.tealGlow, padding: "2px 8px", borderRadius: "20px", border: `1px solid ${colors.teal}` }}>
          {item.genre}
        </div>
      </div>
    </div>
  );
};

// ─── Press Releases ───────────────────────────────────────────────────────────
const PressCard = ({ item, index }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "14px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${colors.border}`,
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div style={{ fontSize: "11px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>{item.artist}</div>
        <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.date}</div>
      </div>
      <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "6px", lineHeight: 1.4 }}>
        {item.title}
      </div>
      <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {item.excerpt}
      </div>
    </div>
  );
};

// ─── New Albums ───────────────────────────────────────────────────────────────
const AlbumReleaseCard = ({ item, index }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "14px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: "12px",
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: "10px", flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${item.hue}, 55%, 30%), hsl(${item.hue + 40}, 45%, 20%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={colors.teal} strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3" stroke={colors.teal} strokeWidth="1.8" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.album}
        </div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginBottom: "4px" }}>
          {item.artist}
        </div>
        <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
          {item.tracks} tracks
        </div>
      </div>
      <div style={{ fontSize: "11px", fontWeight: "600", color: item.released === "Today" ? colors.teal : colors.muted, fontFamily: "'Kanit', sans-serif", flexShrink: 0 }}>
        {item.released}
      </div>
    </div>
  );
};

// ─── Crowdfunding ─────────────────────────────────────────────────────────────
const CrowdfundCard = ({ item, index }) => {
  const [hovered, setHovered] = useState(false);
  const pct = Math.min(100, Math.round((item.raised / item.goal) * 100));
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "14px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${colors.border}`,
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: "8px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif", marginBottom: "3px" }}>{item.artist}</div>
          <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", lineHeight: 1.4 }}>{item.project}</div>
        </div>
        <div style={{ fontSize: "10px", fontWeight: "700", color: item.daysLeft <= 7 ? "#ff8844" : colors.muted, fontFamily: "'Kanit', sans-serif", flexShrink: 0 }}>
          {item.daysLeft}d left
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", marginBottom: "8px" }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: pct >= 75 ? colors.teal : colors.gold, borderRadius: "2px", transition: "width 0.3s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
          ${item.raised.toLocaleString()} <span style={{ fontWeight: "400", color: colors.muted }}>of ${item.goal.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <UsersIcon />
          <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.backers} backers</span>
        </div>
        <div style={{ fontSize: "11px", fontWeight: "700", color: pct >= 75 ? colors.teal : colors.gold, fontFamily: "'Kanit', sans-serif" }}>{pct}%</div>
      </div>
    </div>
  );
};

// ─── Events ───────────────────────────────────────────────────────────────────
const EventCard = ({ item, index }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "14px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: "12px",
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "10px", flexShrink: 0,
        backgroundColor: colors.tealGlow,
        border: `1px solid rgba(93,235,215,0.2)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" stroke={colors.teal} strokeWidth="1.8" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title}
        </div>
        <div style={{ fontSize: "11px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginBottom: "3px" }}>{item.artist}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <CalendarIcon />
          <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.date}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <div style={{ fontSize: "10px", color: colors.teal, fontFamily: "'Kanit', sans-serif", backgroundColor: colors.tealGlow, padding: "2px 8px", borderRadius: "20px", border: `1px solid ${colors.teal}`, whiteSpace: "nowrap" }}>
          {item.type}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <UsersIcon />
          <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.attendees}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Classifieds ──────────────────────────────────────────────────────────────
const ClassifiedCard = ({ item, index }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "14px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${colors.border}`,
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "4px" }}>
        {item.title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <div style={{ fontSize: "11px", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>{item.poster}</div>
        <span style={{ color: colors.muted, fontSize: "10px" }}>·</span>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <PinIcon />
          <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.location}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {item.tags.map((tag, i) => (
          <div key={i} style={{
            fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
            backgroundColor: "rgba(255,255,255,0.05)", padding: "2px 8px",
            borderRadius: "20px", border: `1px solid rgba(255,255,255,0.1)`,
          }}>
            {tag}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Gear & Merch ─────────────────────────────────────────────────────────────
const GearCard = ({ item, index }) => {
  const [hovered, setHovered] = useState(false);
  const isMerch = item.type === "Merch";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "14px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: "12px",
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: "10px", flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${item.hue}, 40%, 25%), hsl(${item.hue + 30}, 35%, 18%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isMerch ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.8" />
            <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.8" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title}
        </div>
        <div style={{ fontSize: "11px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginBottom: "3px" }}>
          {item.seller}
        </div>
        <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
          {item.condition}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: colors.gold, fontFamily: "'Kanit', sans-serif" }}>
          {item.price}
        </div>
        <div style={{
          fontSize: "10px", color: colors.teal,
          fontFamily: "'Kanit', sans-serif",
          backgroundColor: colors.tealGlow,
          padding: "2px 8px", borderRadius: "20px",
          border: `1px solid ${colors.teal}`,
        }}>
          {item.type}
        </div>
      </div>
    </div>
  );
};

// ─── Bulletin Screen ──────────────────────────────────────────────────────────
export default function BulletinScreen({ setScreen }) {
  const [activeNav, setActiveNav] = useState("bulletin");
  const [user, setUser] = useState(null);
  const { currentTrack, isPlaying } = usePlayer();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await getMe();
        setUser(me);
      } catch (err) {
        console.log('Could not load user:', err);
      }
    };
    loadUser();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Kanit', sans-serif; }
        body { background: #222222; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100%", backgroundColor: colors.bgDeep,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        fontFamily: "'Kanit', sans-serif",
      }}>
        <div style={{
          width: "375px", height: "750px",
          backgroundColor: colors.bg, borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative", overflow: "hidden",
          marginTop: "40px", marginBottom: "40px",
          display: "flex", flexDirection: "column",
        }}>

          {/* ── Header ── */}
          <AppHeader user={user} />

          {/* ── Scrollable content ── */}
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            width: "100%", boxSizing: "border-box", minHeight: 0,
            padding: "20px 16px 0",
          }}>

            {/* ── Upcoming Concerts ── */}
            <SectionHeader title="Upcoming Concerts" subtitle="Shows near you" index={0} />
            {UPCOMING_CONCERTS.map((item, i) => <ConcertCard key={item.id} item={item} index={i} />)}

            {/* ── Press Releases ── */}
            <div style={{ height: "8px" }} />
            <SectionHeader title="Press Releases" subtitle="Direct from the artists" index={1} />
            {PRESS_RELEASES.map((item, i) => <PressCard key={item.id} item={item} index={i} />)}

            {/* ── New Albums ── */}
            <div style={{ height: "8px" }} />
            <SectionHeader title="New Albums" subtitle="Fresh drops on Ponytail" index={2} />
            {NEW_ALBUMS.map((item, i) => <AlbumReleaseCard key={item.id} item={item} index={i} />)}

            {/* ── Crowdfunding ── */}
            <div style={{ height: "8px" }} />
            <SectionHeader title="Crowdfunding" subtitle="Back the artists you love" index={3} />
            {CROWDFUNDING.map((item, i) => <CrowdfundCard key={item.id} item={item} index={i} />)}

            {/* ── Open Mics & Events ── */}
            <div style={{ height: "8px" }} />
            <SectionHeader title="Open Mics & Events" subtitle="Live and virtual" index={4} />
            {EVENTS.map((item, i) => <EventCard key={item.id} item={item} index={i} />)}

            {/* ── Classifieds ── */}
            <div style={{ height: "8px" }} />
            <SectionHeader title="Classifieds" subtitle="Connect with the community" index={5} />
            {CLASSIFIEDS.map((item, i) => <ClassifiedCard key={item.id} item={item} index={i} />)}

            {/* ── Gear & Merch ── */}
            <div style={{ height: "8px" }} />
            <SectionHeader title="Gear & Merch" subtitle="Buy and sell with artists" index={6} />
            {GEAR_MERCH.map((item, i) => <GearCard key={item.id} item={item} index={i} />)}

            <div style={{ height: "20px" }} />
          </div>

          {/* ── Mini Player ── */}
          <MiniPlayer />

          {/* ── Footer Nav ── */}
          <FooterNav
            activeTab={activeNav}
            onTabPress={(tab) => {
              setActiveNav(tab);
              if (tab === "home") setScreen("home");
              if (tab === "search") setScreen("search");
              if (tab === "mymusic") setScreen("mymusic");
              if (tab === "radio") setScreen("radio");
            }}
          />

          {/* ── Full Player ── */}
          <FullPlayer />

          {/* ── Profile Panel ── */}
          <ProfilePanel />

          {/* ── Read-only viewer for a playlist you don't own ── */}
          <PublicPlaylistPanel />

        </div>
      </div>
    </>
  );
}