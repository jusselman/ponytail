import { useState, useEffect } from "react";
import { getMe } from '../services/authService';
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
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
};

// ─── Mock feed generator ──────────────────────────────────────────────────────
// Generates mock tracks "similar to" the user's chosen seed artists.
// Replace with real API call once recommendation engine is built.
const generateMockFeed = (seedArtists) => {
  const similarArtists = {
    default: [
      { name: "Nola Voss", genre: "Ambient / Electronic" },
      { name: "Cass Ember", genre: "Indie Folk" },
      { name: "Maren Hex", genre: "Dream Pop" },
      { name: "Theo Callum", genre: "Lo-fi Hip Hop" },
      { name: "Isla Pryor", genre: "Shoegaze" },
      { name: "Ryn Holt", genre: "Jazz Fusion" },
      { name: "Pave Lune", genre: "Neo Soul" },
    ],
  };

  const trackTitles = [
    "Hollow Frequencies", "Before the Signal Drops", "Two Moons Collide",
    "Static Bloom", "Petrichor", "Glass Meridian", "Soft Machinery",
    "Tender Collapse", "Neon Pastoral", "The Long Dissolve",
  ];

  const durations = ["2:47", "3:18", "4:02", "3:55", "5:11", "2:59", "4:33"];
  const plays = ["2.1k", "8.4k", "12.7k", "5.3k", "21.9k", "3.6k", "18.2k"];

  // Build pool from seed artist names for display context
  const seedNames = seedArtists?.map(a => a.name) || [];
  const pool = similarArtists.default;

  return pool.map((artist, i) => ({
    id: String(i + 1),
    artist: artist.name,
    genre: artist.genre,
    trackTitle: trackTitles[i % trackTitles.length],
    duration: durations[i % durations.length],
    plays: plays[i % plays.length],
    isNew: i < 2,
    postedAt: i === 0 ? "1h ago" : i === 1 ? "3h ago" : i === 2 ? "Yesterday" : `${i} days ago`,
    // Tag which seed artist this is "similar to"
    similarTo: seedNames[i % Math.max(seedNames.length, 1)] || null,
  }));
};

