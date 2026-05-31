import { useState, useEffect } from "react";
import { getMe } from '../services/authService';
import AppHeader from '../components/AppHeader';
import MiniPlayer from '../components/MiniPlayer';
import FooterNav from '../components/FooterNav';
import FullPlayer from '../components/FullPlayer';
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
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const HOT_IN_HERE = [
  {
    id: "h1",
    artist: "Margot Veil",
    track: "Slow Burn City",
    genre: "Indie Folk",
    distance: "0.4 mi",
    location: "Mission District, SF",
    listeners: 142,
    hue: 170,
  },
  {
    id: "h2",
    artist: "Dusk Relay",
    track: "Frequency Maps",
    genre: "Electronic",
    distance: "1.2 mi",
    location: "SoMa, SF",
    listeners: 89,
    hue: 220,
  },
  {
    id: "h3",
    artist: "The Pelican Stairs",
    track: "Low Tide",
    genre: "Surf Rock",
    distance: "3.7 mi",
    location: "Haight-Ashbury, SF",
    listeners: 204,
    hue: 30,
  },
  {
    id: "h4",
    artist: "Neon Parish",
    track: "Glass & Copper",
    genre: "Dream Pop",
    distance: "8.1 mi",
    location: "Oakland, CA",
    listeners: 317,
    hue: 280,
  },
  {
    id: "h5",
    artist: "Callow Kings",
    track: "Borrowed Hours",
    genre: "Post-Rock",
    distance: "14.5 mi",
    location: "Berkeley, CA",
    listeners: 61,
    hue: 340,
  },
  {
    id: "h6",
    artist: "Sable Junction",
    track: "The Quiet Algorithm",
    genre: "Jazz Fusion",
    distance: "22.3 mi",
    location: "San Jose, CA",
    listeners: 178,
    hue: 120,
  },
];

const COMING_SOON_STATIONS = [
  { label: "Pony Mode Radio", icon: "pony", description: "Stations built from your taste profile" },
  { label: "Goat Mode Radio", icon: "goat", description: "Hackable stations you control" },
  { label: "Genre Stations", icon: "genre", description: "Deep dives into any genre" },
  { label: "Artist Radio", icon: "artist", description: "Endless music from artists you love" },
];

// ─── Pin Icon ─────────────────────────────────────────────────────────────────
const PinIcon = ({ color = colors.teal }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={color} />
    <circle cx="12" cy="9" r="2.5" fill="#1a1a1a" />
  </svg>
);

// ─── Users Icon ───────────────────────────────────────────────────────────────
const UsersIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
    <circle cx="9" cy="7" r="4" stroke={colors.muted} strokeWidth="2" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Hot in Here Card ─────────────────────────────────────────────────────────
