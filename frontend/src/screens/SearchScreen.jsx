import { useState, useRef, useEffect } from "react";
import { getMe } from '../services/authService';
import { useUI } from '../context/UIContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../components/AppHeader';
import MiniPlayer from '../components/MiniPlayer';
import FooterNav from '../components/FooterNav';
import { usePlayer } from '../context/PlayerContext';
import ProfilePanel from '../components/ProfilePanel';
import UserProfilePanel from '../components/UserProfilePanel';
import PublicPlaylistPanel from '../components/PublicPlaylistPanel';
import FullPlayer from '../components/FullPlayer';
import ArtistPanel from '../components/ArtistPanel';
import AlbumPanel from '../components/AlbumPanel';

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

// ─── Real genre chips, pulled from seed_tracks, ordered by track count ─────────
const MOCK_GENRES = [
  "Rock", "Jazz", "Pop", "Hip-Hop", "Electronic", "Folk", "Classical",
  "Country", "Metal", "Soul", "Punk", "R&B", "Funk", "World", "Reggae",
  "Soundtrack", "Latin", "Blues", "Brazilian", "Dance", "Experimental",
  "Industrial", "Ska", "Indie", "Vocal", "Musical", "Afrobeat", "Alternative",
  "Acoustic", "Chanson", "MPB", "Flamenco",
];

// ─── Elongated genre picker ordering (Andrew's spec) — top 5 always shown,
// the remaining 27 revealed via "Show All" in this exact order with counts ───
const TOP_GENRES = ["Rock", "Jazz", "Pop", "Hip-Hop", "Electronic"];
const MORE_GENRES = [
  { name: "Folk", count: 923 },
  { name: "Classical", count: 899 },
  { name: "Country", count: 467 },
  { name: "Punk", count: 459 },
  { name: "Soul", count: 457 },
  { name: "Metal", count: 431 },
  { name: "R&B", count: 335 },
  { name: "Funk", count: 218 },
  { name: "World", count: 163 },
  { name: "Reggae", count: 81 },
  { name: "Soundtrack", count: 66 },
  { name: "Latin", count: 65 },
  { name: "Blues", count: 63 },
  { name: "Experimental", count: 50 },
  { name: "Acoustic", count: 44 },
  { name: "Indie", count: 38 },
  { name: "Dance", count: 35 },
  { name: "Industrial", count: 35 },
  { name: "Ska", count: 25 },
  { name: "Vocal", count: 22 },
  { name: "Brazilian", count: 21 },
  { name: "Afrobeat", count: 18 },
  { name: "Musical", count: 18 },
  { name: "Alternative", count: 17 },
  { name: "Chanson", count: 15 },
  { name: "MPB", count: 13 },
  { name: "Flamenco", count: 11 },
];

// ─── Same hue formula the Browse-by-Genre grid uses, keyed off each genre's
// position in MOCK_GENRES — keeps a given genre the same color everywhere ───
const genreHue = (genreName) => {
  const idx = MOCK_GENRES.indexOf(genreName);
  return ((idx >= 0 ? idx : 0) * 37 + 160) % 360;
};

