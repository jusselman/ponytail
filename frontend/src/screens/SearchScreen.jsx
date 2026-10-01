import { useState, useRef, useEffect } from "react";
import { getMe } from '../services/authService';
import { searchPlaces, getPlaceOptions, searchCities, setHomeCity } from '../services/placesService';
import { useUI } from '../context/UIContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../components/AppHeader';
import InboxButton from '../components/InboxButton';
import MessagesLayer from '../components/MessagesLayer';
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

// ─── Filter Icon (three descending lines) — opens the Discovery genre filter panel ──
const FilterIcon = ({ size = 16, color = "#5DEBD7" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 6h16M7 12h10M10 18h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Elongated genre row — full-width (matches search bar width/radius), name
// centered, flush against its neighbors (no gap). Colored like the original
// Browse-by-Genre chips (per-genre hue gradient), white text. The "Show All"
// row uses a flat gray background instead of a hue gradient. ───
// ─── Matches the GenreFilterPanel chip styling exactly (10px radius, transparent
// 2px border, opacity hover feedback) so Discovery's search-bar picker and its
// full-screen filter panel read as the same chip design in two layouts ──────
const ElongatedGenreRow = ({ label, onSelect, hue = 0, isShowAll = false }) => (
  <div
    onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
    style={{
      width: "100%", padding: "14px 10px", borderRadius: "10px",
      textAlign: "center", boxSizing: "border-box",
      background: isShowAll
        ? "#555555"
        : `linear-gradient(135deg, hsl(${hue}, 35%, 28%), hsl(${hue + 30}, 30%, 22%))`,
      border: "2px solid transparent",
      color: "#ffffff",
      fontSize: "13px", fontWeight: "500",
      fontFamily: "'Kanit', sans-serif",
      cursor: "pointer", transition: "opacity 0.2s ease",
    }}
    onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
  >
    {label}
  </div>
);

// ─── Standard Search Tab ──────────────────────────────────────────────────────
const StandardSearch = ({ loved, onArtistTap, onAlbumTap, onUserTap }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const { playStandaloneTrack, playTrack } = usePlayer();
  const [recentActivity, setRecentActivity] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);


 const searchTracks = async (q) => {
  if (!q || q.length < 2) { setResults([]); return; }
  setSearching(true);
  try {
    const params = new URLSearchParams();
    params.set('q', q);
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

  const showResults = query.length >= 2;
  const showEmpty = !query;

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

  // ── "Maybe you'd like..." suggestions — mirrors the genres already present in
  // Recent + Loved (the two rows right above it) so it reads as "more like what
  // you've been into". Only when BOTH are empty (nothing loved, no play/search
  // history at all) does it fall back to the three artists picked at onboarding —
  // /albums/discover's own no-genres branch already weights favorite_artists first
  // and only adds history signal on top, and history being empty here is guaranteed
  // by recentActivity (sourced from that same history) also being empty. ──
  useEffect(() => {
    const fetchSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        const genrePool = [...loved, ...recentActivity].map(t => t.genre).filter(Boolean);
        const uniqueGenres = [...new Set(genrePool)].slice(0, 5);

        const params = new URLSearchParams();
        if (uniqueGenres.length > 0) params.set('genres', uniqueGenres.join(','));
        params.set('limit', '12');

        const token = await AsyncStorage.getItem('ponytail_token');
        const res = await fetch(`http://localhost:5000/api/auth/albums/discover?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        setSuggestions(data.albums || []);
      } catch (err) {
        console.log('Failed to fetch suggestions:', err);
      } finally {
        setSuggestionsLoading(false);
      }
    };
    fetchSuggestions();
  }, [loved, recentActivity]);

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
                    ? "Artist"
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
              {result.type === "musician" ? "Artist" : result.type}
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
  <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
    Recent
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

{/* ── Maybe you'd like... — Instagram-search-tab-style dense square grid.
Genre-matched against Recent + Loved when either has anything; otherwise
(both empty) falls back to the three onboarding-picked artists, handled
server-side by /albums/discover's own no-genres branch. Tiles are plain
cover art, no captions, same as IG's Explore grid — tapping one opens the
album panel via onAlbumTap, already wired in from the parent screen. ── */}
<div style={{ animation: "fadeSlideUp 0.4s ease 0.3s forwards", opacity: 0 }}>
  <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
    Maybe you'd like...
  </div>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
    {(suggestionsLoading ? Array.from({ length: 9 }) : suggestions).map((item, i) => {
      if (suggestionsLoading) {
        return <div key={i} style={{ aspectRatio: "1", backgroundColor: colors.bgCard }} />;
      }
      const hue = item.artist ? (item.artist.charCodeAt(0) * 37 + 160) % 360 : 200;
      return (
        <div
          key={`${item.artist}-${item.album}-${i}`}
          onClick={() => onAlbumTap({ artist: item.artist, album: item.album })}
          style={{
            aspectRatio: "1", position: "relative", overflow: "hidden", cursor: "pointer",
            background: `linear-gradient(135deg, hsl(${hue}, 50%, 26%), hsl(${hue + 40}, 40%, 16%))`,
          }}
        >
          {item.coverUrl ? (
            <img
              src={item.coverUrl}
              alt={item.album}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" />
              </svg>
            </div>
          )}
        </div>
      );
    })}
  </div>
  {!suggestionsLoading && suggestions.length === 0 && (
    <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "12px", padding: "16px 0" }}>
      Love or play a few tracks to see picks here.
    </div>
  )}
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

// ─── Discovery filter panel ("Sound | Place") — opened from the filter icon on
// the Discovery tab. A segmented control switches between two views:
//   • Sound — the genre search bar + full genre grid (up to 5 genres, teal)
//   • Place — a search bar for cities / regions / countries / musicians, the
//     listener's picked places as chips, a "Near me" radius from their home
//     city, and scene tiles (up to 3 places, gold)
// The status line under the control always summarizes both. Genres and places
// combine as (any picked genre) AND (any picked place). Everything filters
// live — there's no apply button; the chevron closes the panel. Place data
// comes from /api/places (backend/src/routes/placesRoutes.js). ──
const MAX_SELECTED_GENRES = 5;
const MAX_SELECTED_PLACES = 3;
const NEAR_RADII = [25, 100, 250, 500];
const goldGlow = "rgba(245,207,0,0.14)";
const goldBorder = "rgba(245,207,0,0.5)";
const kanit = "'Kanit', sans-serif";

const PanelInput = ({ icon, focused, children }) => (
  <div style={{ position: "relative", marginBottom: "12px" }}>
    <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
      {icon}
    </div>
    {children}
  </div>
);

const panelInputStyle = (focused, accent = colors.teal, glow = "rgba(93,235,215,0.1)") => ({
  width: "100%", padding: "12px 40px 12px 40px",
  borderRadius: "12px", backgroundColor: colors.bgCard,
  border: `1.5px solid ${focused ? accent : "transparent"}`,
  color: colors.text, fontSize: "14px", outline: "none",
  fontFamily: kanit, boxSizing: "border-box",
  boxShadow: focused ? `0 0 0 3px ${glow}` : "none",
  transition: "all 0.2s ease",
});

const PinIcon = ({ color = "#666", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth="1.8" />
    <circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.8" />
  </svg>
);

const TargetIcon = ({ color = colors.gold }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" fill={color} />
    <circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="1.6" opacity="0.6" />
    <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const RegionIcon = ({ color = colors.gold }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9 4v14M15 6v14" stroke={color} strokeWidth="1.4" />
  </svg>
);

const GlobeIcon = ({ color = colors.gold }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
    <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" stroke={color} strokeWidth="1.6" />
  </svg>
);

const placeKindIcon = (kind) => (kind === "country" ? <GlobeIcon /> : kind === "region" || kind === "metro" ? <RegionIcon /> : <PinIcon color={colors.gold} size={15} />);

const SectionLabel = ({ children, aside, first = false }) => (
  <div style={{
    fontSize: "10.5px", letterSpacing: "1.3px", textTransform: "uppercase", color: colors.muted,
    fontWeight: "600", fontFamily: kanit, margin: first ? "6px 2px 9px" : "18px 2px 9px",
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
  }}>
    <span>{children}</span>
    {aside && <span style={{ letterSpacing: 0, textTransform: "none", fontWeight: "400", fontSize: "11px" }}>{aside}</span>}
  </div>
);

const dropdownStyle = {
  position: "absolute", top: "calc(100% - 4px)", left: 0, right: 0, zIndex: 10,
  maxHeight: "300px", overflowY: "auto",
  backgroundColor: colors.bg, borderRadius: "12px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.55)",
  display: "flex", flexDirection: "column", gap: "6px", padding: "6px",
  boxSizing: "border-box",
};

const dropdownNote = (text) => (
  <div style={{
    padding: "12px 0", borderRadius: "10px", textAlign: "center",
    backgroundColor: colors.bgCard, color: colors.muted,
    fontSize: "13px", fontFamily: kanit,
  }}>
    {text}
  </div>
);

const GenreFilterPanel = ({
  isOpen, onClose,
  selectedGenres, onToggleGenre,
  selectedPlaces, onTogglePlace,
  nearRadius, onSetNearRadius,
  onClearFilters,
}) => {
  const [tab, setTab] = useState("sound");

  // ── Sound: genre search ──
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [pulseGenre, setPulseGenre] = useState(null);
  const inputRef = useRef(null);
  const chipRefs = useRef({});

  // ── Place: search, options (home / radii / scenes), home-city prompt ──
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeFocused, setPlaceFocused] = useState(false);
  const [placeResults, setPlaceResults] = useState({ places: [], musicians: [] });
  const [placeSearching, setPlaceSearching] = useState(false);
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState(null);
  const [lastRadius, setLastRadius] = useState(nearRadius || NEAR_RADII[0]);
  const [homeQuery, setHomeQuery] = useState("");
  const [homeFocused, setHomeFocused] = useState(false);
  const [homeResults, setHomeResults] = useState([]);
  const [savingHome, setSavingHome] = useState(false);
  const placeInputRef = useRef(null);

  // Reset the searches each time the panel closes
  useEffect(() => {
    if (!isOpen) {
      setQuery(""); setSearchFocused(false);
      setPlaceQuery(""); setPlaceFocused(false);
      setHomeQuery(""); setHomeFocused(false);
    }
  }, [isOpen]);

  // ── Load home city, radius counts and scene tiles. Counts depend on the
  // picked genres, so reload whenever those change while the panel is open. ──
  const loadOptions = async (cancelledRef = { current: false }) => {
    try {
      const data = await getPlaceOptions(selectedGenres);
      if (!cancelledRef.current) { setOptions(data); setOptionsError(null); }
    } catch (err) {
      console.log('Failed to load place options:', err);
      if (!cancelledRef.current) setOptionsError("Couldn't load places. Make sure the backend is running.");
    }
  };
  useEffect(() => {
    if (!isOpen) return;
    const cancelledRef = { current: false };
    loadOptions(cancelledRef);
    return () => { cancelledRef.current = true; };
  }, [isOpen, selectedGenres]);

  // ── Debounced place search ──
  const trimmedPlaceQuery = placeQuery.trim();
  useEffect(() => {
    if (!trimmedPlaceQuery) { setPlaceResults({ places: [], musicians: [] }); return; }
    let cancelled = false;
    setPlaceSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchPlaces(trimmedPlaceQuery, selectedGenres);
        if (!cancelled) setPlaceResults(data);
      } catch (err) {
        console.log('Place search failed:', err);
        if (!cancelled) setPlaceResults({ places: [], musicians: [] });
      } finally {
        if (!cancelled) setPlaceSearching(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trimmedPlaceQuery, selectedGenres]);

  // ── Debounced city search for the "set your city" prompt ──
  const trimmedHomeQuery = homeQuery.trim();
  useEffect(() => {
    if (trimmedHomeQuery.length < 2) { setHomeResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const cities = await searchCities(trimmedHomeQuery);
        if (!cancelled) setHomeResults(cities);
      } catch {
        if (!cancelled) setHomeResults([]);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trimmedHomeQuery]);

  const trimmedQuery = query.trim();
  const showDropdown = searchFocused && trimmedQuery.length > 0;
  // Genres only — matched against the genre list, nothing else
  const matchingGenres = MOCK_GENRES.filter(g => g.toLowerCase().includes(trimmedQuery.toLowerCase()));
  const atCap = selectedGenres.length >= MAX_SELECTED_GENRES;
  const atPlaceCap = selectedPlaces.length >= MAX_SELECTED_PLACES;
  const isPlaceSelected = (id) => selectedPlaces.some(p => p.id === id);
  const home = options?.home || null;

  const handlePickFromSearch = (genre) => {
    const isSelected = selectedGenres.includes(genre);
    if (!isSelected && atCap) return; // same 5-genre cap as tapping a rectangle
    if (!isSelected) onToggleGenre(genre);
    setQuery("");
    setSearchFocused(false);
    if (inputRef.current) inputRef.current.blur();
    // Bring the (now highlighted) rectangle into view and pulse it
    const el = chipRefs.current[genre];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setPulseGenre(genre);
    setTimeout(() => setPulseGenre(g => (g === genre ? null : g)), 900);
  };

  const handlePickPlace = (place) => {
    if (!isPlaceSelected(place.id)) {
      if (atPlaceCap) return;
      onTogglePlace({ id: place.id, label: place.label, sub: place.sub, kind: place.kind });
    }
    setPlaceQuery("");
    setPlaceFocused(false);
    if (placeInputRef.current) placeInputRef.current.blur();
  };

  const handleToggleScene = (scene) => {
    if (!isPlaceSelected(scene.id) && atPlaceCap) return;
    onTogglePlace({ id: scene.id, label: scene.label, sub: scene.sub, kind: scene.kind });
  };

  const handleToggleNear = () => {
    if (nearRadius) onSetNearRadius(null);
    else onSetNearRadius(lastRadius);
  };

  const handlePickRadius = (r) => {
    setLastRadius(r);
    onSetNearRadius(r);
  };

  const handlePickHome = async (city) => {
    setSavingHome(true);
    try {
      await setHomeCity(city.id);
      setHomeQuery(""); setHomeFocused(false); setHomeResults([]);
      await loadOptions();
      onSetNearRadius(lastRadius); // they asked for near-me, so turn it on
    } catch (err) {
      console.log('Failed to save home city:', err);
    } finally {
      setSavingHome(false);
    }
  };

  // ── "Only 6 tracks within 25 mi — widen?" when near-me finds very little ──
  const radiusCount = (r) => options?.radii?.find(x => x.radius === r)?.count ?? null;
  let nudge = null;
  if (nearRadius && home) {
    const current = radiusCount(nearRadius);
    const next = NEAR_RADII.find(r => r > nearRadius && (radiusCount(r) ?? 0) > (current ?? 0));
    if (current !== null && current < 60 && next) {
      nudge = {
        text: `${current === 0 ? `Nothing within ${nearRadius} mi.` : `Only ${current} track${current === 1 ? "" : "s"} within ${nearRadius} mi.`} ${next} mi has ${radiusCount(next).toLocaleString()}.`,
        radius: next,
      };
    }
  }

  // ── Status line: "Showing Punk, Ska from Manchester or within 100 mi of you." ──
  const placeParts = selectedPlaces.map(p => p.label);
  if (nearRadius) placeParts.push(`within ${nearRadius} mi of you`);
  const placeCount = selectedPlaces.length + (nearRadius ? 1 : 0);
  const anyFilter = selectedGenres.length > 0 || placeCount > 0;

  const countBadge = (n) => (n > 0 ? (
    <span style={{
      fontSize: "11px", fontWeight: "600", minWidth: "18px", height: "18px", borderRadius: "9px",
      display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px",
      backgroundColor: "#3a3a3a", color: colors.textSecondary, boxSizing: "border-box",
    }}>{n}</span>
  ) : null);

  const segButton = (key, label, n, color) => (
    <button
      onClick={() => setTab(key)}
      style={{
        position: "relative", zIndex: 1, background: "none", border: "none", padding: "8px 0",
        fontSize: "14px", fontWeight: "500", fontFamily: kanit, cursor: "pointer",
        color: tab === key ? color : colors.muted, transition: "color 0.25s ease",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
      }}
    >
      {label}{countBadge(n)}
    </button>
  );

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      backgroundColor: colors.bg,
      transform: isOpen ? "translateY(0)" : "translateY(100%)",
      transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
      display: "flex", flexDirection: "column",
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${colors.border}`, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: kanit }}>
          Filter Discovery
        </div>
        <button
          onClick={onClearFilters}
          disabled={!anyFilter}
          style={{
            background: "none", border: "none", width: "44px", textAlign: "right", padding: "4px 0",
            fontSize: "12px", fontWeight: "600", fontFamily: kanit,
            color: anyFilter ? colors.textSecondary : colors.muted,
            cursor: anyFilter ? "pointer" : "default",
          }}
        >
          Clear
        </button>
      </div>

      {/* ── Sound | Place segmented control ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", backgroundColor: colors.bgCard,
        borderRadius: "12px", padding: "4px", margin: "16px 20px 0", position: "relative", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: "4px", bottom: "4px", left: "4px", width: "calc(50% - 4px)",
          borderRadius: "9px", boxSizing: "border-box",
          transform: tab === "place" ? "translateX(100%)" : "translateX(0)",
          backgroundColor: tab === "place" ? goldGlow : colors.tealGlow,
          border: `1.5px solid ${tab === "place" ? goldBorder : "rgba(93,235,215,0.5)"}`,
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), background-color 0.3s ease, border-color 0.3s ease",
        }} />
        {segButton("sound", "Sound", selectedGenres.length, colors.teal)}
        {segButton("place", "Place", placeCount, colors.gold)}
      </div>

      <div style={{ fontSize: "12px", color: colors.muted, fontFamily: kanit, padding: "12px 20px 0", lineHeight: 1.5, flexShrink: 0 }}>
        Showing{" "}
        {selectedGenres.length
          ? <span style={{ color: colors.teal }}>{selectedGenres.join(", ")}</span>
          : <span style={{ color: colors.textSecondary }}>every genre</span>}
        {" "}from{" "}
        {placeParts.length
          ? <span style={{ color: colors.gold }}>{placeParts.join(" or ")}</span>
          : <span style={{ color: colors.textSecondary }}>anywhere</span>}.
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
        {tab === "sound" ? (
          <>
            {/* ── Genre search — dropdown floats over the grid ── */}
            <div style={{ position: "relative", zIndex: 5 }}>
              <PanelInput icon={<SearchIcon color={searchFocused ? colors.teal : "#666"} />}>
                <input
                  ref={inputRef}
                  style={panelInputStyle(searchFocused)}
                  placeholder="Search for genres"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                />
                {query.length > 0 && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                  >
                    <ClearIcon />
                  </button>
                )}
              </PanelInput>

              {showDropdown && (
                <div style={{ ...dropdownStyle, maxHeight: "260px" }}>
                  {matchingGenres.length === 0 ? dropdownNote(`No genres match "${trimmedQuery}"`) : (
                    <>
                      {atCap && (
                        <div style={{ fontSize: "11px", color: colors.muted, fontFamily: kanit, textAlign: "center", padding: "2px 0 4px" }}>
                          You can pick up to {MAX_SELECTED_GENRES} genres. Deselect one to add another.
                        </div>
                      )}
                      {matchingGenres.map(genre => {
                        const isSelected = selectedGenres.includes(genre);
                        const disabled = !isSelected && atCap;
                        const hue = genreHue(genre);
                        return (
                          <div
                            key={genre}
                            onMouseDown={(e) => { e.preventDefault(); handlePickFromSearch(genre); }}
                            style={{
                              padding: "12px 14px", borderRadius: "10px", boxSizing: "border-box",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              background: isSelected
                                ? colors.tealGlow
                                : `linear-gradient(135deg, hsl(${hue}, 35%, 28%), hsl(${hue + 30}, 30%, 22%))`,
                              border: isSelected ? `2px solid ${colors.teal}` : "2px solid transparent",
                              color: isSelected ? colors.teal : colors.text,
                              fontSize: "13px", fontWeight: "500", fontFamily: kanit,
                              cursor: disabled ? "default" : "pointer",
                              opacity: disabled ? 0.4 : 1,
                            }}
                          >
                            <span>{genre}</span>
                            {isSelected && <span style={{ fontSize: "11px", fontWeight: "600" }}>Selected</span>}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            <SectionLabel first aside={selectedGenres.length ? `${selectedGenres.length}/${MAX_SELECTED_GENRES}` : null}>Genres</SectionLabel>

            {/* ── Genre grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {MOCK_GENRES.map((genre, i) => {
                const hue = (i * 37 + 160) % 360;
                const isSelected = selectedGenres.includes(genre);
                const isPulsing = pulseGenre === genre;
                const disabled = !isSelected && atCap;
                return (
                  <div
                    key={genre}
                    ref={el => { chipRefs.current[genre] = el; }}
                    onClick={() => onToggleGenre(genre)}
                    style={{
                      padding: "14px 10px", borderRadius: "10px", textAlign: "center",
                      background: isSelected
                        ? colors.tealGlow
                        : `linear-gradient(135deg, hsl(${hue}, 35%, 28%), hsl(${hue + 30}, 30%, 22%))`,
                      border: isSelected ? `2px solid ${colors.teal}` : "2px solid transparent",
                      fontSize: "13px", fontWeight: "500",
                      color: isSelected ? colors.teal : colors.text,
                      fontFamily: kanit, cursor: disabled ? "default" : "pointer",
                      opacity: disabled ? 0.4 : 1,
                      transition: "opacity 0.2s ease, box-shadow 0.3s ease, transform 0.3s ease",
                      boxShadow: isPulsing ? "0 0 0 4px rgba(93,235,215,0.35)" : "none",
                      transform: isPulsing ? "scale(1.04)" : "scale(1)",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.8"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = disabled ? "0.4" : "1"; }}
                  >
                    {genre}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* ── Place search — cities, regions, countries, metros, musicians ── */}
            <div style={{ position: "relative", zIndex: 5 }}>
              <PanelInput icon={<PinIcon color={placeFocused ? colors.gold : "#666"} />}>
                <input
                  ref={placeInputRef}
                  style={panelInputStyle(placeFocused, colors.gold, "rgba(245,207,0,0.1)")}
                  placeholder="City, region, country or musician"
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  onFocus={() => setPlaceFocused(true)}
                  onBlur={() => setTimeout(() => setPlaceFocused(false), 150)}
                />
                {placeQuery.length > 0 && (
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setPlaceQuery(""); }}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                  >
                    <ClearIcon />
                  </button>
                )}
              </PanelInput>

              {placeFocused && trimmedPlaceQuery.length > 0 && (
                <div style={dropdownStyle}>
                  {atPlaceCap && (
                    <div style={{ fontSize: "11px", color: colors.muted, fontFamily: kanit, textAlign: "center", padding: "2px 0 4px" }}>
                      You can pick up to {MAX_SELECTED_PLACES} places. Remove one to add another.
                    </div>
                  )}
                  {placeResults.places.length === 0 && placeResults.musicians.length === 0
                    ? dropdownNote(placeSearching ? "Searching..." : `No places or musicians match "${trimmedPlaceQuery}"`)
                    : (
                      <>
                        {placeResults.places.length > 0 && <SectionLabel first>Places</SectionLabel>}
                        {placeResults.places.map(p => (
                          <PlaceRow
                            key={p.id}
                            icon={placeKindIcon(p.kind)}
                            name={p.label}
                            sub={p.sub}
                            right={isPlaceSelected(p.id) ? "Added" : `${p.count.toLocaleString()} tracks`}
                            selected={isPlaceSelected(p.id)}
                            disabled={!isPlaceSelected(p.id) && atPlaceCap}
                            onPick={() => handlePickPlace(p)}
                          />
                        ))}
                        {placeResults.musicians.length > 0 && <SectionLabel first={placeResults.places.length === 0}>Musicians</SectionLabel>}
                        {placeResults.musicians.map(m => {
                          const hue = (m.artist.charCodeAt(0) * 37) % 360;
                          return (
                            <PlaceRow
                              key={m.id}
                              icon={
                                <div style={{
                                  width: "30px", height: "30px", borderRadius: "50%", backgroundColor: `hsl(${hue}, 55%, 62%)`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "12px", fontWeight: "600", color: "#1a1a1a", fontFamily: kanit,
                                }}>
                                  {m.artist.replace(/^The /, "").charAt(0)}
                                </div>
                              }
                              iconBare
                              name={m.artist}
                              sub={`${m.location || "Location unknown"}${m.isUpload ? " · Ponytail musician" : ""}`}
                              right={isPlaceSelected(m.id) ? "Added" : "Their area"}
                              selected={isPlaceSelected(m.id)}
                              disabled={!isPlaceSelected(m.id) && atPlaceCap}
                              onPick={() => handlePickPlace(m)}
                            />
                          );
                        })}
                      </>
                    )}
                </div>
              )}
            </div>

            <SectionLabel first aside={selectedPlaces.length ? `${selectedPlaces.length}/${MAX_SELECTED_PLACES}` : null}>Your places</SectionLabel>
            {selectedPlaces.length === 0 ? (
              <div style={{ fontSize: "12px", color: colors.muted, fontWeight: "300", fontFamily: kanit, padding: "2px" }}>
                No places yet. Search above or tap a scene.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {selectedPlaces.map(p => (
                  <span key={p.id} style={{
                    display: "inline-flex", alignItems: "center", gap: "7px",
                    padding: "7px 8px 7px 11px", borderRadius: "10px",
                    backgroundColor: goldGlow, border: `1.5px solid ${goldBorder}`,
                    color: colors.gold, fontSize: "12.5px", fontWeight: "500", fontFamily: kanit,
                  }}>
                    <PinIcon color={colors.gold} size={12} />
                    {p.label}
                    <span style={{ color: "rgba(245,207,0,0.65)", fontWeight: "400", fontSize: "11px" }}>{p.sub}</span>
                    <button
                      onClick={() => onTogglePlace(p)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "1px", display: "flex", opacity: 0.75 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke={colors.gold} strokeWidth="2.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* ── Near me ── */}
            <SectionLabel>Near you</SectionLabel>
            <div style={{
              backgroundColor: colors.bgCard, borderRadius: "12px", padding: "12px",
              border: `2px solid ${nearRadius && home ? "rgba(245,207,0,0.55)" : "transparent"}`,
              background: nearRadius && home ? `linear-gradient(160deg, rgba(245,207,0,0.09), ${colors.bgCard} 70%)` : colors.bgCard,
              transition: "border-color 0.2s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                  backgroundColor: nearRadius && home ? "rgba(245,207,0,0.18)" : "#353535",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <TargetIcon />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: colors.text, fontFamily: kanit }}>Near me</div>
                  <div style={{ fontSize: "11px", fontWeight: "300", color: colors.textSecondary, fontFamily: kanit }}>
                    {home ? `${home.label} · from your profile` : "Set your city to use this"}
                  </div>
                </div>
                {home && (
                  <button
                    role="switch"
                    aria-checked={!!nearRadius}
                    onClick={handleToggleNear}
                    style={{
                      width: "42px", height: "24px", borderRadius: "12px", border: "none", position: "relative",
                      cursor: "pointer", flexShrink: 0, transition: "background-color 0.2s ease",
                      backgroundColor: nearRadius ? colors.gold : "#444",
                    }}
                  >
                    <span style={{
                      position: "absolute", left: "3px", top: "3px", width: "18px", height: "18px", borderRadius: "50%",
                      backgroundColor: nearRadius ? "#1a1a1a" : "#ddd",
                      transform: nearRadius ? "translateX(18px)" : "translateX(0)", transition: "transform 0.22s ease",
                    }} />
                  </button>
                )}
              </div>

              {home ? (
                <>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginTop: "12px",
                    opacity: nearRadius ? 1 : 0.35, pointerEvents: nearRadius ? "auto" : "none",
                  }}>
                    {NEAR_RADII.map(r => {
                      const on = (nearRadius || lastRadius) === r;
                      const count = radiusCount(r);
                      return (
                        <button
                          key={r}
                          onClick={() => handlePickRadius(r)}
                          style={{
                            backgroundColor: on ? goldGlow : "#333", color: on ? colors.gold : colors.textSecondary,
                            border: `1.5px solid ${on ? colors.gold : "transparent"}`, borderRadius: "9px",
                            padding: "7px 0 6px", fontSize: "12.5px", fontWeight: "500", fontFamily: kanit, cursor: "pointer",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: "1px",
                          }}
                        >
                          {r} mi
                          <span style={{ fontSize: "10px", fontWeight: "400", color: on ? "rgba(245,207,0,0.7)" : colors.muted }}>
                            {count === null ? "–" : count.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {nudge && (
                    <div style={{
                      marginTop: "10px", backgroundColor: "#2f2a12", border: "1px solid rgba(245,207,0,0.3)", borderRadius: "10px",
                      padding: "9px 11px", fontSize: "12px", color: "#e9dc9a", fontFamily: kanit, lineHeight: 1.4,
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
                    }}>
                      <span>{nudge.text}</span>
                      <button
                        onClick={() => handlePickRadius(nudge.radius)}
                        style={{
                          backgroundColor: colors.gold, color: "#1a1a1a", border: "none", borderRadius: "8px",
                          padding: "6px 10px", fontSize: "11.5px", fontWeight: "600", fontFamily: kanit, cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >
                        Widen to {nudge.radius} mi
                      </button>
                    </div>
                  )}
                </>
              ) : (
                // ── No home city yet (most listeners) — pick one right here ──
                <div style={{ position: "relative", marginTop: "12px" }}>
                  <input
                    style={{ ...panelInputStyle(homeFocused, colors.gold, "rgba(245,207,0,0.1)"), padding: "10px 14px", backgroundColor: "#333" }}
                    placeholder={savingHome ? "Saving..." : "Your city"}
                    value={homeQuery}
                    disabled={savingHome}
                    onChange={(e) => setHomeQuery(e.target.value)}
                    onFocus={() => setHomeFocused(true)}
                    onBlur={() => setTimeout(() => setHomeFocused(false), 150)}
                  />
                  {homeFocused && trimmedHomeQuery.length >= 2 && (
                    <div style={{ ...dropdownStyle, top: "calc(100% + 4px)" }}>
                      {homeResults.length === 0 ? dropdownNote(`No cities match "${trimmedHomeQuery}"`) : homeResults.map(city => (
                        <PlaceRow
                          key={city.id}
                          icon={<PinIcon color={colors.gold} size={15} />}
                          name={city.label}
                          sub={city.sub}
                          onPick={() => handlePickHome(city)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Scenes ── */}
            <SectionLabel aside="tracks match your sound">Scenes</SectionLabel>
            {optionsError ? (
              <div style={{ fontSize: "12px", color: "#ff6b6b", fontFamily: kanit }}>{optionsError}</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {(options?.scenes || []).map(scene => {
                  const isSelected = isPlaceSelected(scene.id);
                  const empty = scene.count === 0 && !isSelected;
                  const disabled = !isSelected && atPlaceCap;
                  return (
                    <div
                      key={scene.id}
                      onClick={() => handleToggleScene(scene)}
                      style={{
                        padding: "11px 12px", borderRadius: "10px", minHeight: "60px", boxSizing: "border-box",
                        display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "1px", overflow: "hidden",
                        background: isSelected
                          ? goldGlow
                          : `linear-gradient(135deg, hsl(${scene.hue}, 35%, 26%), hsl(${scene.hue + 30}, 30%, 19%))`,
                        border: `2px solid ${isSelected ? colors.gold : "transparent"}`,
                        fontFamily: kanit, cursor: disabled ? "default" : "pointer",
                        opacity: empty || disabled ? 0.35 : 1, transition: "opacity 0.2s ease",
                      }}
                    >
                      <span style={{ fontSize: "13.5px", fontWeight: "600", color: isSelected ? colors.gold : colors.text }}>{scene.label}</span>
                      <span style={{ fontSize: "11px", color: isSelected ? "rgba(245,207,0,0.7)" : "rgba(255,255,255,0.65)" }}>
                        {scene.count.toLocaleString()} tracks
                      </span>
                      <span style={{
                        fontSize: "10.5px", fontWeight: "300", color: isSelected ? "rgba(245,207,0,0.7)" : "rgba(255,255,255,0.5)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {scene.topArtists.length ? scene.topArtists.join(", ") : "No matches for this sound"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        <div style={{ height: "20px" }} />
      </div>
    </div>
  );
};

// ─── One row in a place/musician/city dropdown ──
const PlaceRow = ({ icon, iconBare = false, name, sub, right, selected = false, disabled = false, onPick }) => (
  <div
    onMouseDown={(e) => { e.preventDefault(); if (!disabled) onPick(); }}
    style={{
      padding: "10px 12px", borderRadius: "10px", boxSizing: "border-box",
      display: "flex", alignItems: "center", gap: "11px",
      backgroundColor: selected ? goldGlow : colors.bgCard,
      border: `2px solid ${selected ? colors.gold : "transparent"}`,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
      fontFamily: kanit,
    }}
    onMouseEnter={e => { if (!disabled && !selected) e.currentTarget.style.backgroundColor = colors.bgCardHover; }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = colors.bgCard; }}
  >
    {iconBare ? icon : (
      <div style={{ width: "30px", height: "30px", borderRadius: "8px", backgroundColor: "#353535", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "13px", fontWeight: "500", color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
      {sub && <div style={{ fontSize: "11px", fontWeight: "300", color: colors.textSecondary }}>{sub}</div>}
    </div>
    {right && <span style={{ fontSize: "11px", color: colors.muted, whiteSpace: "nowrap" }}>{right}</span>}
  </div>
);

// ─── Discovery Tab ────────────────────────────────────────────────────────────
// ─── Discovery's own genre search bar — same search-bar + elongated genre
// picker pattern the Search tab used to show (identical markup/behavior),
// but scoped to Discovery's own selectedGenres/onToggleGenre so it no longer
// shares filter state with the Search tab. The text input itself doesn't
// run a search here — Discovery has no "results" list — it exists purely
// as the tap target that reveals the genre picker below it, exactly like
// it did on the Search tab. This sits alongside the existing filter-icon
// panel (GenreFilterPanel) as a second way to set the same genre filter. ───
const DiscoveryGenreBar = ({ selectedGenres, onToggleGenre }) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const inputRef = useRef(null);

  // ── Typing now searches genre names (case-insensitive substring match
  // against the full MOCK_GENRES list) instead of being a no-op — the picker
  // stays open the whole time the bar is focused, it just switches between
  // "browse" (top 5 + Show All) and "search results" depending on query ──
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const showGenrePicker = focused;
  const visibleTopGenres = TOP_GENRES.filter(g => !selectedGenres.includes(g));
  const visibleMoreGenres = MORE_GENRES.filter(g => !selectedGenres.includes(g.name));
  const matchingGenres = MOCK_GENRES.filter(g =>
    g.toLowerCase().includes(trimmedQuery.toLowerCase()) && !selectedGenres.includes(g)
  );

  useEffect(() => {
    if (!showGenrePicker) setShowAllGenres(false);
  }, [showGenrePicker]);

  const handleClearAndClose = () => {
    setQuery("");
    setFocused(false);
    if (inputRef.current) inputRef.current.blur();
  };

  return (
    <div style={{ position: "relative", marginBottom: "12px", flexShrink: 0 }}>
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
        placeholder="Search genres..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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

      {/* ── Dropdown below the bar — while searching, shows genres matching
      the typed text (or a "no match" placeholder); otherwise falls back to
      the browse view (top 5 + "Show All"), same as before ── */}
      {showGenrePicker && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 50 }}>
          {isSearching ? (
            matchingGenres.length > 0 ? (
              matchingGenres.map(genre => (
                <ElongatedGenreRow key={genre} label={genre} hue={genreHue(genre)} onSelect={() => onToggleGenre(genre)} />
              ))
            ) : (
              <div style={{
                width: "100%", padding: "12px 0", borderRadius: "12px",
                textAlign: "center", boxSizing: "border-box",
                backgroundColor: colors.bgCard,
                color: colors.muted, fontSize: "13px",
                fontFamily: "'Kanit', sans-serif",
              }}>
                No genres match "{trimmedQuery}"
              </div>
            )
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
};

const DiscoverySearch = ({
  onLove, selectedGenres, onToggleGenre,
  selectedPlaces, onTogglePlace, nearRadius, onSetNearRadius, onClearFilters,
}) => {
  const [pool, setPool] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});
  const [dragX, setDragX] = useState(0);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const { isPlaying, togglePlay } = usePlayer();

  // ── Pause playback while the genre filter panel is up ──
  const handleOpenFilterPanel = () => {
    if (isPlaying) togglePlay();
    setShowFilterPanel(true);
  };

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
      // ── Place filter (Sound | Place panel): picked places/musicians as
      // tokens, plus "near me" as a radius from the listener's home city ──
      if (selectedPlaces.length > 0) {
        params.set('places', JSON.stringify(selectedPlaces.map(p => p.id)));
      }
      if (nearRadius) {
        params.set('near', String(nearRadius));
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
}, [selectedGenres, selectedPlaces, nearRadius]);

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
  const hasFilters = selectedGenres.length > 0 || selectedPlaces.length > 0 || !!nearRadius;
  const track = pool[current];
  const nextTrack = pool[current + 1];
  const peekScale = 0.96 + (Math.min(Math.abs(dragX), 80) / 80) * 0.04;

  // ── Loading/error/card-stack states are rendered *inside* this fixed outer
  // container, and the GenreFilterPanel is always mounted alongside them
  // (not gated behind any of those states). Previously the loading state was
  // an early `return`, which unmounted GenreFilterPanel entirely every time
  // toggling a genre chip triggered a track refetch — causing the panel and
  // its chips to flash away and reveal whatever was behind it. Keeping it
  // permanently mounted (it's already an absolutely-positioned overlay with
  // its own open/close transform) means a refetch never touches it. ──
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 16px 16px", boxSizing: "border-box" }}>

      <DiscoveryGenreBar selectedGenres={selectedGenres} onToggleGenre={onToggleGenre} />

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ fontSize: "14px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
            Loading tracks...
          </div>
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ fontSize: "14px", color: "#ff6b6b", fontFamily: "'Kanit', sans-serif", textAlign: "center" }}>
            {error}
          </div>
        </div>
      ) : (
        <>
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
                  {pool.length === 0 ? "Nothing matches yet" : "You've heard everything!"}
                </div>
                <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", textAlign: "center", padding: "0 24px" }}>
                  {pool.length === 0
                    ? "Try a wider radius, another place, or fewer genres."
                    : "Check the Loved tab to revisit tracks you liked."}
                </div>
                <button
                  onClick={() => {
                    // ── An empty pool means the filters matched nothing — open
                    // the filter panel instead of restarting an empty deck ──
                    if (pool.length === 0) { handleOpenFilterPanel(); return; }
                    setCurrent(0); setDragX(0);
                  }}
                  style={{
                    marginTop: "8px", padding: "10px 24px", borderRadius: "50px",
                    backgroundColor: colors.teal, border: "none",
                    color: "#1a1a1a", fontSize: "14px", fontWeight: "600",
                    cursor: "pointer", fontFamily: "'Kanit', sans-serif",
                  }}
                >
                  {pool.length === 0 ? "Open filters" : "Start over"}
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

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={handleOpenFilterPanel}
                  style={{
                    width: 36, height: 36, borderRadius: "50%", backgroundColor: colors.bgCard,
                    border: `2px solid ${hasFilters ? colors.gold : colors.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = hasFilters ? "rgba(245,207,0,0.15)" : colors.tealGlow}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.bgCard}
                >
                  <FilterIcon size={15} color={hasFilters ? colors.gold : colors.muted} />
                </button>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
                    {remaining}
                  </div>
                  <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.5px" }}>
                    left
                  </div>
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
        </>
      )}

      <GenreFilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        selectedGenres={selectedGenres}
        onToggleGenre={onToggleGenre}
        selectedPlaces={selectedPlaces}
        onTogglePlace={onTogglePlace}
        nearRadius={nearRadius}
        onSetNearRadius={onSetNearRadius}
        onClearFilters={onClearFilters}
      />
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
  // ── Discovery's Place filter: picked places/musicians ({ id, label, sub,
  // kind }, id is "p:<placeId>" or "a:<artist>", max 3) and the near-me
  // radius in miles (null = off) ──
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [nearRadius, setNearRadius] = useState(null);
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

  // ── Discovery-only genre-filter toggle — used by both the Discovery tab's
  // filter-icon panel (GenreFilterPanel) and its own genre search bar
  // (DiscoveryGenreBar); the Search tab no longer has any genre filtering
  // of its own, so this state isn't shared with it anymore (capped at 5) ──
  const handleToggleGenre = (genre) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      }
      if (prev.length >= 5) return prev; // cap at 5
      return [...prev, genre];
    });
  };

  const handleTogglePlace = (place) => {
    setSelectedPlaces(prev => {
      if (prev.some(p => p.id === place.id)) return prev.filter(p => p.id !== place.id);
      if (prev.length >= 3) return prev; // cap at 3
      return [...prev, place];
    });
  };

  const handleClearFilters = () => {
    setSelectedGenres([]);
    setSelectedPlaces([]);
    setNearRadius(null);
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
    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
    <InboxButton />
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
            {activeTab === "discovery" && (
              <DiscoverySearch
                onLove={handleLove}
                selectedGenres={selectedGenres}
                onToggleGenre={handleToggleGenre}
                selectedPlaces={selectedPlaces}
                onTogglePlace={handleTogglePlace}
                nearRadius={nearRadius}
                onSetNearRadius={setNearRadius}
                onClearFilters={handleClearFilters}
              />
            )}
            {activeTab === "search" && (
            <StandardSearch
              loved={loved}
              user={user}
              onArtistTap={openArtist}
              onAlbumTap={(albumObj) => openAlbum(albumObj.artist, albumObj.album)}
              onUserTap={handleUserTap}
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

          {/* ── Direct messages: inbox + open thread ── */}
          <MessagesLayer />

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