const HotCard = ({ item, index, onPlay, currentTrack, isPlaying }) => {
  const [hovered, setHovered] = useState(false);
  const isCurrentTrack = currentTrack &&
    `${currentTrack.title}|${currentTrack.artist}` === `${item.track}|${item.artist}`;
  const showPause = isCurrentTrack && isPlaying;

  return (
    <div
      onClick={() => onPlay(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "16px",
        padding: "14px",
        marginBottom: "10px",
        border: `1px solid ${isCurrentTrack ? colors.teal : colors.border}`,
        boxShadow: isCurrentTrack ? `0 0 20px rgba(93,235,215,0.1)` : "none",
        display: "flex", alignItems: "center", gap: "12px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`,
        opacity: 0,
      }}
    >
      {/* ── Album art placeholder ── */}
      <div style={{
        width: 52, height: 52, borderRadius: "10px", flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${item.hue}, 55%, 30%), hsl(${item.hue + 40}, 45%, 20%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.8" />
          <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.8" />
        </svg>

        {/* Play/pause overlay */}
        {(hovered || isCurrentTrack) && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {showPause ? (
              <div style={{ display: "flex", gap: "3px" }}>
                <div style={{ width: 3, height: 10, backgroundColor: colors.teal, borderRadius: 2 }} />
                <div style={{ width: 3, height: 10, backgroundColor: colors.teal, borderRadius: 2 }} />
              </div>
            ) : (
              <div style={{
                width: 0, height: 0,
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderLeft: `10px solid ${colors.teal}`,
                marginLeft: 2,
              }} />
            )}
          </div>
        )}
      </div>

      {/* ── Track info ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "14px", fontWeight: "600", color: colors.text,
          fontFamily: "'Kanit', sans-serif",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: "2px",
        }}>
          {item.track}
        </div>
        <div style={{
          fontSize: "12px", color: colors.textSecondary,
          fontFamily: "'Kanit', sans-serif", marginBottom: "4px",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {item.artist}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <PinIcon />
            <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
              {item.location}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <UsersIcon />
            <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
              {item.listeners} listening
            </span>
          </div>
        </div>
      </div>

      {/* ── Distance + genre ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <div style={{
          fontSize: "11px", fontWeight: "700", color: colors.gold,
          fontFamily: "'Kanit', sans-serif",
        }}>
          {item.distance}
        </div>
        <div style={{
          fontSize: "10px", color: colors.teal,
          fontFamily: "'Kanit', sans-serif",
          backgroundColor: colors.tealGlow,
          padding: "2px 8px", borderRadius: "20px",
          border: `1px solid ${colors.teal}`,
        }}>
          {item.genre}
        </div>
      </div>
    </div>
  );
};

// ─── Icon  for coming soon stations (replace with real icons later) ────────────
const StationIcon = ({ type }) => {
  const icons = {
    pony: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5l-2 8h10l-2-8c1-1 2-3 2-5 0-4-3-7-5-7z" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9c0 1.5 1.5 3 3 3s3-1.5 3-3" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    goat: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 3c-2 0-4 1.5-4 4 0 1.5.5 3 1.5 4L8 20h8l-1.5-9c1-1 1.5-2.5 1.5-4 0-2.5-2-4-4-4z" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 5c-.5-.5-2-1-3 0M15 5c.5-.5 2-1 3 0" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    genre: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.8" />
        <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.8" />
      </svg>
    ),
    artist: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={colors.teal} strokeWidth="1.8" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  };
  return icons[type] || null;
};

// ─── Coming Soon Card ─────────────────────────────────────────────────────────
const ComingSoonCard = ({ item, index }) => (
  <div style={{
    backgroundColor: colors.bgCard,
    borderRadius: "14px",
    padding: "16px",
    border: `1px solid ${colors.border}`,
    display: "flex", alignItems: "center", gap: "12px",
    animation: `fadeSlideUp 0.4s ease ${0.4 + index * 0.07}s forwards`,
    opacity: 0,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: "10px",
      backgroundColor: colors.tealGlow,
      border: `1px solid rgba(93,235,215,0.2)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <StationIcon type={item.icon} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "2px" }}>
        {item.label}
      </div>
      <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
        {item.description}
      </div>
    </div>
    <div style={{
      fontSize: "10px", fontWeight: "600", color: colors.muted,
      fontFamily: "'Kanit', sans-serif",
      backgroundColor: "rgba(255,255,255,0.05)",
      padding: "3px 8px", borderRadius: "20px",
      border: `1px solid rgba(255,255,255,0.1)`,
      flexShrink: 0,
    }}>
      Soon
    </div>
  </div>
);

// ─── Radio Screen ─────────────────────────────────────────────────────────────
export default function RadioScreen({ setScreen }) {
  const [activeNav, setActiveNav] = useState("radio");
  const [user, setUser] = useState(null);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

    // ── Load user ──
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

  const handlePlay = (item) => {
    playTrack(
      {
        title: item.track,
        artist: item.artist,
        album: item.genre,
        genre: item.genre,
        coverUrl: null,
        audioUrl: "http://localhost:5000/audio/dummy.mp3",
      },
      HOT_IN_HERE.map(t => ({
        title: t.track,
        artist: t.artist,
        album: t.genre,
        genre: t.genre,
        coverUrl: null,
        audioUrl: "http://localhost:5000/audio/dummy.mp3",
      })),
      HOT_IN_HERE.findIndex(t => t.id === item.id)
    );
  };

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
          }}>

            {/* ── Hot in Here section ── */}
            <div style={{ padding: "20px 16px 0" }}>
              <div style={{
                marginBottom: "16px",
                animation: "fadeSlideUp 0.4s ease 0s forwards",
                opacity: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px" }}>
                    Hot in Here
                  </div>
                  <div style={{
                    fontSize: "10px", fontWeight: "700", color: colors.teal,
                    fontFamily: "'Kanit', sans-serif",
                    backgroundColor: colors.tealGlow,
                    padding: "2px 8px", borderRadius: "20px",
                    border: `1px solid ${colors.teal}`,
                    letterSpacing: "0.5px",
                    }}>
                    LIVE
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <PinIcon color={colors.muted} />
                  <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                    Artists within 50 miles of you
                  </div>
                </div>
              </div>

              {HOT_IN_HERE.map((item, i) => (
                <HotCard
                  key={item.id}
                  item={item}
                  index={i}
                  onPlay={handlePlay}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                />
              ))}
            </div>

            {/* ── Coming Soon section ── */}
            <div style={{ padding: "24px 16px 0" }}>
              <div style={{
                marginBottom: "16px",
                animation: "fadeSlideUp 0.4s ease 0.35s forwards",
                opacity: 0,
              }}>
                <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px", marginBottom: "4px" }}>
                  Stations
                </div>
                <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                  More ways to listen, coming soon
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "20px" }}>
                {COMING_SOON_STATIONS.map((item, i) => (
                  <ComingSoonCard key={i} item={item} index={i} />
                ))}
              </div>
            </div>

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
              if (tab === "bulletin") setScreen("bulletin");
            }}
          />

          {/* ── Full Player ── */}
          <FullPlayer />

        </div>
      </div>
    </>
  );
}