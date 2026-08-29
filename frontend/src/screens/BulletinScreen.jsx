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
// Bulletin rehaul (board direction, 2026-08-29): the old section-by-category
// layout (Concerts / Press Releases / New Albums / Crowdfunding / Events /
// Classifieds) is gone. In its place: a single reverse-chron feed of posts
// from artists and fans, Twitter/Instagram-style. Hardcoded and inert for
// now — no likes, reposts, or composing actually do anything yet, this is
// purely the visual rehaul. Hues are carried over from the old mock data so
// the same artists keep the same identity color across the app.
const MOCK_POSTS = [
  {
    id: "post-1",
    author: "Margot Veil", handle: "@margotveil", isArtist: true, hue: 170,
    time: "2h",
    body: "It's official — Cartography of Silence drops July 4th. Three years in the making, and every note of it is exactly what I wanted to say. Thank you for waiting.",
    tag: "Album Release",
    media: { type: "album", label: "Cartography of Silence" },
    likes: 842, comments: 96, reposts: 214,
  },
  {
    id: "post-2",
    author: "Jae Marlowe", handle: "@jaehearsit", isArtist: false, hue: 340,
    time: "3h",
    body: "Callow Kings at Bottom of the Hill last night absolutely destroyed. Ears still ringing, worth every bit of it. If you slept on this show I'm so sorry for you 😭",
    media: { type: "photo", label: "Bottom of the Hill, SF" },
    likes: 231, comments: 18, reposts: 12,
  },
  {
    id: "post-3",
    author: "Dusk Relay", handle: "@duskrelay", isArtist: true, hue: 220,
    time: "5h",
    body: "WE HIT THE GOAL. The van is real. West coast tour is happening this fall because 203 of you believed in three people and a lot of gear. See you out there.",
    tag: "Tour Funded",
    likes: 1104, comments: 143, reposts: 388,
  },
  {
    id: "post-4",
    author: "Neon Parish", handle: "@neonparish", isArtist: true, hue: 280,
    time: "7h",
    body: "Glass & Copper is out now. Ten tracks, no filler, no gatekeepers — just us and you. Stream it straight from our profile.",
    tag: "New Release",
    media: { type: "album", label: "Glass & Copper" },
    likes: 966, comments: 71, reposts: 260,
  },
  {
    id: "post-5",
    author: "Priya Okonkwo", handle: "@priyaspins", isArtist: false, hue: 40,
    time: "9h",
    body: "The thing I love about Ponytail is I found Sable Junction on a Tuesday with zero algorithm telling me to. Just people posting what they actually love. This is what discovery is supposed to feel like.",
    likes: 412, comments: 29, reposts: 54,
  },
  {
    id: "post-6",
    author: "Sable Junction", handle: "@sablejunction", isArtist: true, hue: 120,
    time: "11h",
    body: "One take, one warehouse in SoMa, one mic between the three of us. The live session EP is a document of exactly what that room sounded like. Out now.",
    tag: "Live Session",
    media: { type: "photo", label: "SoMa warehouse session" },
    likes: 578, comments: 42, reposts: 97,
  },
  {
    id: "post-7",
    author: "Theo Baptiste", handle: "@theoplaysdrums", isArtist: false, hue: 260,
    time: "13h",
    body: "who's pulling up to open mic night thursday. i need a bassist for two songs and i will owe you forever",
    likes: 64, comments: 21, reposts: 3,
  },
  {
    id: "post-8",
    author: "The Pelican Stairs", handle: "@pelicanstairs", isArtist: true, hue: 30,
    time: "1d",
    body: "Signed with Tide Pool Records this week — a label that gets it, run by people who actually go to shows. Vinyl pressing and the west coast run are both funded because of this. More soon.",
    tag: "Label Signing",
    likes: 703, comments: 88, reposts: 176,
  },
  {
    id: "post-9",
    author: "Ren Castellano", handle: "@rencastellano", isArtist: false, hue: 200,
    time: "1d",
    body: "album release party for Neon Parish was UNREAL. sweatiest room in Oakland, best possible way. photo dump incoming",
    media: { type: "photo", label: "Neon Parish release party" },
    likes: 289, comments: 15, reposts: 8,
  },
  {
    id: "post-10",
    author: "Kaare Norge", handle: "@kaarenorge", isArtist: true, hue: 200,
    time: "1d",
    body: "Fjord Sessions Vol. 2 is streaming now. Recorded mostly in silence, mostly at night, mostly because I couldn't sleep. Hope it does for you what it did for me.",
    tag: "New Release",
    media: { type: "album", label: "Fjord Sessions Vol. 2" },
    likes: 445, comments: 33, reposts: 61,
  },
  {
    id: "post-11",
    repostOf: true, repostBy: "Jae Marlowe",
    author: "Ponytail Curators", handle: "@ponytailpicks", isArtist: false, hue: 190,
    time: "2d",
    body: "5 independent artists quietly having the best year on Ponytail right now: Margot Veil, Dusk Relay, Neon Parish, Sable Junction, and Kaare Norge. Zero label money behind any of it. Just word of mouth.",
    tag: "Community Pick",
    likes: 921, comments: 47, reposts: 302,
  },
  {
    id: "post-12",
    author: "Petteri Sariola", handle: "@petterisariola", isArtist: true, hue: 60,
    time: "2d",
    body: "Open Strings just crossed 10,000 plays. No label, no ad spend, no algorithm push — just this community passing it along one person at a time. I genuinely don't have the words. Thank you.",
    tag: "Milestone",
    likes: 1340, comments: 201, reposts: 410,
  },
  {
    id: "post-13",
    author: "Nola Voss", handle: "@nolavoss", isArtist: true, hue: 180,
    time: "3d",
    body: "The Fillmore next Sunday. Ambient set, full room, no phones up front please — just be in it with me.",
    tag: "Show Announcement",
    media: { type: "concert", label: "The Fillmore · Jun 14" },
    likes: 512, comments: 39, reposts: 88,
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const VerifiedBadge = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill={colors.teal} />
    <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HeartIcon = ({ size = 15, color = colors.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 21C12 21 3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CommentIcon = ({ size = 15, color = colors.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RepostIcon = ({ size = 15, color = colors.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M17 2l4 4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 22l-4-4 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = ({ size = 15, color = colors.muted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 6l-4-4-4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 2v13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MediaTypeIcon = ({ type, color }) => {
  if (type === "album") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
      </svg>
    );
  }
  if (type === "concert") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M9 18V6l12-2v12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.8" />
        <circle cx="18" cy="16" r="3" stroke={color} strokeWidth="1.8" />
      </svg>
    );
  }
  // photo
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.8" />
      <circle cx="8.5" cy="10" r="1.6" fill={color} />
      <path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.1 0L5 19" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 42, hue }) => {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const h = hue ?? (name.charCodeAt(0) * 37 % 360);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, hsl(${h}, 55%, 42%), hsl(${h + 40}, 60%, 30%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: "700", color: "#fff",
      fontFamily: "'Kanit', sans-serif",
    }}>
      {initials}
    </div>
  );
};

// ─── Tag pill (Album Release, Tour Funded, Milestone, etc.) ─────────────────
const TagPill = ({ label, hue }) => (
  <div style={{
    display: "inline-block", marginTop: "4px",
    fontSize: "10px", fontWeight: "600", color: colors.teal,
    fontFamily: "'Kanit', sans-serif", letterSpacing: "0.3px",
    backgroundColor: colors.tealGlow, border: `1px solid ${colors.teal}`,
    padding: "2px 9px", borderRadius: "20px",
  }}>
    {label}
  </div>
);

// ─── Media block (album art / concert flyer / photo placeholder) ────────────
const MediaBlock = ({ media }) => (
  <div style={{
    width: "100%", aspectRatio: "16 / 9", borderRadius: "12px",
    marginTop: "10px", marginBottom: "2px", overflow: "hidden",
    position: "relative",
    background: `linear-gradient(150deg, hsl(${media.hue}, 55%, 26%) 0%, hsl(${media.hue + 40}, 45%, 16%) 100%)`,
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <MediaTypeIcon type={media.type} color="rgba(255,255,255,0.55)" />
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      padding: "18px 12px 10px",
      background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 100%)",
    }}>
      <div style={{ fontSize: "12px", fontWeight: "600", color: "#fff", fontFamily: "'Kanit', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
        {media.label}
      </div>
    </div>
  </div>
);

// ─── Action bar (like / comment / repost / share — display only, inert) ─────
const StatButton = ({ icon, count }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "default" }}>
    {icon}
    {count != null && (
      <span style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
        {count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k` : count}
      </span>
    )}
  </div>
);

// ─── Feed Post ────────────────────────────────────────────────────────────────
const FeedPost = ({ post, index }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "16px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${colors.border}`,
        transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${Math.min(index, 8) * 0.05}s forwards`, opacity: 0,
      }}
    >
      {post.repostOf && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", paddingLeft: "2px" }}>
          <RepostIcon size={12} color={colors.muted} />
          <span style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontWeight: "500" }}>
            {post.repostBy} reposted
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <Avatar name={post.author} hue={post.hue} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
              {post.author}
            </span>
            {post.isArtist && <VerifiedBadge />}
            <span style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
              {post.handle}
            </span>
            <span style={{ fontSize: "11px", color: colors.muted }}>·</span>
            <span style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
              {post.time}
            </span>
          </div>

          {post.tag && <TagPill label={post.tag} hue={post.hue} />}

          <div style={{
            fontSize: "13px", color: colors.text, fontFamily: "'Kanit', sans-serif",
            lineHeight: 1.5, marginTop: "8px", whiteSpace: "pre-wrap",
          }}>
            {post.body}
          </div>

          {post.media && <MediaBlock media={{ ...post.media, hue: post.hue }} />}

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${colors.border}`,
            maxWidth: "260px",
          }}>
            <StatButton icon={<HeartIcon />} count={post.likes} />
            <StatButton icon={<CommentIcon />} count={post.comments} />
            <StatButton icon={<RepostIcon />} count={post.reposts} />
            <StatButton icon={<ShareIcon />} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Composer bar — purely decorative, sells the "this is a feed" feeling.
// No state, no submit handler; the button is styled inert on purpose. ───────
const ComposerBar = ({ user }) => (
  <div style={{
    backgroundColor: colors.bgCard, borderRadius: "16px", padding: "14px",
    marginBottom: "16px", border: `1px solid ${colors.border}`,
    display: "flex", alignItems: "center", gap: "10px",
    animation: "fadeSlideUp 0.4s ease forwards", opacity: 0,
  }}>
    <Avatar name={user?.username || "You"} size={38} />
    <div style={{
      flex: 1, padding: "10px 14px", borderRadius: "20px",
      backgroundColor: "rgba(255,255,255,0.04)",
      border: `1px solid ${colors.border}`,
      fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
    }}>
      Share what's inspiring you...
    </div>
    <div style={{
      padding: "8px 16px", borderRadius: "20px",
      backgroundColor: "rgba(93,235,215,0.12)",
      color: colors.teal, fontSize: "12px", fontWeight: "600",
      fontFamily: "'Kanit', sans-serif", opacity: 0.6, flexShrink: 0,
    }}>
      Post
    </div>
  </div>
);

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

          {/* ── Scrollable feed ── */}
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            width: "100%", boxSizing: "border-box", minHeight: 0,
            padding: "16px 16px 0",
          }}>

            <ComposerBar user={user} />

            {MOCK_POSTS.map((post, i) => (
              <FeedPost key={post.id} post={post} index={i} />
            ))}

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
