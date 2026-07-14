import { useState, useEffect } from "react";
import { getMe, getToken } from '../services/authService';
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
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
};

// ─── Format seconds as m:ss ───────────────────────────────────────────────────
const formatDuration = (seconds) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
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
const Avatar = ({ name, size = 42, coverUrl }) => {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = name.charCodeAt(0) * 37 % 360;

  if (coverUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
        <img src={coverUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

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
  const [reaction, setReaction] = useState(null); 

  const handleReaction = async (type) => {
  if (reaction === type) {
    setReaction(null);
    return;
  }
  try {
    const token = await getToken();
    const endpoint = type === 'liked' ? 'like' : 'dislike';
    await fetch(`http://localhost:5000/api/auth/tracks/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: track.trackTitle,
        artist: track.artist,
      }),
    });
    setReaction(type);
  } catch (err) {
    console.log(`Failed to ${type} track:`, err);
  }
};

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
        <Avatar name={track.artist} size={32} coverUrl={track.coverUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
            {track.artist}
          </div>
          <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
            {track.album}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{
        marginTop: "12px", paddingTop: "12px",
        borderTop: `1px solid ${colors.border}`,
        display: "flex", justifyContent: "flex-end", gap: "8px",
        alignItems: "center",
      }}>
       <button
        onClick={() => handleReaction('dislike')}
        style={{
          background: "none", border: "none",
          cursor: "pointer",
          color: reaction === 'dislike' ? "#ff4444" : colors.muted,
          fontSize: "12px", cursor: reaction === 'dislike' ? "default" : "pointer",
          fontFamily: "'Kanit', sans-serif", padding: "4px 8px",
          transition: "color 0.2s ease",
          display: "flex", alignItems: "center", gap: "4px",
        }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M17 2H19C20.1046 2 21 2.89543 21 4V13C21 14.1046 20.1046 15 19 15H17M17 2L11 2C9.34315 2 8 3.34315 8 5V16.5C8 17.3284 7.32843 18 6.5 18V18C5.11929 18 4 19.1193 4 20.5V20.5C4 21.3284 4.67157 22 5.5 22H13C14.6569 22 16 20.6569 16 19V15M17 2V15" 
              stroke={reaction === 'dislike' ? "#ff4444" : colors.muted} 
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={() => handleReaction('liked')}
          style={{
            background: "none", border: "none",
            cursor: "pointer",
            color: reaction === 'liked' ? colors.teal : colors.muted,
            fontSize: "12px", cursor: reaction === 'liked' ? "default" : "pointer",
            fontFamily: "'Kanit', sans-serif", padding: "4px 8px",
            transition: "color 0.2s ease",
            display: "flex", alignItems: "center", gap: "4px",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M7 22H5C3.89543 22 3 21.1046 3 20V11C3 9.89543 3.89543 9 5 9H7M7 22L13 22C14.6569 22 16 20.6569 16 19V7.5C16 6.67157 16.6716 6 17.5 6V6C18.8807 6 20 4.88071 20 3.5V3.5C20 2.67157 19.3284 2 18.5 2H11C9.34315 2 8 3.34315 8 5V9M7 22V9"
              stroke={reaction === 'liked' ? colors.teal : colors.muted}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
            {typeof artist === 'string' ? artist : artist.name}
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
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("home");
  const { playStandaloneTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const me = await getMe();
        setUser(me);

        const token = await getToken();
        const res = await fetch('http://localhost:5000/api/auth/home/feed?limit=20', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();

        // ── Map real API fields onto the shape TrackCard expects ──
        const mapped = (data.tracks || []).map((track, i) => ({
          id: `${track.title}|${track.artist}`,
          trackTitle: track.title,
          artist: track.artist,
          album: track.album,
          genre: track.genre,
          duration: formatDuration(track.length_seconds),
          coverUrl: track.coverUrl,
          audioUrl: track.audioUrl,
          similarTo: track.similarTo,
          // ── Stubbed fields — build out later ──
          plays: null,
          isNew: false,
          postedAt: null,
        }));

        setFeed(mapped);
      } catch (err) {
        console.log('Could not load feed:', err);
      } finally {
        setLoading(false);
      }
    };
    loadFeed();
  }, []);

  const handleTogglePlay = (trackId) => {
    const track = feed.find(t => t.id === trackId);
    if (!track) return;

    const isCurrentlyPlaying =
      currentTrack?.title === track.trackTitle &&
      currentTrack?.artist === track.artist;

    if (isCurrentlyPlaying) {
      togglePlay();
    } else {
      playStandaloneTrack({
        title: track.trackTitle,
        artist: track.artist,
        album: track.album,
        genre: track.genre,
        coverUrl: track.coverUrl,
        audioUrl: track.audioUrl,
      });
    }
  };

  const isTrackPlaying = (trackId) => {
    const track = feed.find(t => t.id === trackId);
    if (!track) return false;
    return (
      currentTrack?.title === track.trackTitle &&
      currentTrack?.artist === track.artist &&
      isPlaying
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
        @keyframes wave {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100%", backgroundColor: colors.bgDeep,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        fontFamily: "'Kanit', sans-serif",
      }}>

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

          <AppHeader user={user} />

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

              {/* Seed artist pills from onboarding */}
              <SeedArtistPills artists={user?.favorite_artists} />

              {/* Feed */}
              {loading ? (
                <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", paddingTop: "40px" }}>
                  Building your feed...
                </div>
              ) : feed.length === 0 ? (
                <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", paddingTop: "40px" }}>
                  Play some tracks to personalize your feed.
                </div>
              ) : (
                feed.map((track, i) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    index={i}
                    isPlaying={isTrackPlaying(track.id)}
                    onTogglePlay={handleTogglePlay}
                  />
                ))
              )}

            </div>
          </div>

          <MiniPlayer />

          <FooterNav
            activeTab={activeNav}
            onTabPress={(tab) => {
              setActiveNav(tab);
              if (tab === "search") setScreen("search");
              if (tab === "mymusic") setScreen("mymusic");
              if (tab === "radio") setScreen("radio");
              if (tab === "bulletin") setScreen("bulletin");
            }}
          />

          <FullPlayer />
          <ProfilePanel />
          <PublicPlaylistPanel />

        </div>
      </div>
    </>
  );
}