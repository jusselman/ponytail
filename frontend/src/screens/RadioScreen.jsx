import { useState, useEffect, useRef } from "react";
import {
  getMe, getHotInHere, getMyStation,
  getRadioStations, createRadioStation, deleteRadioStation,
  getStationTracks, setGoat as apiSetGoat, getGoatTracks,
  searchArtists, rateTrack,
} from '../services/authService';
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
  danger: "#ff6b6b",
  dangerGlow: "rgba(255,107,107,0.15)",
};

// ─── Built-in stations always sit at the same dial position/hue so they never
// collide with each other, and custom stations are placed clear of all three
// (see the position math in POST /radio/stations on the backend) ──
const HOT_IN_HERE_POSITION = 4;
const YOUR_STATION_POSITION = 50;
const GOAT_POSITION = 96;
const HOT_IN_HERE_HUE = 190;
const YOUR_STATION_HUE = 45;
const GOAT_HUE = 48;
const UNGOAT_HUE = 355;

const trackKey = (t) => `${t?.title}|${t?.artist}`;

// ─── Icons ────────────────────────────────────────────────────────────────────
const PinIcon = ({ color = colors.muted }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={color} />
    <circle cx="12" cy="9" r="2.5" fill="#1a1a1a" />
  </svg>
);

const PlusIcon = ({ color = colors.teal }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const XIcon = ({ color = colors.muted, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SearchIcon = ({ color = "#666" }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <path d="M16.5 16.5L21 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const InfoIcon = ({ color = colors.text }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
    <path d="M12 11v6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="7.5" r="1.1" fill={color} />
  </svg>
);

const SettingsIcon = ({ color = colors.text }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
    <path
      d="M19.4 13a7.6 7.6 0 000-2l2-1.4-2-3.4-2.3.7a7.6 7.6 0 00-1.7-1L15 3h-6l-.4 2.9a7.6 7.6 0 00-1.7 1l-2.3-.7-2 3.4L4.6 11a7.6 7.6 0 000 2l-2 1.4 2 3.4 2.3-.7a7.6 7.6 0 001.7 1L9 21h6l.4-2.9a7.6 7.6 0 001.7-1l2.3.7 2-3.4-2-1.4z"
      stroke={color} strokeWidth="1.5" strokeLinejoin="round"
    />
  </svg>
);

const ThumbUpIcon = ({ active }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={active ? colors.teal : "none"}>
    <path d="M7 22V11l5-8 1.5 1L12 11h7a2 2 0 012 2.3l-1.6 7A2 2 0 0117.4 22H7z" stroke={active ? colors.teal : colors.muted} strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M3 11h4v11H3z" fill={active ? colors.teal : "none"} stroke={active ? colors.teal : colors.muted} strokeWidth="1.7" />
  </svg>
);

const ThumbDownIcon = ({ active }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={active ? colors.danger : "none"} style={{ transform: "rotate(180deg)" }}>
    <path d="M7 22V11l5-8 1.5 1L12 11h7a2 2 0 012 2.3l-1.6 7A2 2 0 0117.4 22H7z" stroke={active ? colors.danger : colors.muted} strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M3 11h4v11H3z" fill={active ? colors.danger : "none"} stroke={active ? colors.danger : colors.muted} strokeWidth="1.7" />
  </svg>
);

const PlayGlyph = ({ color = "#1a1a1a" }) => (
  <div style={{ width: 0, height: 0, borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderLeft: `15px solid ${color}`, marginLeft: 3 }} />
);
const PauseGlyph = ({ color = "#1a1a1a" }) => (
  <div style={{ display: "flex", gap: "5px" }}>
    <div style={{ width: 4, height: 16, backgroundColor: color, borderRadius: 2 }} />
    <div style={{ width: 4, height: 16, backgroundColor: color, borderRadius: 2 }} />
  </div>
);

// ─── Artist search input — shared by the Add Station sheet and the GOAT
// picker. Debounced against GET /artists/search; onSelectArtist fires with a
// plain artist-name string. ──
const ArtistSearchInput = ({ value, onChange, onSelectArtist, placeholder = "Search for an artist..." }) => {
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchArtists(value.trim());
        setResults(data.artists || []);
      } catch (err) {
        console.log('Artist search failed:', err);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <SearchIcon color={focused ? colors.teal : "#666"} />
      </div>
      <input
        style={{
          width: "100%", padding: "11px 14px 11px 36px",
          borderRadius: "10px", backgroundColor: colors.bg,
          border: `1.5px solid ${focused ? colors.teal : "transparent"}`,
          color: colors.text, fontSize: "13px", outline: "none",
          fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
        }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {focused && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 80,
          backgroundColor: colors.bg, borderRadius: "10px", overflow: "hidden",
          border: `1px solid ${colors.border}`, maxHeight: "180px", overflowY: "auto",
        }}>
          {results.map((a) => (
            <div
              key={a.id}
              onMouseDown={(e) => { e.preventDefault(); onSelectArtist(a.name); setResults([]); }}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", cursor: "pointer" }}
            >
              <div style={{ width: 26, height: 26, borderRadius: "6px", overflow: "hidden", flexShrink: 0, backgroundColor: colors.bgCardHover }}>
                {a.coverUrl && <img src={a.coverUrl} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ fontSize: "13px", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Frequency dial — a horizontal tuner track (0-100 "μHz", purely cosmetic
// framing) with a colored blip per station and a draggable handle. Tapping a
// blip tunes instantly; dragging the track itself always snaps to whichever
// station is nearest wherever the pointer is released, same as a real analog
// dial with detents. ──
const FrequencyDial = ({ stations, tunedId, tunedPosition, tunedHue, onTune }) => {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(null);

  const positionFromClientX = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return tunedPosition ?? 50;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * 100;
  };

  const nearestStation = (pos) => {
    if (stations.length === 0) return null;
    let best = stations[0];
    let bestDist = Math.abs(stations[0].position - pos);
    for (const s of stations.slice(1)) {
      const d = Math.abs(s.position - pos);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    return best;
  };

  useEffect(() => {
    if (!dragging) return undefined;
    const handleMove = (e) => setDragPosition(positionFromClientX(e.clientX));
    const handleUp = (e) => {
      const pos = positionFromClientX(e.clientX);
      const station = nearestStation(pos);
      setDragging(false);
      setDragPosition(null);
      if (station) onTune(station);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, stations]);

  const displayPosition = dragging && dragPosition !== null ? dragPosition : (tunedPosition ?? 50);
  const handleGlow = dragging ? "rgba(255,255,255,0.5)" : (tunedHue != null ? `hsl(${tunedHue}, 80%, 60%)` : "rgba(255,255,255,0.3)");

  return (
    <div style={{ padding: "4px 24px 4px" }}>
      <div
        ref={trackRef}
        onMouseDown={(e) => { setDragging(true); setDragPosition(positionFromClientX(e.clientX)); }}
        style={{
          position: "relative", width: "100%", height: "6px", borderRadius: "6px",
          background: "linear-gradient(90deg, #333333, #3a3a3a, #333333)",
          cursor: "grab", marginTop: "22px", marginBottom: "12px",
        }}
      >
        {[...Array(11)].map((_, i) => (
          <div key={i} style={{
            position: "absolute", left: `${i * 10}%`, top: "-4px",
            width: "1px", height: "14px", backgroundColor: "rgba(255,255,255,0.08)", pointerEvents: "none",
          }} />
        ))}

        {stations.map((s) => (
          <div
            key={s.id}
            onMouseDown={(e) => { e.stopPropagation(); onTune(s); }}
            title={s.name}
            style={{
              position: "absolute", left: `${s.position}%`, top: "-8px", transform: "translateX(-50%)",
              width: s.id === tunedId ? "10px" : "8px", height: s.id === tunedId ? "22px" : "18px",
              borderRadius: "4px", backgroundColor: `hsl(${s.hue}, 65%, 55%)`, cursor: "pointer",
              boxShadow: s.id === tunedId ? `0 0 10px hsl(${s.hue}, 80%, 60%)` : "none",
              transition: "all 0.15s ease",
            }}
          />
        ))}

        <div style={{
          position: "absolute", left: `${displayPosition}%`, top: "-11px", transform: "translateX(-50%)",
          width: "3px", height: "28px", borderRadius: "3px", backgroundColor: colors.text,
          boxShadow: `0 0 10px ${handleGlow}`, pointerEvents: "none", transition: dragging ? "none" : "left 0.25s ease",
        }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>0 μHz</span>
        <span style={{ fontSize: "11px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
          {displayPosition.toFixed(1)} μHz
        </span>
        <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>100 μHz</span>
      </div>
    </div>
  );
};

// ─── One row in the station list below the dial — tap to tune, colored dot
// matches the dial blip for the same station. ──
const StationRow = ({ station, isTuned, isPlayingThis, onTune }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onTune(station)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "12px 14px", borderRadius: "12px", cursor: "pointer",
        backgroundColor: isTuned ? colors.bgCardHover : (hovered ? colors.bgCard : "transparent"),
        border: `1px solid ${isTuned ? `hsl(${station.hue}, 60%, 45%)` : "transparent"}`,
        transition: "all 0.15s ease",
      }}
    >
      <div style={{
        width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
        backgroundColor: `hsl(${station.hue}, 65%, 55%)`,
        boxShadow: isPlayingThis ? `0 0 8px hsl(${station.hue}, 80%, 60%)` : "none",
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: isTuned ? "700" : "500", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {station.name}
        </div>
        <div style={{ fontSize: "10.5px", color: colors.muted, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {station.subtitle}
        </div>
      </div>
      {isPlayingThis && (
        <div style={{ fontSize: "9px", fontWeight: "700", color: colors.teal, fontFamily: "'Kanit', sans-serif", flexShrink: 0 }}>
          ON AIR
        </div>
      )}
    </div>
  );
};

// ─── Modal shell used by both the Add Station sheet and the GOAT picker —
// contained within the phone frame (absolute, not fixed) so it never escapes
// it. ──
const SheetOverlay = ({ title, onClose, children }) => (
  <div style={{
    position: "absolute", inset: 0, zIndex: 200,
    backgroundColor: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
  }}>
    <div style={{
      width: "100%", backgroundColor: colors.bgCard, borderRadius: "18px",
      padding: "18px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ fontSize: "15px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
          {title}
        </div>
        <div onClick={onClose} style={{ cursor: "pointer", padding: "4px" }}>
          <XIcon color={colors.muted} />
        </div>
      </div>
      {children}
    </div>
  </div>
);

const PrimaryButton = ({ label, onClick, disabled }) => (
  <div
    onClick={disabled ? undefined : onClick}
    style={{
      marginTop: "14px", padding: "11px 0", borderRadius: "12px", textAlign: "center",
      backgroundColor: disabled ? colors.bgCardHover : colors.teal,
      color: disabled ? colors.muted : "#0f1e1c",
      fontSize: "13px", fontWeight: "700", fontFamily: "'Kanit', sans-serif",
      cursor: disabled ? "default" : "pointer", transition: "opacity 0.15s ease",
    }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = "0.85"; }}
    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
  >
    {label}
  </div>
);

// ─── Radio Screen ─────────────────────────────────────────────────────────────
export default function RadioScreen({ setScreen }) {
  const [activeNav, setActiveNav] = useState("radio");
  const [user, setUser] = useState(null);
  const [hotInHere, setHotInHere] = useState([]);
  const [hotInHereLocation, setHotInHereLocation] = useState(null);
  const [myStation, setMyStation] = useState(null);
  const [customStations, setCustomStations] = useState([]);
  const [goatState, setGoatState] = useState({ artist: null, mode: 'goat' });

  const [tunedId, setTunedId] = useState(null);
  const [tunedTracks, setTunedTracks] = useState([]);
  const [tunedLoading, setTunedLoading] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [addStationOpen, setAddStationOpen] = useState(false);
  const [newStationName, setNewStationName] = useState("");
  const [newStationArtist, setNewStationArtist] = useState("");

  const [goatPickerOpen, setGoatPickerOpen] = useState(false);
  const [goatArtistInput, setGoatArtistInput] = useState("");

  const [ratings, setRatings] = useState({});

  const { playTrack, togglePlay, currentTrack, isPlaying } = usePlayer();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setUser(await getMe());
      } catch (err) {
        console.log('Could not load user:', err);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const fetchHotInHere = async () => {
      try {
        const data = await getHotInHere();
        setHotInHereLocation(data.location || null);
        setHotInHere((data.tracks || []).map(t => ({ ...t, track: t.title })));
      } catch (err) {
        console.log('Failed to fetch Hot in Here:', err);
      }
    };
    fetchHotInHere();
  }, []);

  useEffect(() => {
    if (!user?.is_artist) return;
    const fetchMyStation = async () => {
      try {
        setMyStation(await getMyStation());
      } catch (err) {
        console.log('Failed to fetch personalized station:', err);
      }
    };
    fetchMyStation();
  }, [user?.is_artist]);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const data = await getRadioStations();
        setCustomStations(data.stations || []);
        setGoatState(data.goat || { artist: null, mode: 'goat' });
      } catch (err) {
        console.log('Failed to fetch radio stations:', err);
      }
    };
    fetchStations();
  }, []);

  // ── Every station on the dial — built-ins first, then the user's own ──
  const allStations = [
    {
      id: 'hot-in-here', kind: 'hot-in-here', name: 'Hot in Here',
      hue: HOT_IN_HERE_HUE, position: HOT_IN_HERE_POSITION,
      subtitle: hotInHereLocation ? `Artists uploading within 10 miles` : 'Set your location to use this',
    },
    ...(user?.is_artist ? [{
      id: 'your-station', kind: 'your-station', name: 'Your Station',
      hue: YOUR_STATION_HUE, position: YOUR_STATION_POSITION,
      subtitle: 'Your uploads + similar artists',
    }] : []),
    {
      id: 'goat', kind: 'goat',
      name: goatState.mode === 'ungoat' ? 'UN-GOAT' : (goatState.artist ? `GOAT · ${goatState.artist}` : 'GOAT'),
      hue: goatState.mode === 'ungoat' ? UNGOAT_HUE : GOAT_HUE,
      position: GOAT_POSITION,
      subtitle: !goatState.artist
        ? 'Pick your greatest of all time'
        : (goatState.mode === 'ungoat'
          ? `Muting ${goatState.artist} + similar everywhere`
          : `${goatState.artist} + similar artists`),
    },
    ...customStations.map(s => ({
      ...s, kind: 'custom', subtitle: `Seeded by ${s.seedArtist}`,
    })),
  ];

  const tunedStation = allStations.find(s => s.id === tunedId) || null;
  const isTunedActive = tunedTracks.length > 0 && !!currentTrack &&
    tunedTracks.some(t => trackKey(t) === trackKey(currentTrack));
  const showPause = isTunedActive && isPlaying;

  const handleTune = async (station) => {
    if (!station) return;
    setTunedId(station.id);
    setInfoOpen(false);
    setSettingsOpen(false);
    setDeleteConfirmId(null);

    if (station.kind === 'hot-in-here') {
      setTunedTracks(hotInHere.map(t => ({
        title: t.track, artist: t.artist, album: t.genre, genre: t.genre,
        coverUrl: t.coverUrl || null, audioUrl: t.audioUrl || "http://localhost:5000/audio/dummy.mp3",
      })));
      return;
    }
    if (station.kind === 'your-station') {
      setTunedTracks(myStation ? [...myStation.ownTracks, ...myStation.matchedTracks] : []);
      return;
    }
    if (station.kind === 'goat') {
      if (!goatState.artist) {
        setGoatPickerOpen(true);
        return;
      }
      setTunedLoading(true);
      try {
        const data = await getGoatTracks();
        setTunedTracks(data.tracks || []);
      } catch (err) {
        console.log('Failed to load GOAT station:', err);
        setTunedTracks([]);
      } finally {
        setTunedLoading(false);
      }
      return;
    }
    // Custom station
    setTunedLoading(true);
    try {
      const data = await getStationTracks(station.id);
      setTunedTracks(data.tracks || []);
    } catch (err) {
      console.log('Failed to load station tracks:', err);
      setTunedTracks([]);
    } finally {
      setTunedLoading(false);
    }
  };

  const handlePlayPauseTuned = () => {
    if (tunedTracks.length === 0) return;
    if (isTunedActive) {
      togglePlay();
    } else {
      playTrack(tunedTracks[0], tunedTracks, 0);
    }
  };

  const handleRate = async (value) => {
    if (!currentTrack || !isTunedActive) return;
    const key = trackKey(currentTrack);
    setRatings(prev => ({ ...prev, [key]: value }));
    try {
      await rateTrack(currentTrack, value);
    } catch (err) {
      console.log('Failed to rate track:', err);
    }
  };

  const handleCreateStation = async () => {
    if (!newStationName.trim() || !newStationArtist.trim()) return;
    try {
      const data = await createRadioStation(newStationName.trim(), newStationArtist.trim());
      setCustomStations(prev => [...prev, data.station]);
      setAddStationOpen(false);
      setNewStationName("");
      setNewStationArtist("");
    } catch (err) {
      console.log('Failed to create station:', err);
    }
  };

  const handleDeleteStation = async (id) => {
    try {
      await deleteRadioStation(id);
      setCustomStations(prev => prev.filter(s => s.id !== id));
      if (tunedId === id) {
        setTunedId(null);
        setTunedTracks([]);
      }
      setDeleteConfirmId(null);
      setSettingsOpen(false);
    } catch (err) {
      console.log('Failed to delete station:', err);
    }
  };

  const handlePickGoat = async (artistName) => {
    try {
      const data = await apiSetGoat({ artist: artistName, mode: 'goat' });
      setGoatState(data.goat);
      setGoatPickerOpen(false);
      setGoatArtistInput("");
      handleTune({ id: 'goat', kind: 'goat' });
    } catch (err) {
      console.log('Failed to set GOAT:', err);
    }
  };

  const handleToggleGoatMode = async () => {
    const nextMode = goatState.mode === 'goat' ? 'ungoat' : 'goat';
    try {
      const data = await apiSetGoat({ mode: nextMode });
      setGoatState(data.goat);
      if (tunedId === 'goat') handleTune({ id: 'goat', kind: 'goat' });
    } catch (err) {
      console.log('Failed to toggle GOAT mode:', err);
    }
  };

  const ratingKey = currentTrack ? trackKey(currentTrack) : null;
  const currentRating = ratingKey ? ratings[ratingKey] : null;

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

      <div style={{ minHeight: "100vh", width: "100%", backgroundColor: colors.bgDeep, display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "'Kanit', sans-serif" }}>
        <div style={{
          width: "375px", height: "750px", backgroundColor: colors.bg, borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative", overflow: "hidden", marginTop: "40px", marginBottom: "40px",
          display: "flex", flexDirection: "column",
        }}>

          {/* ── Header ── */}
          <AppHeader />

          {/* ── Tuner content ── */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", width: "100%", boxSizing: "border-box", minHeight: 0 }}>
            <div style={{ padding: "18px 20px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px" }}>
                  Ponytail Radio
                </div>
                <div
                  onClick={() => setAddStationOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px", cursor: "pointer",
                    padding: "7px 12px", borderRadius: "20px", border: `1px solid ${colors.teal}`,
                    backgroundColor: colors.tealGlow,
                  }}
                >
                  <PlusIcon />
                  <span style={{ fontSize: "11px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>
                    Add Station
                  </span>
                </div>
              </div>
              <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                Tune the dial or tap a station below
              </div>
            </div>

            <FrequencyDial
              stations={allStations}
              tunedId={tunedId}
              tunedPosition={tunedStation?.position}
              tunedHue={tunedStation?.hue}
              onTune={handleTune}
            />

            {/* ── Now tuned panel ── */}
            <div style={{ padding: "6px 20px 0" }}>
              {!tunedStation ? (
                <div style={{
                  padding: "22px 16px", borderRadius: "16px", backgroundColor: colors.bgCard,
                  textAlign: "center", fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
                }}>
                  Nothing tuned in — drag the dial or tap a station below
                </div>
              ) : (
                <div style={{
                  borderRadius: "16px", backgroundColor: colors.bgCard, padding: "14px",
                  border: `1.5px solid hsl(${tunedStation.hue}, 55%, 40%)`,
                  boxShadow: `0 0 20px hsla(${tunedStation.hue}, 70%, 50%, 0.12)`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      onClick={handlePlayPauseTuned}
                      style={{
                        width: 52, height: 52, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                        backgroundColor: `hsl(${tunedStation.hue}, 65%, 55%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: tunedTracks.length === 0 ? 0.4 : 1,
                      }}
                    >
                      {showPause ? <PauseGlyph /> : <PlayGlyph />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {tunedStation.name}
                      </div>
                      <div style={{ fontSize: "11px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "1px" }}>
                        {tunedLoading ? 'Tuning in...' : (tunedTracks.length === 0 ? 'No tracks yet' : `${tunedTracks.length} track${tunedTracks.length === 1 ? '' : 's'} · ${tunedStation.subtitle}`)}
                      </div>
                      {isTunedActive && currentTrack && (
                        <div style={{ fontSize: "11px", color: colors.teal, fontFamily: "'Kanit', sans-serif", marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Now playing: {currentTrack.title} — {currentTrack.artist}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
                      <div onClick={() => { setInfoOpen(v => !v); setSettingsOpen(false); }} style={{ cursor: "pointer", padding: "3px" }}>
                        <InfoIcon color={infoOpen ? colors.teal : colors.muted} />
                      </div>
                      <div onClick={() => { setSettingsOpen(v => !v); setInfoOpen(false); }} style={{ cursor: "pointer", padding: "3px" }}>
                        <SettingsIcon color={settingsOpen ? colors.teal : colors.muted} />
                      </div>
                    </div>
                  </div>

                  {/* ── Thumbs up/down — only for the track actually playing from this
                  tuned station's pool, since a rating should be about a specific track,
                  not "whatever this station happens to be" ── */}
                  {isTunedActive && (
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${colors.border}` }}>
                      <span style={{ fontSize: "10.5px", color: colors.muted, fontFamily: "'Kanit', sans-serif", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                        Rate this track
                      </span>
                      <div onClick={() => handleRate(1)} style={{ cursor: "pointer" }}>
                        <ThumbUpIcon active={currentRating === 1} />
                      </div>
                      <div onClick={() => handleRate(-1)} style={{ cursor: "pointer" }}>
                        <ThumbDownIcon active={currentRating === -1} />
                      </div>
                    </div>
                  )}

                  {/* ── Station info ── */}
                  {infoOpen && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${colors.border}`, fontSize: "11.5px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", lineHeight: 1.6 }}>
                      {tunedStation.kind === 'hot-in-here' && (
                        hotInHereLocation
                          ? <>Matches other musicians uploading tracks near <strong style={{ color: colors.text }}>{hotInHereLocation}</strong>, same-city for now.</>
                          : <>Set a location on your profile to start hearing artists uploading near you.</>
                      )}
                      {tunedStation.kind === 'your-station' && (
                        <>Built from your own uploads, plus catalog tracks matched to your genre, subgenre, mood, or similar-artist tags.</>
                      )}
                      {tunedStation.kind === 'goat' && (
                        goatState.mode === 'ungoat'
                          ? <><strong style={{ color: colors.text }}>{goatState.artist}</strong> and every artist similar to them are muted across every other station on your dial.</>
                          : <>Plays <strong style={{ color: colors.text }}>{goatState.artist}</strong> plus the artists most similar to them.</>
                      )}
                      {tunedStation.kind === 'custom' && (
                        <>Seeded from <strong style={{ color: colors.text }}>{tunedStation.seedArtist}</strong> — their catalog plus similar artists.</>
                      )}
                    </div>
                  )}

                  {/* ── Station settings ── */}
                  {settingsOpen && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${colors.border}` }}>
                      {tunedStation.kind === 'goat' && (
                        <>
                          <div
                            onClick={handleToggleGoatMode}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "10px 12px", borderRadius: "10px", backgroundColor: colors.bg,
                              cursor: "pointer", marginBottom: "8px",
                            }}
                          >
                            <span style={{ fontSize: "12px", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
                              {goatState.mode === 'ungoat' ? 'Switch to GOAT (play them)' : 'Switch to UN-GOAT (mute them)'}
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: goatState.mode === 'ungoat' ? colors.danger : colors.gold, fontFamily: "'Kanit', sans-serif" }}>
                              {goatState.mode === 'ungoat' ? 'UN-GOAT' : 'GOAT'}
                            </span>
                          </div>
                          <div
                            onClick={() => setGoatPickerOpen(true)}
                            style={{
                              padding: "10px 12px", borderRadius: "10px", backgroundColor: colors.bg,
                              cursor: "pointer", fontSize: "12px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif",
                            }}
                          >
                            Change GOAT artist
                          </div>
                        </>
                      )}
                      {tunedStation.kind === 'custom' && (
                        deleteConfirmId === tunedStation.id ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <div
                              onClick={() => handleDeleteStation(tunedStation.id)}
                              style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: "10px", backgroundColor: colors.dangerGlow, border: `1px solid ${colors.danger}`, color: colors.danger, fontSize: "12px", fontWeight: "600", fontFamily: "'Kanit', sans-serif", cursor: "pointer" }}
                            >
                              Delete "{tunedStation.name}"
                            </div>
                            <div
                              onClick={() => setDeleteConfirmId(null)}
                              style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: "10px", backgroundColor: colors.bg, color: colors.muted, fontSize: "12px", fontFamily: "'Kanit', sans-serif", cursor: "pointer" }}
                            >
                              Cancel
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setDeleteConfirmId(tunedStation.id)}
                            style={{
                              padding: "10px 12px", borderRadius: "10px", backgroundColor: colors.bg,
                              cursor: "pointer", fontSize: "12px", color: colors.danger, fontFamily: "'Kanit', sans-serif",
                            }}
                          >
                            Delete this station
                          </div>
                        )
                      )}
                      {(tunedStation.kind === 'hot-in-here' || tunedStation.kind === 'your-station') && (
                        <div style={{ fontSize: "11.5px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                          This station is built automatically — nothing to configure here.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── All stations list ── */}
            <div style={{ padding: "18px 16px 24px" }}>
              <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px", paddingLeft: "4px" }}>
                All Stations
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {allStations.map((s) => (
                  <StationRow
                    key={s.id}
                    station={s}
                    isTuned={s.id === tunedId}
                    isPlayingThis={s.id === tunedId && showPause}
                    onTune={handleTune}
                  />
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

          {/* ── Profile Panel ── */}
          <ProfilePanel />

          {/* ── Read-only viewer for a playlist you don't own ── */}
          <PublicPlaylistPanel />

          {/* ── Add Station sheet ── */}
          {addStationOpen && (
            <SheetOverlay title="Add a Station" onClose={() => setAddStationOpen(false)}>
              <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "10px" }}>
                Name it, then pick the artist to seed it from — we'll fill it with their catalog plus similar artists.
              </div>
              <input
                style={{
                  width: "100%", padding: "11px 14px", marginBottom: "10px",
                  borderRadius: "10px", backgroundColor: colors.bg, border: "1.5px solid transparent",
                  color: colors.text, fontSize: "13px", outline: "none", fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
                }}
                placeholder="Station name"
                value={newStationName}
                onChange={(e) => setNewStationName(e.target.value)}
              />
              <ArtistSearchInput
                value={newStationArtist}
                onChange={setNewStationArtist}
                onSelectArtist={setNewStationArtist}
                placeholder="Seed artist"
              />
              <PrimaryButton
                label="Create Station"
                disabled={!newStationName.trim() || !newStationArtist.trim()}
                onClick={handleCreateStation}
              />
            </SheetOverlay>
          )}

          {/* ── GOAT picker ── */}
          {goatPickerOpen && (
            <SheetOverlay title="Pick Your GOAT" onClose={() => setGoatPickerOpen(false)}>
              <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "10px" }}>
                The musician you want to hear most, plus everyone similar to them. Switch it to UN-GOAT any time to mute them instead.
              </div>
              <ArtistSearchInput
                value={goatArtistInput}
                onChange={setGoatArtistInput}
                onSelectArtist={handlePickGoat}
                placeholder="Search for your GOAT"
              />
            </SheetOverlay>
          )}

        </div>
      </div>
    </>
  );
}
