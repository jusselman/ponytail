import { useState, useRef, useEffect } from "react";
import { getMe } from '../services/authService';
import MiniPlayer from '../components/MiniPlayer';
import FooterNav from '../components/FooterNav';

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
  "Ambient", "Neo Soul", "Indie Folk", "Dream Pop",
  "Lo-fi", "Jazz Fusion", "Shoegaze", "Post-Rock",
  "Experimental", "R&B", "Electronic", "Alt Hip Hop",
];

// ─── Mock discovery pool for Tinder tab ──────────────────────────────────────
const MOCK_DISCOVERY_POOL = [
  { id: "d1", name: "Nola Voss", genre: "Ambient / Electronic", tags: ["Chill", "Atmospheric"], hue: 180 },
  { id: "d2", name: "Cass Ember", genre: "Indie Folk", tags: ["Acoustic", "Storytelling"], hue: 30 },
  { id: "d3", name: "Maren Hex", genre: "Dream Pop", tags: ["Ethereal", "Shoegaze"], hue: 270 },
  { id: "d4", name: "Theo Callum", genre: "Lo-fi Hip Hop", tags: ["Beats", "Mellow"], hue: 60 },
  { id: "d5", name: "Isla Pryor", genre: "Shoegaze", tags: ["Layered", "Cinematic"], hue: 200 },
  { id: "d6", name: "Ryn Holt", genre: "Jazz Fusion", tags: ["Improvisational", "Complex"], hue: 140 },
  { id: "d7", name: "Pave Lune", genre: "Neo Soul", tags: ["Soulful", "Groovy"], hue: 320 },
  { id: "d8", name: "Ellory Sun", genre: "Experimental", tags: ["Avant-garde", "Textural"], hue: 90 },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 42, hue }) => {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const h = hue ?? (name.charCodeAt(0) * 37 % 360);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
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
const StandardSearch = ({ loved, user }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);

  const searchArtists = async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/artists/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults((data.artists || []).map(a => ({
        type: "artist",
        id: a.id,
        name: a.name,
        disambiguation: a.disambiguation || null,
      })));
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
    debounceRef.current = setTimeout(() => searchArtists(val), 350);
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
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "10px 0",
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <Avatar name={result.name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {result.name}
                </div>
                {result.disambiguation && (
                  <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                    {result.disambiguation}
                  </div>
                )}
              </div>
              <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                Artist
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
                {loved.map((artist, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <div style={{ position: "relative" }}>
                      <Avatar name={artist.name} size={52} hue={artist.hue} />
                      <div style={{ position: "absolute", bottom: -2, right: -2, backgroundColor: colors.teal, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <HeartIcon size={10} color="#1a1a1a" filled />
                      </div>
                    </div>
                    <div style={{ fontSize: "10px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", textAlign: "center", maxWidth: "52px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {artist.name}
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
                padding: "9px 0", borderBottom: `1px solid ${colors.border}`,
                cursor: "pointer",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: colors.bgCard, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.type === "artist" ? <ClockIcon /> : <MusicNoteIcon />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
                    {item.name}
                  </div>
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
                    cursor: "pointer",
                    transition: "opacity 0.2s ease",
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

// ─── Discovery Card (Tinder style) ───────────────────────────────────────────
const DiscoveryCard = ({ artist, onLike, onSkip }) => {
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(null);
  const startY = useRef(null);
  const cardRef = useRef(null);

  const SWIPE_THRESHOLD = 80;
  const rotation = dragX * 0.08;
  const likeOpacity = Math.max(0, Math.min(1, dragX / SWIPE_THRESHOLD));
  const skipOpacity = Math.max(0, Math.min(1, -dragX / SWIPE_THRESHOLD));

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
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      if (dragX > SWIPE_THRESHOLD) onLike();
      else if (dragX < -SWIPE_THRESHOLD) onSkip();
      else { setDragX(0); setDragY(0); }
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
  };
  const handleTouchEnd = () => {
    if (dragX > SWIPE_THRESHOLD) onLike();
    else if (dragX < -SWIPE_THRESHOLD) onSkip();
    else { setDragX(0); setDragY(0); }
  };

  const hue = artist.hue;

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "24px",
        overflow: "hidden",
        position: "absolute",
        top: 0, left: 0,
        background: `linear-gradient(160deg, hsl(${hue}, 50%, 25%) 0%, hsl(${hue + 40}, 40%, 15%) 100%)`,
        cursor: isDragging ? "grabbing" : "grab",
        transform: `translateX(${dragX}px) translateY(${dragY * 0.3}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s ease",
        userSelect: "none",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* ── Like / Skip indicators ── */}
      <div style={{
        position: "absolute", top: "32px", left: "24px", zIndex: 10,
        opacity: skipOpacity,
        border: "3px solid #ff4444", borderRadius: "8px",
        padding: "4px 12px",
        transform: "rotate(-15deg)",
      }}>
        <span style={{ fontSize: "22px", fontWeight: "800", color: "#ff4444", fontFamily: "'Kanit', sans-serif", letterSpacing: "2px" }}>SKIP</span>
      </div>
      <div style={{
        position: "absolute", top: "32px", right: "24px", zIndex: 10,
        opacity: likeOpacity,
        border: `3px solid ${colors.teal}`, borderRadius: "8px",
        padding: "4px 12px",
        transform: "rotate(15deg)",
      }}>
        <span style={{ fontSize: "22px", fontWeight: "800", color: colors.teal, fontFamily: "'Kanit', sans-serif", letterSpacing: "2px" }}>LOVE</span>
      </div>

      {/* ── Artist avatar — large centered ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", paddingTop: "20px" }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: `linear-gradient(135deg, hsl(${hue}, 60%, 50%), hsl(${hue + 40}, 70%, 40%))`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 48, fontWeight: "700", color: "#fff",
          fontFamily: "'Kanit', sans-serif",
          boxShadow: `0 0 40px rgba(${hue}, 100, 150, 0.4)`,
          border: "3px solid rgba(255,255,255,0.15)",
        }}>
          {artist.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
        </div>
      </div>

      {/* ── Artist info ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
        padding: "40px 24px 24px",
      }}>
        <div style={{ fontSize: "26px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.5px", marginBottom: "6px" }}>
          {artist.name}
        </div>
        <div style={{ fontSize: "14px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginBottom: "10px" }}>
          {artist.genre}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {artist.tags.map((tag, i) => (
            <div key={i} style={{
              fontSize: "11px", fontWeight: "600",
              color: colors.teal, backgroundColor: colors.tealGlow,
              border: `1px solid ${colors.teal}`,
              borderRadius: "20px", padding: "3px 10px",
              fontFamily: "'Kanit', sans-serif",
            }}>
              {tag}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Discovery Tab (Tinder style) ─────────────────────────────────────────────
const DiscoverySearch = ({ onLove }) => {
  const [pool, setPool] = useState([...MOCK_DISCOVERY_POOL]);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(null); // "like" | "skip" | null

  const handleLike = () => {
    if (current >= pool.length) return;
    onLove(pool[current]);
    setAnimating("like");
    setTimeout(() => {
      setCurrent(prev => prev + 1);
      setAnimating(null);
    }, 300);
  };

  const handleSkip = () => {
    if (current >= pool.length) return;
    setAnimating("skip");
    setTimeout(() => {
      setCurrent(prev => prev + 1);
      setAnimating(null);
    }, 300);
  };

  const remaining = pool.length - current;
  const artist = pool[current];
  const nextArtist = pool[current + 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 16px 16px", boxSizing: "border-box" }}>

      {/* ── Card stack area ── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {remaining === 0 ? (
          <div style={{
            width: "100%", height: "100%", borderRadius: "24px",
            backgroundColor: colors.bgCard,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "16px",
          }}>
            <div style={{ fontSize: "32px" }}>
              <HeartIcon size={48} color={colors.teal} filled />
            </div>
            <div style={{ fontSize: "18px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
              You've seen everyone!
            </div>
            <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", textAlign: "center", paddingHorizontal: 20 }}>
              Check the Loved tab to revisit artists you liked.
            </div>
            <button
              onClick={() => { setPool([...MOCK_DISCOVERY_POOL]); setCurrent(0); }}
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
            {/* Next card (peek behind) */}
            {nextArtist && (
              <div style={{
                position: "absolute", top: "8px", left: "8px", right: "8px", bottom: 0,
                borderRadius: "24px",
                background: `linear-gradient(160deg, hsl(${nextArtist.hue}, 50%, 25%) 0%, hsl(${nextArtist.hue + 40}, 40%, 15%) 100%)`,
                transform: "scale(0.96)",
                zIndex: 0,
              }} />
            )}

            {/* Current card */}
            <DiscoveryCard
              key={current}
              artist={artist}
              onLike={handleLike}
              onSkip={handleSkip}
            />
          </>
        )}
      </div>

      {/* ── Action buttons ── */}
      {remaining > 0 && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: "32px", paddingTop: "16px", flexShrink: 0,
        }}>
          {/* Skip button */}
          <button
            onClick={handleSkip}
            style={{
              width: 56, height: 56, borderRadius: "50%",
              backgroundColor: colors.bgCard,
              border: "2px solid #ff4444",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,68,68,0.1)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.bgCard}
          >
            <XIcon size={24} color="#ff4444" />
          </button>

          {/* Remaining count */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
              {remaining}
            </div>
            <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.5px" }}>
              left
            </div>
          </div>

          {/* Like button */}
          <button
            onClick={handleLike}
            style={{
              width: 56, height: 56, borderRadius: "50%",
              backgroundColor: colors.bgCard,
              border: `2px solid ${colors.teal}`,
              display: "flex", alignItems: "center", justifyContent: "center",
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

  const handleLove = (artist) => {
    setLoved(prev => {
      if (prev.find(a => a.id === artist.id)) return prev;
      return [...prev, artist];
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
          backgroundColor: colors.bg,
          borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative", overflow: "hidden",
          marginTop: "40px", marginBottom: "40px",
          display: "flex", flexDirection: "column",
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: "32px 20px 0",
            backgroundColor: colors.bg,
            borderBottom: `1px solid ${colors.border}`,
            width: "100%", boxSizing: "border-box", flexShrink: 0,
          }}>
            <div style={{ fontSize: "20px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.5px", marginBottom: "16px" }}>
              Search
            </div>

            {/* ── Inner tabs ── */}
            <div style={{ display: "flex", gap: "4px", width: "100%" }}>
              {[
                { key: "search", label: "Artists & Tracks" },
                { key: "discovery", label: "Discover" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, padding: "10px",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: activeTab === tab.key ? "700" : "400",
                    color: activeTab === tab.key ? colors.teal : colors.muted,
                    fontFamily: "'Kanit', sans-serif",
                    borderBottom: `2px solid ${activeTab === tab.key ? colors.teal : "transparent"}`,
                    transition: "all 0.2s ease",
                    marginBottom: "-1px",
                    boxSizing: "border-box",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <div style={{
            flex: 1, overflowY: activeTab === "search" ? "auto" : "hidden",
            overflowX: "hidden", paddingTop: "16px",
            width: "100%", boxSizing: "border-box", minHeight: 0,
          }}>
            {activeTab === "search" && (
              <StandardSearch loved={loved} user={user} />
            )}
            {activeTab === "discovery" && (
              <DiscoverySearch onLove={handleLove} />
            )}
          </div>

          {/* ── Mini Player ── */}
          <MiniPlayer track={null} />

          {/* ── Footer Nav ── */}
          <FooterNav
            activeTab={activeNav}
            onTabPress={(tab) => {
              setActiveNav(tab);
              if (tab === "home") setScreen("home");
            }}
          />

        </div>
      </div>
    </>
  );
}