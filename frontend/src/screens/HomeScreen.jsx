import { useState, useEffect } from "react";
import { getMe, getToken } from '../services/authService';

// ─── Color palette consistent with LoginScreen ───────────────────────────────
const colors = {
  bg: "#222222",
  bgDeep: "#1a1a1a",
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

// ─── Mock data (will be replaced by real API calls) ───────────────────────────
const MOCK_FEED = [
  {
    id: "1",
    artist: "Nola Voss",
    artistAvatar: null,
    trackTitle: "Hollow Frequencies",
    genre: "Ambient / Electronic",
    duration: "4:32",
    plays: "12.4k",
    isNew: true,
    postedAt: "2h ago",
  },
  {
    id: "2",
    artist: "Cass Ember",
    artistAvatar: null,
    trackTitle: "Before the Signal Drops",
    genre: "Indie Folk",
    duration: "3:18",
    plays: "8.1k",
    isNew: false,
    postedAt: "5h ago",
  },
  {
    id: "3",
    artist: "Maren Hex",
    artistAvatar: null,
    trackTitle: "Two Moons Collide",
    genre: "Dream Pop",
    duration: "5:04",
    plays: "21.7k",
    isNew: true,
    postedAt: "Yesterday",
  },
  {
    id: "4",
    artist: "Theo Callum",
    artistAvatar: null,
    trackTitle: "Static Bloom",
    genre: "Lo-fi Hip Hop",
    duration: "2:55",
    plays: "5.3k",
    isNew: false,
    postedAt: "2 days ago",
  },
  {
    id: "5",
    artist: "Isla Pryor",
    artistAvatar: null,
    trackTitle: "Petrichor",
    genre: "Shoegaze",
    duration: "6:11",
    plays: "33.9k",
    isNew: false,
    postedAt: "3 days ago",
  },
];

const MOCK_DISCOVER = [
  { id: "d1", artist: "Ryn Holt", genre: "Jazz Fusion", followers: "2.1k" },
  { id: "d2", artist: "Pave Lune", genre: "Neo Soul", followers: "4.8k" },
  { id: "d3", artist: "Ellory Sun", genre: "Experimental", followers: "1.3k" },
  { id: "d4", artist: "Cade Winters", genre: "Post-Rock", followers: "6.2k" },
];

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

// ─── Avatar Placeholder ───────────────────────────────────────────────────────
const Avatar = ({ name, size = 42 }) => {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = name.charCodeAt(0) * 37 % 360;
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 40}, 70%, 35%))`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.35,
      fontWeight: "700",
      color: "#fff",
      fontFamily: "'DM Sans', sans-serif",
      flexShrink: 0,
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
      width: 40,
      height: 40,
      borderRadius: "50%",
      backgroundColor: playing ? colors.teal : "transparent",
      border: `1.5px solid ${playing ? colors.teal : "rgba(255,255,255,0.2)"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "all 0.2s ease",
      flexShrink: 0,
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
      }}
    >
      {/* Artist row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <Avatar name={track.artist} size={32} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "13px",
            fontWeight: "600",
            color: colors.text,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {track.artist}
          </div>
          <div style={{
            fontSize: "11px",
            color: colors.muted,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {track.postedAt}
          </div>
        </div>
        {track.isNew && (
          <div style={{
            fontSize: "10px",
            fontWeight: "700",
            color: colors.teal,
            backgroundColor: colors.tealGlow,
            padding: "3px 8px",
            borderRadius: "20px",
            letterSpacing: "0.5px",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            NEW
          </div>
        )}
      </div>

      {/* Track info + controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <PlayButton playing={isPlaying} onToggle={() => onTogglePlay(track.id)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "15px",
            fontWeight: "600",
            color: colors.text,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {track.trackTitle}
          </div>
          <div style={{
            fontSize: "12px",
            color: colors.textSecondary,
            fontFamily: "'DM Sans', sans-serif",
            marginTop: "2px",
          }}>
            {track.genre}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          {isPlaying
            ? <WaveformIcon playing={true} />
            : <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'DM Sans', sans-serif" }}>{track.duration}</div>
          }
          <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'DM Sans', sans-serif" }}>
            {track.plays} plays
          </div>
        </div>
      </div>

      {/* Tip button */}
      <div style={{
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: `1px solid ${colors.border}`,
        display: "flex",
        justifyContent: "flex-end",
        gap: "8px",
      }}>
        <button style={{
          background: "none",
          border: "none",
          color: colors.muted,
          fontSize: "12px",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          padding: "4px 8px",
        }}>
          ♡ Like
        </button>
        <button style={{
          background: "none",
          border: `1px solid ${colors.teal}`,
          color: colors.teal,
          fontSize: "12px",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          padding: "4px 12px",
          borderRadius: "20px",
          transition: "all 0.2s",
        }}>
          Tip
        </button>
      </div>
    </div>
  );
};

