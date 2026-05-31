import { useState, useRef, useEffect } from "react";
import { getMe } from '../services/authService';
import AppHeader from '../components/AppHeader';
import MiniPlayer from '../components/MiniPlayer';
import FooterNav from '../components/FooterNav';
import { usePlayer } from '../context/PlayerContext';
import FullPlayer from '../components/FullPlayer';

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

// ─── Mock recent searches ─────────────────────────────────────────────────────
const MOCK_RECENT = [
  { type: "artist", name: "Radiohead", genre: "Alternative Rock" },
  { type: "artist", name: "Dua Lipa", genre: "Pop" },
  { type: "track", name: "Creep", artist: "Radiohead" },
  { type: "artist", name: "Jimi Hendrix", genre: "Classic Rock" },
];

// ─── Mock genre chips ─────────────────────────────────────────────────────────
const MOCK_GENRES = [
  "Jazz", "Classical", "Progressive Rock", "Rock", "Soul",
  "Folk", "Electronic", "Jazz Fusion", "Surf Rock", "New Age",
  "Instrumental Hip Hop", "Post-bop",
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 42, hue, coverUrl }) => {
  const [imgError, setImgError] = useState(false);
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const h = hue ?? (name.charCodeAt(0) * 37 % 360);

  if (coverUrl && !imgError) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "8px",
        overflow: "hidden", flexShrink: 0,
      }}>
        <img
          src={coverUrl}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: "8px",
      background: `linear-gradient(135deg, hsl(${h}, 60%, 45%), hsl(${h + 40}, 70%, 35%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: "700", color: "#fff",
      fontFamily: "'Kanit', sans-serif", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};


// ─── Search Icon ──────────────────────────────────────────────────────────────
const SearchIcon = ({ color = "#666" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <path d="M16.5 16.5L21 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Clear Icon ───────────────────────────────────────────────────────────────
const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Clock Icon ───────────────────────────────────────────────────────────────
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#666" strokeWidth="1.8" />
    <path d="M12 7v5l3 3" stroke="#666" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ─── Music Note Icon ──────────────────────────────────────────────────────────
const MusicNoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke="#666" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke="#666" strokeWidth="1.8" />
    <circle cx="18" cy="16" r="3" stroke="#666" strokeWidth="1.8" />
  </svg>
);

// ─── Heart Icon ───────────────────────────────────────────────────────────────
const HeartIcon = ({ size = 28, color = "#5DEBD7", filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"}>
    <path
      d="M12 21C12 21 3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12z"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

// ─── X Icon ───────────────────────────────────────────────────────────────────
const XIcon = ({ size = 28, color = "#ff4444" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// ─── Standard Search Tab ──────────────────────────────────────────────────────
const StandardSearch = ({ loved }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);
  const { playTrack } = usePlayer();
  

 const searchTracks = async (q) => {
  if (!q || q.length < 2) { setResults([]); return; }
  setSearching(true);
  try {
    const res = await fetch(`http://localhost:5000/api/auth/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    console.log('Raw API response:', data);
    const mapped = (data.results || []).map(r => ({
      type: r.type,
      id: r.name,
      name: r.name,
      genre: r.genre,
      artist: r.artist_name,
      album: r.album,
      coverUrl: r.cover
        ? `http://localhost:5000/covers/${encodeURIComponent(r.cover.split('/covers/')[1])}`
        : null,
    }));
    console.log('Mapped results:', mapped);
    setResults(mapped);
  } catch (err) {
    console.log('Search error:', err);
  } finally {
    setSearching(false);
  }
};

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTracks(val), 350);
  };

  const showResults = query.length >= 2;
  const showEmpty = !query;

  return (
    <div style={{ padding: "0 16px 20px", width: "100%", boxSizing: "border-box" }}>

      {/* ── Search bar ── */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <SearchIcon color={focused ? colors.teal : "#666"} />
        </div>
        <input
          style={{
            width: "100%", padding: "12px 40px 12px 40px",
            borderRadius: "12px", backgroundColor: colors.bgCard,
            border: `1.5px solid ${focused ? colors.teal : "transparent"}`,
            color: colors.text, fontSize: "14px", outline: "none",
            fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
            boxShadow: focused ? `0 0 0 3px rgba(93,235,215,0.1)` : "none",
            transition: "all 0.2s ease",
          }}
          placeholder="Search artists and tracks..."
          value={query}
          onChange={handleQueryChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {query.length > 0 && (
          <button
            onClick={() => { setQuery(""); setResults([]); }}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <ClearIcon />
          </button>
        )}
        {searching && (
          <div style={{ position: "absolute", right: "36px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
            searching...
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {showResults && results.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
            Results
          </div>
          {results.map((result, i) => (
            <div
              key={i}
              onClick={() => {
                if (result.type === "track") {
                  const trackQueue = results
                    .filter(r => r.type === "track")
                    .map(r => ({
                      title: r.name,
                      artist: r.artist,
                      album: r.album,
                      genre: r.genre,
                      coverUrl: r.coverUrl,
                      audioUrl: "http://localhost:5000/audio/dummy.mp3",
                    }));
                  const startIndex = results
                    .filter(r => r.type === "track")
                    .findIndex(r => r.name === result.name);
                  playTrack({
                    title: result.name,
                    artist: result.artist,
                    album: result.album,
                    genre: result.genre,
                    coverUrl: result.coverUrl,
                    audioUrl: "http://localhost:5000/audio/dummy.mp3",
                  }, trackQueue, startIndex);
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 0", borderBottom: `1px solid ${colors.border}`,
                cursor: result.type === "track" ? "pointer" : "default",
              }}
            >
              <Avatar name={result.name} size={38} coverUrl={result.coverUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {result.name}
                </div>
                <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
                  {result.type === "track"
                    ? `${result.artist ? `by ${result.artist}` : ""}${result.album ? ` · ${result.album}` : ""}`
                    : result.genre}
                </div>
              </div>
              <div style={{
                fontSize: "10px",
                color: result.type === "track" ? colors.teal : colors.muted,
                fontFamily: "'Kanit', sans-serif",
                backgroundColor: result.type === "track" ? colors.tealGlow : "transparent",
                border: `1px solid ${result.type === "track" ? colors.teal : colors.border}`,
                padding: "2px 8px", borderRadius: "20px",
                textTransform: "capitalize", flexShrink: 0,
              }}>
                {result.type}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !searching && (
        <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", paddingTop: "20px" }}>
          No results for "{query}"
        </div>
      )}

      {/* ── Empty state ── */}
{showEmpty && (
  <>
    {/* Loved Artists */}
    {loved.length > 0 && (
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
          Loved
        </div>
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
          {loved.map((track, i) => (
            <div
              key={i}
              onClick={() => playTrack(
                {
                  title: track.title,
                  artist: track.artist,
                  album: track.album,
                  genre: track.genre,
                  coverUrl: track.coverUrl,
                  audioUrl: track.audioUrl || "http://localhost:5000/audio/dummy.mp3",
                },
                loved.map(t => ({
                  title: t.title,
                  artist: t.artist,
                  album: t.album,
                  genre: t.genre,
                  coverUrl: t.coverUrl,
                  audioUrl: t.audioUrl || "http://localhost:5000/audio/dummy.mp3",
                })),
                i
              )}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0, cursor: "pointer" }}
            >
              <div style={{ position: "relative" }}>
                <Avatar name={track.artist} size={52} coverUrl={track.coverUrl} />
                <div style={{ position: "absolute", bottom: -2, right: -2, backgroundColor: colors.teal, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <HeartIcon size={10} color="#1a1a1a" filled />
                </div>
              </div>
              <div style={{ fontSize: "10px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", textAlign: "center", maxWidth: "52px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {track.artist}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

   {/* Recent searches */}
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
        Recent
      </div>
      {MOCK_RECENT.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "9px 0", borderBottom: `1px solid ${colors.border}`, cursor: "pointer",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: colors.bgCard, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {item.type === "artist" ? <ClockIcon /> : <MusicNoteIcon />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>{item.name}</div>
            <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
              {item.type === "artist" ? item.genre : `by ${item.artist}`}
            </div>
          </div>
          <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif", textTransform: "capitalize" }}>
            {item.type}
          </div>
        </div>
      ))}
    </div>

    {/* Genre chips */}
    <div>
      <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
        Browse by Genre
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {MOCK_GENRES.map((genre, i) => {
          const hue = (i * 37 + 160) % 360;
          return (
            <div key={i} style={{
              padding: "6px 14px", borderRadius: "20px",
              background: `linear-gradient(135deg, hsl(${hue}, 35%, 28%), hsl(${hue + 30}, 30%, 22%))`,
              border: `1px solid hsl(${hue}, 40%, 35%)`,
              fontSize: "12px", fontWeight: "500",
              color: colors.text, fontFamily: "'Kanit', sans-serif",
              cursor: "pointer", transition: "opacity 0.2s ease",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {genre}
            </div>
          );
        })}
      </div>
    </div>
  </>
)}
</div>
  );
};

// ─── Discovery Card (Tinder style) ────────────────────────────────────────────
const DiscoveryCard = ({ track, onLike, onSkip, isLoaded, onDrag, inactive = false }) => {
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const audioRef = useRef(null);

  const SWIPE_THRESHOLD = 80;
  const rotation = dragX * 0.08;
  const likeOpacity = Math.max(0, Math.min(1, dragX / SWIPE_THRESHOLD));
  const skipOpacity = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));

  // ── Auto-play audio when card mounts ──
  useEffect(() => {
    if (inactive || !audioRef.current) return;
    audioRef.current.volume = 0.6;
    audioRef.current.play().catch(() => console.log('Autoplay blocked'));
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [inactive]);

  // ── Mouse drag ──
  const handleMouseDown = (e) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      setDragX(e.clientX - startX.current);
      setDragY(e.clientY - startY.current);
      onDrag && onDrag(e.clientX - startX.current);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      if (dragX > SWIPE_THRESHOLD) {
        onLike();
      } else if (dragX < -SWIPE_THRESHOLD) {
        onSkip();
      } else {
        setDragX(0);
        setDragY(0);
        onDrag && onDrag(0);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragX]);

  // ── Touch drag ──
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    setDragX(e.touches[0].clientX - startX.current);
    setDragY(e.touches[0].clientY - startY.current);
    onDrag && onDrag(e.touches[0].clientX - startX.current);
  };
  const handleTouchEnd = () => {
    if (dragX > SWIPE_THRESHOLD) onLike();
    else if (dragX < -SWIPE_THRESHOLD) onSkip();
    else { setDragX(0); setDragY(0); }
    onDrag && onDrag(0);
  };

  const hue = track.artist ? track.artist.charCodeAt(0) * 37 % 360 : 200;

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: "100%", height: "100%",
        borderRadius: "24px", overflow: "hidden",
        position: "absolute", top: 0, left: 0,
        cursor: isDragging ? "grabbing" : "grab",
        transform: `translateX(${dragX}px) translateY(${dragY * 0.3}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s ease",
        userSelect: "none",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        pointerEvents: inactive ? "none" : "all", 
      }}
    >
      {/* ── Hidden audio element ── */}
      <audio ref={audioRef} src={track.audioUrl} loop />

      {/* ── Background — album art or gradient ── */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, hsl(${hue}, 50%, 25%) 0%, hsl(${hue + 40}, 40%, 15%) 100%)` }}>
        {track.coverUrl && (
          <img
            src={track.coverUrl}
            alt={track.album}
            onLoad={() => {}} // no-op, loading tracked by parent
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              opacity: isLoaded ? 0.5 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
        )}
        {/* Dark overlay for readability */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0.92) 100%)" }} />
      </div>

      {/* ── Like / Skip indicators ── */}
      <div style={{
        position: "absolute", top: "32px", left: "24px", zIndex: 10,
        opacity: skipOpacity, border: "3px solid #ff4444", borderRadius: "8px", padding: "4px 12px",
        transform: "rotate(-15deg)",
      }}>
        <span style={{ fontSize: "22px", fontWeight: "800", color: "#ff4444", fontFamily: "'Kanit', sans-serif", letterSpacing: "2px" }}>SKIP</span>
      </div>
      <div style={{
        position: "absolute", top: "32px", right: "24px", zIndex: 10,
        opacity: likeOpacity, border: `3px solid ${colors.teal}`, borderRadius: "8px", padding: "4px 12px",
        transform: "rotate(15deg)",
      }}>
        <span style={{ fontSize: "22px", fontWeight: "800", color: colors.teal, fontFamily: "'Kanit', sans-serif", letterSpacing: "2px" }}>LOVE</span>
      </div>

      {/* ── Track info ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "24px 24px 24px",
        zIndex: 1,
      }}>
        {/* Album art thumbnail */}
        {track.coverUrl && (
          <div style={{
            width: 56, height: 56, borderRadius: "10px", overflow: "hidden",
            marginBottom: "14px",
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}>
            <img src={track.coverUrl} alt={track.album} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ fontSize: "22px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px", marginBottom: "4px", lineHeight: 1.2 }}>
          {track.title}
        </div>
        <div style={{ fontSize: "15px", color: colors.teal, fontFamily: "'Kanit', sans-serif", fontWeight: "600", marginBottom: "4px" }}>
          {track.artist}
        </div>
        <div style={{ fontSize: "13px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginBottom: "10px" }}>
          {track.album}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {track.genre && (
            <div style={{
              fontSize: "11px", fontWeight: "600", color: colors.teal,
              backgroundColor: colors.tealGlow, border: `1px solid ${colors.teal}`,
              borderRadius: "20px", padding: "3px 10px", fontFamily: "'Kanit', sans-serif",
            }}>
              {track.genre}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Discovery Tab ────────────────────────────────────────────────────────────
const DiscoverySearch = ({ onLove }) => {
  const [pool, setPool] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedImages, setLoadedImages] = useState({}); 
  const [dragX, setDragX] = useState(0);

  // ── Preload next card's image and track loaded state ──
  useEffect(() => {
    const preload = (track) => {
      if (!track?.coverUrl) return;
      if (loadedImages[track.coverUrl]) return; // already loaded
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => ({ ...prev, [track.coverUrl]: true }));
      };
      img.src = track.coverUrl;
    };
    preload(pool[current]);
    preload(pool[current + 1]);
  }, [current, pool]);

  // ── Fetch random tracks from backend ──
  useEffect(() => {
    const fetchTracks = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/api/auth/tracks/random?limit=15');
        const data = await res.json();
        setPool(data.tracks || []);
      } catch (err) {
        console.log('Failed to fetch tracks:', err);
        setError('Could not load tracks. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchTracks();
  }, []);

  const handleLike = () => {
    if (current >= pool.length) return;
    onLove(pool[current]);
    setCurrent(prev => prev + 1);
    setDragX(0); 
  };

  const handleSkip = () => {
    if (current >= pool.length) return;
    setCurrent(prev => prev + 1);
    setDragX(0);
  };

  const remaining = pool.length - current;
  const track = pool[current];
  const nextTrack = pool[current + 1];
    const peekScale = 0.96 + (Math.min(Math.abs(dragX), 80) / 80) * 0.04;

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ fontSize: "14px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
          Loading tracks...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ fontSize: "14px", color: "#ff6b6b", fontFamily: "'Kanit', sans-serif", textAlign: "center" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 16px 16px", boxSizing: "border-box" }}>

      {/* Card stack — render current and next simultaneously */}
<div style={{ flex: 1, position: "relative", minHeight: 0 }}>
  {remaining === 0 ? (
    <div style={{
      width: "100%", height: "100%", borderRadius: "24px",
      backgroundColor: colors.bgCard,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px",
    }}>
      <HeartIcon size={48} color={colors.teal} filled />
      <div style={{ fontSize: "18px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
        You've heard everything!
      </div>
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", textAlign: "center" }}>
        Check the Loved tab to revisit tracks you liked.
      </div>
      <button
        onClick={() => { setCurrent(0); setDragX(0); }}
        style={{
          marginTop: "8px", padding: "10px 24px", borderRadius: "50px",
          backgroundColor: colors.teal, border: "none",
          color: "#1a1a1a", fontSize: "14px", fontWeight: "600",
          cursor: "pointer", fontFamily: "'Kanit', sans-serif",
        }}
      >
        Start over
      </button>
    </div>
  ) : (
    <>
      {/* Next card — always a full DiscoveryCard, rendered behind */}
      {nextTrack && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          transform: `scale(${peekScale})`,
          transition: dragX === 0 ? "transform 0.3s ease" : "none",
          transformOrigin: "center bottom",
        }}>
          <DiscoveryCard
            key={`next-${current + 1}`}
            track={nextTrack}
            isLoaded={!!loadedImages[nextTrack.coverUrl]}
            onLike={() => {}}
            onSkip={() => {}}
            onDrag={() => {}}
            inactive
          />
        </div>
      )}

      {/* Current card — on top, fully interactive */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <DiscoveryCard
          key={`card-${current}`}
          track={track}
          isLoaded={!!loadedImages[track.coverUrl]}
          onLike={handleLike}
          onSkip={handleSkip}
          onDrag={setDragX}
        />
      </div>
    </>
  )}
</div>

      {/* ── Action buttons ── */}
      {remaining > 0 && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: "32px", paddingTop: "16px", flexShrink: 0,
        }}>
          <button
            onClick={handleSkip}
            style={{
              width: 56, height: 56, borderRadius: "50%", backgroundColor: colors.bgCard,
              border: "2px solid #ff4444", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,68,68,0.1)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.bgCard}
          >
            <XIcon size={24} color="#ff4444" />
          </button>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
              {remaining}
            </div>
            <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.5px" }}>
              left
            </div>
          </div>

          <button
            onClick={handleLike}
            style={{
              width: 56, height: 56, borderRadius: "50%", backgroundColor: colors.bgCard,
              border: `2px solid ${colors.teal}`, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.tealGlow}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.bgCard}
          >
            <HeartIcon size={24} color={colors.teal} />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Search Screen ────────────────────────────────────────────────────────────
export default function SearchScreen({ setScreen }) {
  const [activeTab, setActiveTab] = useState("search");
  const [loved, setLoved] = useState([]);
  const [user, setUser] = useState(null);
  const [activeNav, setActiveNav] = useState("search");
  const { isPlayerOpen, isPlaying, togglePlay } = usePlayer();

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

  const handleLove = (track) => {
    setLoved(prev => {
      const key = `${track.title}|${track.artist}`;
      if (prev.find(t => `${t.title}|${t.artist}` === key)) return prev;
      return [...prev, track];
    });
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
<div style={{
  padding: "32px 20px 0",
  backgroundColor: colors.bg,
  position: "sticky", top: 0, zIndex: 10,
  borderBottom: `1px solid ${colors.border}`,
  width: "100%", boxSizing: "border-box", flexShrink: 0,
}}>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
    <div style={{ fontSize: "20px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.5px" }}>
      ponytail
      <span style={{
        display: "inline-block", width: "6px", height: "6px",
        borderRadius: "50%", backgroundColor: colors.teal,
        marginLeft: "4px", marginBottom: "6px",
      }} />
    </div>
    <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
      <div style={{ borderRadius: "50%", overflow: "hidden", width: 34, height: 34 }}>
        <Avatar name={user?.username || "User"} size={34} />
      </div>
  </button>
  </div>
  <div style={{ display: "flex", gap: "4px", width: "100%" }}>
    {[
      { key: "search", label: "Artists & Tracks" },
      { key: "discovery", label: "Discover" },
    ].map(tab => (
      <button
        key={tab.key}
        onClick={() => {
          if (tab.key === "discovery" && isPlaying) togglePlay();
          setActiveTab(tab.key);
        }}
        style={{
          flex: 1, padding: "10px", background: "none", border: "none", cursor: "pointer",
          fontSize: "13px",
          fontWeight: activeTab === tab.key ? "700" : "400",
          color: activeTab === tab.key ? colors.teal : colors.muted,
          fontFamily: "'Kanit', sans-serif",
          borderBottom: `2px solid ${activeTab === tab.key ? colors.teal : "transparent"}`,
          transition: "all 0.2s ease", marginBottom: "-1px", boxSizing: "border-box",
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
</div>
          {/* ── Tab content ── */}
          <div style={{
            flex: 1,
            overflowY: activeTab === "search" ? "auto" : "hidden",
            overflowX: "hidden", paddingTop: "16px",
            width: "100%", boxSizing: "border-box", minHeight: 0,
          }}>
            {activeTab === "search" && <StandardSearch loved={loved} user={user} />}
            {activeTab === "discovery" && <DiscoverySearch onLove={handleLove} />}
          </div>

          {/* ── Mini Player ── */}
          {activeTab !== "discovery" && <MiniPlayer />}

          {/* ── Footer Nav ── */}
          <FooterNav
              activeTab={activeNav}
              onTabPress={(tab) => {
                setActiveNav(tab);
                if (tab === "home") setScreen("home");
                if (tab === "mymusic") setScreen("mymusic");
                if (tab === "radio") setScreen("radio");
                if (tab === "bulletin") setScreen("bulletin");
              }}
          />
          {/* ── Full Screen Player ── */}
          <FullPlayer />
        </div>
      </div>
    </>
  );
}