// ─── Waveform Animation ───────────────────────────────────────────────────────
const WaveformIcon = ({ playing }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "16px" }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        style={{
          width: "2px",
          borderRadius: "2px",
          backgroundColor: colors.teal,
          animation: playing ? `wave ${0.4 + i * 0.1}s ease-in-out infinite alternate` : "none",
          height: playing ? "100%" : "4px",
          transition: "height 0.2s ease",
        }}
      />
    ))}
  </div>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 42 }) => {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = name.charCodeAt(0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 40}, 70%, 35%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: "700", color: "#fff",
      fontFamily: "'Kanit', sans-serif", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

// ─── Play Button ──────────────────────────────────────────────────────────────
const PlayButton = ({ playing, onToggle }) => (
  <button
    onClick={onToggle}
    style={{
      width: 40, height: 40, borderRadius: "50%",
      backgroundColor: playing ? colors.teal : "transparent",
      border: `1.5px solid ${playing ? colors.teal : "rgba(255,255,255,0.2)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", transition: "all 0.2s ease", flexShrink: 0,
    }}
  >
    {playing ? (
      <div style={{ display: "flex", gap: "3px" }}>
        <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
        <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
      </div>
    ) : (
      <div style={{
        width: 0, height: 0,
        borderTop: "6px solid transparent",
        borderBottom: "6px solid transparent",
        borderLeft: `10px solid ${colors.teal}`,
        marginLeft: 3,
      }} />
    )}
  </button>
);

// ─── Track Card ───────────────────────────────────────────────────────────────
const TrackCard = ({ track, isPlaying, onTogglePlay, index }) => {
  const [hovered, setHovered] = useState(false);
  const [liked, setLiked] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "16px",
        padding: "16px",
        marginBottom: "12px",
        border: `1px solid ${isPlaying ? colors.teal : colors.border}`,
        boxShadow: isPlaying ? `0 0 20px rgba(93,235,215,0.1)` : "none",
        transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`,
        opacity: 0,
        cursor: "pointer",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ── Artist row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <Avatar name={track.artist} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
            {track.artist}
          </div>
          <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
            {track.postedAt}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {track.isNew && (
            <div style={{
              fontSize: "10px", fontWeight: "700", color: colors.teal,
              backgroundColor: colors.tealGlow, padding: "3px 8px",
              borderRadius: "20px", letterSpacing: "0.5px",
              fontFamily: "'Kanit', sans-serif", flexShrink: 0,
            }}>
              NEW
            </div>
          )}
          {track.similarTo && (
            <div style={{
              fontSize: "10px", color: colors.muted,
              fontFamily: "'Kanit', sans-serif", flexShrink: 0,
              fontStyle: "italic",
            }}>
              similar to {track.similarTo}
            </div>
          )}
        </div>
      </div>

      {/* ── Track info + controls ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <PlayButton playing={isPlaying} onToggle={() => onTogglePlay(track.id)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "15px", fontWeight: "600", color: colors.text,
            fontFamily: "'Kanit', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {track.trackTitle}
          </div>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
            {track.genre}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
          {isPlaying
            ? <WaveformIcon playing={true} />
            : <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{track.duration}</div>
          }
          <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
            {track.plays} plays
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{
        marginTop: "12px", paddingTop: "12px",
        borderTop: `1px solid ${colors.border}`,
        display: "flex", justifyContent: "flex-end", gap: "8px",
      }}>
        <button
          onClick={() => setLiked(!liked)}
          style={{
            background: "none", border: "none",
            color: liked ? colors.teal : colors.muted,
            fontSize: "12px", cursor: "pointer",
            fontFamily: "'Kanit', sans-serif", padding: "4px 8px",
            transition: "color 0.2s ease",
          }}
        >
          {liked ? "♥ Liked" : "♡ Like"}
        </button>
        <button style={{
          background: "none", border: `1px solid ${colors.teal}`,
          color: colors.teal, fontSize: "12px", cursor: "pointer",
          fontFamily: "'Kanit', sans-serif", padding: "4px 12px",
          borderRadius: "20px", transition: "all 0.2s",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 21C12 21 3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12z" stroke="#5DEBD7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 10v4M10 12h4" stroke="#5DEBD7" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Tip
        </span>
        </button>
      </div>
    </div>
  );
};

// ─── Seed Artist Pills ────────────────────────────────────────────────────────
// Shows which artists the feed is based on
const SeedArtistPills = ({ artists }) => {
  if (!artists || artists.length === 0) return null;
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
        Based on your taste for
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {artists.map((artist, i) => (
          <div key={i} style={{
            fontSize: "12px", fontWeight: "600",
            color: colors.teal,
            backgroundColor: colors.tealGlow,
            border: `1px solid ${colors.teal}`,
            borderRadius: "20px",
            padding: "4px 12px",
            fontFamily: "'Kanit', sans-serif",
          }}>
            {artist.name}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen({ setScreen }) {
  const [user, setUser] = useState(null);
  const [feed, setFeed] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const [activeNav, setActiveNav] = useState("home");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await getMe();
        setUser(me);
        // Generate mock feed based on user's favorite artists
        const seedArtists = me?.favorite_artists || [];
        setFeed(generateMockFeed(seedArtists));
      } catch (err) {
        console.log('Could not load user:', err);
        // Fall back to default mock feed
        setFeed(generateMockFeed([]));
      }
    };
    loadUser();
  }, []);

  const handleTogglePlay = (id) => {
    setPlayingId(prev => prev === id ? null : id);
  };

  const currentTrack = feed.find(t => t.id === playingId) || null;

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
        @keyframes wave {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Full viewport background ── */}
      <div style={{
        minHeight: "100vh", width: "100%", backgroundColor: colors.bgDeep,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        fontFamily: "'Kanit', sans-serif",
      }}>

        {/* ── Phone frame ── */}
        <div style={{
          width: "375px",
          height: "750px",
          backgroundColor: colors.bg,
          borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative",
          overflow: "hidden",
          marginTop: "40px",
          marginBottom: "40px",
          display: "flex",
          flexDirection: "column",
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: "32px 20px 12px",
            backgroundColor: colors.bg,
            position: "sticky", top: 0, zIndex: 10,
            borderBottom: `1px solid ${colors.border}`,
            width: "100%", boxSizing: "border-box", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{
                fontSize: "20px", fontWeight: "700", color: colors.text,
                fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.5px",
              }}>
                ponytail
                <span style={{
                  display: "inline-block", width: "6px", height: "6px",
                  borderRadius: "50%", backgroundColor: colors.teal,
                  marginLeft: "4px", marginBottom: "6px",
                }} />
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <Avatar name={user?.username || "User"} size={34} />
              </button>
            </div>
          </div>

          {/* ── Scrollable feed ── */}
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            paddingTop: "20px", width: "100%",
            boxSizing: "border-box", minHeight: 0,
          }}>
            <div style={{ padding: "0 16px 20px", width: "100%", boxSizing: "border-box" }}>

              {/* Greeting */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{
                  fontSize: "22px", fontWeight: "700", color: colors.text,
                  fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  Hey {user?.username || "there"}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M7 11.5V6a1.5 1.5 0 0 1 3 0v4.5" stroke="#5DEBD7" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M10 7.5V5a1.5 1.5 0 0 1 3 0v5" stroke="#5DEBD7" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M13 6.5V5a1.5 1.5 0 0 1 3 0v6" stroke="#5DEBD7" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M16 8.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-1a1.5 1.5 0 0 1 3 0" stroke="#5DEBD7" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                </div>
                <div style={{ fontSize: "14px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginTop: "4px" }}>
                  Here's what we think you'll love.
                </div>
              </div>

              {/* Seed artist pills */}
              <SeedArtistPills artists={user?.favorite_artists} />

              {/* Feed */}
              {feed.length === 0 ? (
                <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", paddingTop: "40px" }}>
                  Building your feed...
                </div>
              ) : (
                feed.map((track, i) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    index={i}
                    isPlaying={playingId === track.id}
                    onTogglePlay={handleTogglePlay}
                  />
                ))
              )}

            </div>
          </div>

          {/* ── Mini Player ── */}
          <MiniPlayer
            track={currentTrack ? {
              title: currentTrack.trackTitle,
              artist: currentTrack.artist,
              album: currentTrack.genre,
              coverUrl: null,
            } : null}
          />

          {/* ── Footer Nav ── */}
          <FooterNav
            activeTab={activeNav}
            onTabPress={(tab) => {
              setActiveNav(tab);
              if (tab === "search") setScreen("search");
            }}
          />

          {/* ── Full Screen Player ── */}
          <FullPlayer />

        </div>
      </div>
    </>
  );
}