// ─── Vinyl case overlay images ─────────────────────────────────────────────────
const VINYL_CASES = [
  'Vinyl-Relic1.png',
  'Vinyl-Relic2.png',
  'Vinyl-Relic3.png',
  'Vinyl-VG.png',
  'Vinyl-mint.png',
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

// ─── Elongated genre row — full-width (matches search bar width/radius), name
// centered, flush against its neighbors (no gap). Colored like the original
// Browse-by-Genre chips (per-genre hue gradient), white text. The "Show All"
// row uses a flat gray background instead of a hue gradient. ───
const ElongatedGenreRow = ({ label, onSelect, hue = 0, isShowAll = false }) => (
  <div
    onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
    style={{
      width: "100%", padding: "12px 0", borderRadius: "12px",
      textAlign: "center", boxSizing: "border-box",
      background: isShowAll
        ? "#555555"
        : `linear-gradient(135deg, hsl(${hue}, 35%, 28%), hsl(${hue + 30}, 30%, 22%))`,
      color: "#ffffff",
      fontSize: "13px", fontWeight: "500",
      fontFamily: "'Kanit', sans-serif",
      cursor: "pointer",
    }}
  >
    {label}
  </div>
);

// ─── Standard Search Tab ──────────────────────────────────────────────────────
const StandardSearch = ({ loved, onArtistTap, onAlbumTap, onUserTap, selectedGenres, onToggleGenre }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const { playStandaloneTrack, playTrack } = usePlayer();
  const [recentActivity, setRecentActivity] = useState([]);


 const searchTracks = async (q) => {
  if (!q || q.length < 2) { setResults([]); return; }
  setSearching(true);
  try {
    const params = new URLSearchParams();
    params.set('q', q);
    if (selectedGenres.length > 0) params.set('genres', selectedGenres.join(','));
    const res = await fetch(`http://localhost:5000/api/auth/search?${params.toString()}`);
    const data = await res.json();
    const mapped = (data.results || []).map(r => ({
      type: r.type,
      id: r.name,
      name: r.name,
      genre: r.genre,
      artist: r.artist_name,
      album: r.album,
      username: r.username || null,
      coverUrl: r.coverUrl || null,
      audioUrl: r.audioUrl || null,
    }));
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

  // ── Re-run the active search whenever the genre filter changes, so selecting
  // or removing a genre chip re-filters results without requiring a re-type ──
  useEffect(() => {
    if (query.length >= 2) searchTracks(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenres]);

  const showResults = query.length >= 2;
  const showEmpty = !query;

  // ── Elongated genre picker shows whenever the bar is focused and empty —
  // picking a genre just removes it from this list (it stays open, showing
  // whatever's left); only typing a query or hitting the search bar's X closes it ──
  const showGenrePicker = focused && query.length === 0;
  const visibleTopGenres = TOP_GENRES.filter(g => !selectedGenres.includes(g));
  const visibleMoreGenres = MORE_GENRES.filter(g => !selectedGenres.includes(g.name));

  // ── Collapse back to the top-5 view any time the picker closes, so it doesn't
  // reopen already-expanded next time the user taps the search bar ──
  useEffect(() => {
    if (!showGenrePicker) setShowAllGenres(false);
  }, [showGenrePicker]);

  const handleClearAndClose = () => {
    setQuery("");
    setResults([]);
    setFocused(false);
    if (inputRef.current) inputRef.current.blur();
  };

  useEffect(() => {
  const fetchRecent = async () => {
      try {
        const token = await AsyncStorage.getItem('ponytail_token');
        const res = await fetch('http://localhost:5000/api/auth/history/recent?limit=10', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        setRecentActivity(data.tracks || []);
      } catch (err) {
        console.log('Failed to fetch recent activity:', err);
      }
    };
    fetchRecent();
  }, []);

  return (
    <div style={{ padding: "0 16px 20px", width: "100%", boxSizing: "border-box" }}>

      {/* ── Search bar ── */}
      <div style={{ position: "relative", marginBottom: "12px" }}>
        <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <SearchIcon color={focused ? colors.teal : "#666"} />
        </div>
        <input
          ref={inputRef}
          style={{
            width: "100%", padding: "12px 40px 12px 40px",
            borderRadius: "12px", backgroundColor: colors.bgCard,
            border: `1.5px solid ${focused ? colors.teal : "transparent"}`,
            color: colors.text, fontSize: "14px", outline: "none",
            fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
            boxShadow: focused ? `0 0 0 3px rgba(93,235,215,0.1)` : "none",
            transition: "all 0.2s ease",
          }}
          placeholder="Check it out!"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {(query.length > 0 || focused) && (
          <button
            onClick={handleClearAndClose}
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

        {/* ── Elongated genre picker — absolutely positioned, stacked above (higher
        z-index than) the Recent/Loved/Browse-by-Genre rows below so it visually
        covers them without removing them from the layout. No wrapping panel —
        rows sit flush against each other, same width/radius as the search bar.
        Tapping a row just removes that genre from this list (it stays open);
        it only closes via the search bar's X. Rows use onMouseDown (not onClick)
        paired with the input's delayed blur above, so taps register before the
        input loses focus. ── */}
        {showGenrePicker && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 50 }}>
            {visibleTopGenres.map(genre => (
              <ElongatedGenreRow key={genre} label={genre} hue={genreHue(genre)} onSelect={() => onToggleGenre(genre)} />
            ))}
            {!showAllGenres ? (
              <ElongatedGenreRow label="Show All" isShowAll onSelect={() => setShowAllGenres(true)} />
            ) : (
              visibleMoreGenres.map(({ name }) => (
                <ElongatedGenreRow key={name} label={name} hue={genreHue(name)} onSelect={() => onToggleGenre(name)} />
              ))
            )}
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
            playStandaloneTrack({
              title: result.name,
              artist: result.artist,
              album: result.album,
              genre: result.genre,
              coverUrl: result.coverUrl,
              audioUrl: result.audioUrl || null,
            });
          } else if (result.type === "artist") {
            onArtistTap(result.name);
          } else if (result.type === "album") {
            onAlbumTap({ artist: result.artist, album: result.name });
          } else if (result.type === "musician" || result.type === "user") {
            onUserTap(result.username);
          }
        }}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 0", borderBottom: `1px solid ${colors.border}`,
                cursor: "pointer",
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
                    : result.type === "musician"
                    ? "Musician"
                    : result.type === "user"
                    ? "Ponytail user"
                    : result.genre}
                </div>
              </div>
              <div style={{
              fontSize: "10px",
              color: colors.teal,
              fontFamily: "'Kanit', sans-serif",
              backgroundColor: colors.tealGlow,
              border: `1px solid ${colors.teal}`,
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
  <div style={{ opacity: 1 }}>
    {/* Recent */}
<div style={{ marginBottom: "6px", animation: "fadeSlideUp 0.4s ease 0.05s forwards", opacity: 0 }}>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
    <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase" }}>
      Recent
    </div>
    {/* ── Selected genre filter chips — small teal chip per selected genre,
    tap to remove. Placed beside the Recent label per spec. ── */}
    {selectedGenres.length > 0 && (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "flex-end" }}>
        {selectedGenres.map(genre => (
          <div
            key={genre}
            onClick={() => onToggleGenre(genre)}
            style={{
              padding: "3px 10px", borderRadius: "20px",
              border: `1.5px solid ${colors.teal}`,
              color: colors.teal, fontSize: "10px", fontWeight: "600",
              fontFamily: "'Kanit', sans-serif", cursor: "pointer",
            }}
          >
            {genre}
          </div>
        ))}
      </div>
    )}
  </div>
  <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px", minHeight: "70px", alignItems: "center" }}>
    {recentActivity.length > 0 ? (
      recentActivity.map((track, i) => (
        <div
          key={i}
          onClick={() => onArtistTap(track.artist)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0, cursor: "pointer" }}
        >
          <Avatar name={track.artist} size={52} coverUrl={track.coverUrl} />
          <div style={{ fontSize: "10px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", textAlign: "center", maxWidth: "52px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {track.title}
          </div>
        </div>
      ))
    ) : (
      // ── Skeleton placeholders — same size as real avatars, reserve space ──
      [1,2,3,4,5].map(i => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: colors.bgCard }} />
          <div style={{ width: 44, height: 8, borderRadius: 4, backgroundColor: colors.bgCard }} />
        </div>
      ))
    )}
  </div>
</div>

{/* Loved */}
<div style={{ marginBottom: "24px", animation: "fadeSlideUp 0.4s ease 0.15s forwards", opacity: 0 }}>
  <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
    Loved
  </div>
  <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px", minHeight: "70px", alignItems: "center" }}>
    {loved.length > 0 ? (
      loved.map((track, i) => (
        <div
          key={i}
          onClick={() => playTrack(
            { title: track.title, artist: track.artist, album: track.album, genre: track.genre, coverUrl: track.coverUrl, audioUrl: track.audioUrl || "http://localhost:5000/audio/dummy.mp3" },
            loved.map(t => ({ title: t.title, artist: t.artist, album: t.album, genre: t.genre, coverUrl: t.coverUrl, audioUrl: t.audioUrl || "http://localhost:5000/audio/dummy.mp3" })),
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
      ))
    ) : (
      // ── Skeleton placeholders ──
      [1,2,3,4,5].map(i => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: colors.bgCard }} />
          <div style={{ width: 44, height: 8, borderRadius: 4, backgroundColor: colors.bgCard }} />
        </div>
      ))
    )}
  </div>
</div>

{/* Genre chips */}
<div style={{ animation: "fadeSlideUp 0.4s ease 0.25s forwards", opacity: 0 }}>
  <div style={{ position: "relative", marginBottom: "12px" }}>
    <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase" }}>
      Browse by Genre
    </div>
    {selectedGenres.length > 0 && (
      <div style={{
        position: "absolute", top: 0, right: 0,
        fontSize: "11px", fontWeight: "600",
        color: colors.teal,
        fontFamily: "'Kanit', sans-serif",
      }}>
        {selectedGenres.length}/5
      </div>
    )}
  </div>
  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
    {MOCK_GENRES.map((genre, i) => {
      const hue = (i * 37 + 160) % 360;
      const isSelected = selectedGenres.includes(genre);
      return (
        <div
          key={i}
          onClick={() => onToggleGenre(genre)}
          style={{
            padding: "6px 14px", borderRadius: "20px",
            background: isSelected
              ? colors.tealGlow
              : `linear-gradient(135deg, hsl(${hue}, 35%, 28%), hsl(${hue + 30}, 30%, 22%))`,
            border: isSelected ? `2px solid ${colors.teal}` : `2px solid transparent`,
            fontSize: "12px", fontWeight: "500",
            color: isSelected ? colors.teal : colors.text,
            fontFamily: "'Kanit', sans-serif",
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
   </div>
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

  const SWIPE_THRESHOLD = 140;
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

  const vinylCase = VINYL_CASES[
    Math.abs((track.artist + track.album).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % VINYL_CASES.length
  ];

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
        borderRadius: "0", overflow: "hidden",
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
            draggable={false}
            onLoad={() => {}} // no-op, loading tracked by parent
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              opacity: isLoaded ? 0.5 : 0,
              transition: "opacity 0.3s ease",
            }}
          />
        )}
       {/* Vinyl case overlay image */}
        <img
          src={`http://localhost:5000/vinyl/${vinylCase}`}
          alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ── Like / Skip indicators — centered for visibility ── */}
      <div style={{
        position: "absolute", top: "40%", left: "50%", zIndex: 10,
        opacity: skipOpacity,
        transform: "translate(-50%, -50%) rotate(-10deg)",
        border: "3px solid #ff4444", borderRadius: "8px", padding: "6px 18px",
        pointerEvents: "none",
      }}>
        <span style={{ fontSize: "28px", fontWeight: "800", color: "#ff4444", fontFamily: "'Kanit', sans-serif", letterSpacing: "2px" }}>NOPE</span>
      </div>
      <div style={{
        position: "absolute", top: "40%", left: "50%", zIndex: 10,
        opacity: likeOpacity,
        transform: "translate(-50%, -50%) rotate(10deg)",
        border: `3px solid ${colors.teal}`, borderRadius: "8px", padding: "6px 18px",
        pointerEvents: "none",
      }}>
        <span style={{ fontSize: "28px", fontWeight: "800", color: colors.teal, fontFamily: "'Kanit', sans-serif", letterSpacing: "2px" }}>YEAH!</span>
      </div>

      {/* ── Track info ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "24px 24px 28px",
        zIndex: 1,
      }}>
        <div style={{ fontSize: "22px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px", marginBottom: "4px", lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
          {track.album}
        </div>
        <div style={{ fontSize: "15px", color: colors.teal, fontFamily: "'Kanit', sans-serif", fontWeight: "600", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
          {track.artist}
        </div>
      </div>
    </div>
  );
};

// ─── Discovery Tab ────────────────────────────────────────────────────────────
const DiscoverySearch = ({ onLove, selectedGenres }) => {
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
      if (loadedImages[track.coverUrl]) return; 
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
      const token = await AsyncStorage.getItem('ponytail_token');
      const params = new URLSearchParams();
      if (selectedGenres.length > 0) {
        params.set('genres', selectedGenres.join(','));
      }
      params.set('limit', '15');

      const res = await fetch(`http://localhost:5000/api/auth/albums/discover?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setPool(data.albums || []);
    } catch (err) {
      console.log('Failed to fetch albums:', err);
      setError('Could not load albums. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };
  fetchTracks();
}, [selectedGenres]);

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
<div style={{
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
  minHeight: 0, padding: "0 8px",
}}>
  <div style={{ width: "100%", maxWidth: "340px", aspectRatio: "1", position: "relative" }}>
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
  const [user, setUser] = useState(null);
  const [activeNav, setActiveNav] = useState("search");
  const { openProfile, openUserProfile, profileImage } = useUI();
  const { isPlayerOpen, isPlaying, togglePlay } = usePlayer();
  const [panelStack, setPanelStack] = useState([]); 
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [loved, setLoved] = useState([]);

  useEffect(() => {
    const loadLoved = async () => {
      try {
        const stored = await AsyncStorage.getItem('ponytail_loved');
        if (stored) setLoved(JSON.parse(stored));
      } catch (err) {
        console.log('Failed to load loved tracks:', err);
      }
    };
    loadLoved();
  }, []);

  const openArtist = (artistName) => {
    setPanelStack(prev => [...prev, { type: 'artist', artist: artistName }]);
  };

  const openAlbum = (artist, album) => {
    setPanelStack(prev => [...prev, { type: 'album', artist, album }]);
  };

  const closeTopPanel = () => {
    setPanelStack(prev => prev.slice(0, -1));
  };

  // ── Tapping a musician/person result opens their public profile — unless it's
  // you, in which case open the real (editable) profile instead ──
  const handleUserTap = (username) => {
    if (user?.username && username === user.username) {
      openProfile();
    } else {
      openUserProfile(username);
    }
  };

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

  const handleLove = (album) => {
  setLoved(prev => {
    const alreadyLoved = prev.some(t =>
      t.artist === album.artist && t.album === album.album
    );
    if (alreadyLoved) return prev;

    const updated = [album, ...prev].slice(0, 15);

    AsyncStorage.setItem('ponytail_loved', JSON.stringify(updated))
      .catch(err => console.log('Failed to save loved tracks:', err));

    return updated;
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
        overflowX: "hidden",
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
    <button
      onClick={openProfile}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      <div style={{ borderRadius: "50%", overflow: "hidden", width: 34, height: 34 }}>
        {profileImage ? (
          <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Avatar name={user?.username || "User"} size={34} />
        )}
      </div>
    </button>
  </div>
  <div style={{ display: "flex", gap: "4px", width: "100%" }}>
    {[
      { key: "search", label: "Search" },
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
            {activeTab === "discovery" && <DiscoverySearch onLove={handleLove} selectedGenres={selectedGenres} />}
            {activeTab === "search" && (
            <StandardSearch
              loved={loved}
              user={user}
              onArtistTap={openArtist}
              onAlbumTap={(albumObj) => openAlbum(albumObj.artist, albumObj.album)}
              onUserTap={handleUserTap}
              selectedGenres={selectedGenres}
              onToggleGenre={(genre) => {
                setSelectedGenres(prev => {
                  if (prev.includes(genre)) {
                    return prev.filter(g => g !== genre);
                  }
                  if (prev.length >= 5) return prev; // cap at 5
                  return [...prev, genre];
                });
              }}
            />
          )}
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

          {/* ── Profile Panel ── */}
          <ProfilePanel />

          {/* ── Another user's public profile ── */}
          <UserProfilePanel />

          {/* ── Read-only viewer for a playlist you don't own ── */}
          <PublicPlaylistPanel />

          {/* ── Artist Panel & Album Panel ── */}
          {panelStack.map((panel, index) => {
          const zIndex = 1090 + index; // each panel opened later sits higher
          if (panel.type === 'artist') {
            return (
              <ArtistPanel
                key={`${panel.type}-${index}`}
                artistName={panel.artist}
                isOpen={true}
                zIndexOverride={zIndex}
                onClose={closeTopPanel}
                onAlbumTap={(albumObj) => openAlbum(albumObj.artist, albumObj.album)}
              />
            );
          }
          if (panel.type === 'album') {
            return (
              <AlbumPanel
                key={`${panel.type}-${index}`}
                artistName={panel.artist}
                albumName={panel.album}
                isOpen={true}
                zIndexOverride={zIndex}
                onClose={closeTopPanel}
                onArtistTap={openArtist}
              />
            );
          }
          return null;
        })} 
        </div>
      </div>
    </>
  );
}