// ─── Discover Card ────────────────────────────────────────────────────────────
const DiscoverCard = ({ artist, index }) => {
  const [following, setFollowing] = useState(false);

  return (
    <div style={{
      backgroundColor: colors.bgCard,
      borderRadius: "14px",
      padding: "14px",
      border: `1px solid ${colors.border}`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      minWidth: "130px",
      animation: `fadeSlideUp 0.4s ease ${index * 0.08}s forwards`,
      opacity: 0,
    }}>
      <Avatar name={artist.artist} size={48} />
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: "13px",
          fontWeight: "600",
          color: colors.text,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {artist.artist}
        </div>
        <div style={{
          fontSize: "11px",
          color: colors.muted,
          fontFamily: "'DM Sans', sans-serif",
          marginTop: "2px",
        }}>
          {artist.genre}
        </div>
        <div style={{
          fontSize: "11px",
          color: colors.textSecondary,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {artist.followers} followers
        </div>
      </div>
      <button
        onClick={() => setFollowing(!following)}
        style={{
          padding: "6px 16px",
          borderRadius: "20px",
          border: `1px solid ${following ? colors.muted : colors.teal}`,
          backgroundColor: following ? "transparent" : colors.tealGlow,
          color: following ? colors.muted : colors.teal,
          fontSize: "12px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.2s ease",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {following ? "Following" : "+ Follow"}
      </button>
    </div>
  );
};

// ─── Feed Tab ─────────────────────────────────────────────────────────────────
const FeedTab = ({ user }) => {
  const [playingId, setPlayingId] = useState(null);

  const handleTogglePlay = (id) => {
    setPlayingId(prev => prev === id ? null : id);
  };

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Greeting */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{
          fontSize: "22px",
          fontWeight: "700",
          color: colors.text,
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "-0.3px",
        }}>
          Hey {user?.username || "there"} 
        </div>
        <div style={{
          fontSize: "14px",
          color: colors.textSecondary,
          fontFamily: "'DM Sans', sans-serif",
          marginTop: "4px",
        }}>
          Here's what the artists you follow have been up to.
        </div>
      </div>

      {/* Track feed */}
      {MOCK_FEED.map((track, i) => (
        <TrackCard
          key={track.id}
          track={track}
          index={i}
          isPlaying={playingId === track.id}
          onTogglePlay={handleTogglePlay}
        />
      ))}
    </div>
  );
};

// ─── Discover Tab ─────────────────────────────────────────────────────────────
const DiscoverTab = () => (
  <div style={{ padding: "0 16px 100px" }}>
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "22px",
        fontWeight: "700",
        color: colors.text,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: "-0.3px",
      }}>
        Discover
      </div>
      <div style={{
        fontSize: "14px",
        color: colors.textSecondary,
        fontFamily: "'DM Sans', sans-serif",
        marginTop: "4px",
      }}>
        Independent artists you might love.
      </div>
    </div>

    <div style={{
      display: "flex",
      gap: "12px",
      overflowX: "auto",
      paddingBottom: "8px",
      scrollbarWidth: "none",
    }}>
      {MOCK_DISCOVER.map((artist, i) => (
        <DiscoverCard key={artist.id} artist={artist} index={i} />
      ))}
    </div>
  </div>
);

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen({ setScreen }) {
  const [activeTab, setActiveTab] = useState("feed");
  const [user, setUser] = useState(null);

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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #1a1a1a; }
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

      <div style={{
        minHeight: "100vh",
        backgroundColor: colors.bgDeep,
        fontFamily: "'DM Sans', sans-serif",
        maxWidth: "480px",
        margin: "0 auto",
        position: "relative",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "52px 20px 0",
          backgroundColor: colors.bgDeep,
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          {/* Logo row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}>
            <div style={{
              fontSize: "20px",
              fontWeight: "700",
              color: colors.text,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.5px",
            }}>
              ponytail
              <span style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: colors.teal,
                marginLeft: "4px",
                marginBottom: "6px",
              }} />
            </div>

            {/* Avatar / profile */}
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <Avatar name={user?.username || "User"} size={34} />
            </button>
          </div>

          {/* Top navigation tabs */}
          <div style={{ display: "flex", gap: "4px" }}>
            {["feed", "discover"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: activeTab === tab ? "700" : "400",
                  color: activeTab === tab ? colors.teal : colors.muted,
                  fontFamily: "'DM Sans', sans-serif",
                  textTransform: "capitalize",
                  letterSpacing: "0.3px",
                  borderBottom: `2px solid ${activeTab === tab ? colors.teal : "transparent"}`,
                  transition: "all 0.2s ease",
                  marginBottom: "-1px",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div style={{ paddingTop: "20px" }}>
          {activeTab === "feed" && <FeedTab user={user} />}
          {activeTab === "discover" && <DiscoverTab />}
        </div>

      </div>
    </>
  );
}