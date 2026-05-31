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
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  gold: "#f5cf00",
};

// ─── Album Card ───────────────────────────────────────────────────────────────
const AlbumCard = ({ track, onPlay, size = 120, currentTrack, isPlaying }) => {
  const isCurrentTrack = currentTrack && 
    `${currentTrack.title}|${currentTrack.artist}` === `${track.title}|${track.artist}`;
  const showPause = isCurrentTrack && isPlaying;
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hue = track.artist?.charCodeAt(0) * 37 % 360 || 200;

  return (
    <div
      onClick={() => onPlay(track)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        width: size,
        cursor: "pointer",
        transition: "transform 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* Album art */}
      <div style={{
        width: size, height: size,
        borderRadius: "10px", overflow: "hidden",
        backgroundColor: colors.bgCard,
        marginBottom: "8px",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.2)",
        transition: "box-shadow 0.2s ease",
        position: "relative",
      }}>
        {track.coverUrl && !imgError ? (
          <img
            src={track.coverUrl}
            alt={track.album}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, hsl(${hue}, 50%, 30%), hsl(${hue + 40}, 40%, 20%))`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.5" />
              <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.5" />
            </svg>
          </div>
        )}

        {/* Play overlay on hover */}
        {(hovered || isCurrentTrack) && (
            <div style={{
                position: "absolute", inset: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <div style={{
                width: 36, height: 36, borderRadius: "50%",
                backgroundColor: colors.teal,
                display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                {showPause ? (
                    <div style={{ display: "flex", gap: "3px" }}>
                    <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                    <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                    </div>
                ) : (
                    <div style={{
                    width: 0, height: 0,
                    borderTop: "7px solid transparent",
                    borderBottom: "7px solid transparent",
                    borderLeft: "12px solid #1a1a1a",
                    marginLeft: 3,
                    }} />
                )}
                </div>
            </div>
            )}
      </div>

      {/* Track info */}
      <div style={{
        fontSize: "12px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        marginBottom: "2px",
      }}>
        {track.title}
      </div>
      <div style={{
        fontSize: "11px", color: colors.muted,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {track.artist}
      </div>
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, index = 0 }) => (
  <div style={{
    marginBottom: "14px",
    animation: `fadeSlideUp 0.4s ease ${index * 0.1}s forwards`,
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

// ─── Horizontal Scroll Row ────────────────────────────────────────────────────
const ScrollRow = ({ tracks, onPlay, emptyMessage, currentTrack, isPlaying, index = 0 }) => {
  if (!tracks || tracks.length === 0) {
    return (
      <div style={{
        height: "120px", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: colors.bgCard, borderRadius: "12px",
        marginBottom: "28px",
        animation: `fadeSlideUp 0.4s ease ${index * 0.1 + 0.05}s forwards`,
        opacity: 0,
      }}>
        <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", textAlign: "center", padding: "0 20px" }}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: "14px",
      overflowX: "auto", paddingBottom: "8px",
      marginBottom: "28px",
      scrollbarWidth: "none",
    }}>
      {tracks.map((track, i) => (
    <AlbumCard 
      key={i} 
      track={track} 
      onPlay={onPlay}
      currentTrack={currentTrack}
      isPlaying={isPlaying}
    />
  ))}
    </div>
  );
};

// ─── Purchased Empty State ────────────────────────────────────────────────────
const PurchasedSection = () => (
  <div style={{
    backgroundColor: colors.bgCard,
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "28px",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "12px", textAlign: "center",
    border: `1px solid ${colors.border}`,
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: "50%",
      backgroundColor: colors.tealGlow,
      border: `1px solid ${colors.teal}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m5-9v9m4-9v9m4-9l2 9" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
      No purchases yet
    </div>
    <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", lineHeight: 1.5 }}>
      Music you purchase on Ponytail will live here. Support your favorite independent artists directly.
    </div>
    <div style={{
      fontSize: "11px", fontWeight: "600", color: colors.teal,
      fontFamily: "'Kanit', sans-serif", letterSpacing: "0.5px",
      padding: "6px 16px", borderRadius: "20px",
      border: `1px solid ${colors.teal}`,
      cursor: "pointer",
    }}>
      Browse Music
    </div>
  </div>
);

// ─── My Music Screen ──────────────────────────────────────────────────────────
export default function MyMusicScreen({ setScreen }) {
  const [user, setUser] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [activeNav, setActiveNav] = useState("mymusic");
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [loadingNew, setLoadingNew] = useState(true);

  const { playTrack, playHistory, currentTrack, isPlaying } = usePlayer();
  const [frozenHistory, setFrozenHistory] = useState([]);

   // ── Snapshot play history on mount ──
  useEffect(() => {
    setFrozenHistory([...playHistory]);
  }, []);

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

  // ── Fetch suggested tracks once on mount ──
useEffect(() => {
  const fetchSuggested = async () => {
    setLoadingSuggested(true);
    try {
      const genres = [...new Set(playHistory.map(t => t.genre).filter(Boolean))];
      const genreParam = genres.length > 0 ? `&genres=${encodeURIComponent(genres.join(','))}` : '';
      const res = await fetch(`http://localhost:5000/api/auth/tracks/suggested?limit=10${genreParam}`);
      const data = await res.json();
      setSuggested(data.tracks || []);
    } catch (err) {
      console.log('Failed to fetch suggested:', err);
    } finally {
      setLoadingSuggested(false);
    }
  };
  fetchSuggested();
}, []); // 

  // ── Fetch new releases ──
  useEffect(() => {
    const fetchNewReleases = async () => {
      setLoadingNew(true);
      try {
        const res = await fetch('http://localhost:5000/api/auth/tracks/new-releases?limit=10');
        const data = await res.json();
        setNewReleases(data.tracks || []);
      } catch (err) {
        console.log('Failed to fetch new releases:', err);
      } finally {
        setLoadingNew(false);
      }
    };
    fetchNewReleases();
  }, []);

  const handlePlay = (track) => {
    playTrack(
      track,
      [track],
      0
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
        <div style={{
        padding: "8px 20px 16px",
        backgroundColor: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
        }}>
        <div style={{ fontSize: "16px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
            My Music
        </div>
        <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px", minHeight: "18px" }}>
            {user?.username || ""}
        </div>
        </div>

          {/* ── Scrollable content ── */}
          <div style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            padding: "20px 16px 0",
            width: "100%", boxSizing: "border-box", minHeight: 0,
          }}>

            {/* ── Recently Played ── */}
            <SectionHeader
              title="Recently Played"
              subtitle={frozenHistory.length === 0 ? null : `${frozenHistory.length} track${frozenHistory.length === 1 ? '' : 's'}`}
            />
            <ScrollRow
                tracks={frozenHistory}
                onPlay={handlePlay}
                emptyMessage="Tracks you play will appear here"
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                index={0} 
            />

            {/* ── Suggested For You ── */}
            <SectionHeader
              title="Suggested For You"
              subtitle={playHistory.length > 0 ? "Based on your listening" : "Explore something new"}
            />
            <ScrollRow
                tracks={loadingSuggested ? [] : suggested}
                onPlay={handlePlay}
                emptyMessage={loadingSuggested ? "Loading..." : "No suggestions yet"}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                index={1} 
            />

            {/* ── Purchased ── */}
            <SectionHeader title="Purchased" subtitle="Music you own" />
            <PurchasedSection 
                index={2}
            />

            {/* ── New Releases ── */}
            <SectionHeader title="New Releases" subtitle="Recently added to Ponytail" />
            <ScrollRow
                tracks={loadingNew ? [] : newReleases}
                onPlay={handlePlay}
                emptyMessage={loadingNew ? "Loading..." : "Nothing new yet"}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                index={3} 
            />

            {/* Bottom padding */}
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
              if (tab === "radio") setScreen("radio");
            }}
          />

          {/* ── Full Player ── */}
          <FullPlayer />

        </div>
      </div>
    </>
  );
}