import { useState, useEffect, useRef } from "react";
import {
  getMe, getHotInHere, getMyStation,
  getRadioStations, createRadioStation, deleteRadioStation,
  getStationTracks, setGoat as apiSetGoat, getGoatTracks,
  searchArtists, rateTrack,
} from '../services/authService';
import FooterNav from '../components/FooterNav';
import FullPlayer from '../components/FullPlayer';
import ProfilePanel from '../components/ProfilePanel';
import PublicPlaylistPanel from '../components/PublicPlaylistPanel';
import MessagesLayer from '../components/MessagesLayer';
import { usePlayer, usePlaybackProgress } from '../context/PlayerContext';

// ─── Radio — board-directed "neon tuner" look. The whole screen is the
// player: the playing track's cover blurred edge to edge behind a grey veil,
// the tuned station's name as a neon sign, a 0–100 μHz dial, the cover, and
// transport controls. The app header and mini player are intentionally not
// rendered here (the screen itself is the player); the footer nav stays so
// you can still leave. Station details live in the Station Panel, opened by
// tapping the station name, the goat badge, the gear, or "+". ──

// ─── Colors ───────────────────────────────────────────────────────────────────
const colors = {
  bg: "#222222",
  bgDeep: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  danger: "#ff6b6b",
  needle: "#ff3b30",
  periwinkle: "#c9c9ff",
};

const kanit = "'Kanit', sans-serif";
const signFont = "'Knewave', 'Permanent Marker', 'Kanit', sans-serif";   // station name, frequency, mode
const markerFont = "'Permanent Marker', 'Kanit', sans-serif";            // description, track title

// ─── Neon text. paint-order puts the dark outline behind the pale fill, and
// the text-shadow supplies the glow, so each one reads as a lit tube. ──
const neon = {
  yellow: { color: "#ffffa6", WebkitTextStroke: "7px #6d6a12", paintOrder: "stroke fill", textShadow: "0 0 14px rgba(255,255,70,0.95), 0 0 36px rgba(255,255,0,0.65)" },
  blue: { color: "#ececff", WebkitTextStroke: "6px #1616c4", paintOrder: "stroke fill", textShadow: "0 0 10px rgba(70,70,255,0.95), 0 0 22px rgba(40,40,255,0.6)" },
  green: { color: "#dcffdc", WebkitTextStroke: "4px #1d6a2b", paintOrder: "stroke fill", textShadow: "0 0 10px rgba(90,255,130,0.85), 0 0 20px rgba(60,220,100,0.5)" },
};
const greenBand = "linear-gradient(90deg, rgba(20,90,40,0), rgba(20,90,40,0.5) 12%, rgba(20,90,40,0.5) 88%, rgba(20,90,40,0))";

// ─── Built-in stations always sit at the same dial position/hue so they never
// collide with each other, and custom stations are placed clear of them (see
// the position math in POST /radio/stations on the backend). Hot in Here owns
// the very start of the dial. ──
const HOT_IN_HERE_POSITION = 0.1;
const YOUR_STATION_POSITION = 50;
const GOAT_POSITION = 96;
const HOT_IN_HERE_HUE = 58;
const YOUR_STATION_HUE = 45;
const GOAT_HUE = 130;
const UNGOAT_HUE = 355;
const HOT_IN_HERE_BLURB = "A selection of the top artists within 10 miles of you";

const trackKey = (t) => `${t?.title}|${t?.artist}`;
const formatTime = (seconds) => (seconds > 0 ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : "0:00");

// ─── Icons ────────────────────────────────────────────────────────────────────
const glowFilter = "drop-shadow(0 0 5px rgba(90,90,255,0.95)) drop-shadow(0 0 10px rgba(60,60,255,0.6))";

const PlusIcon = ({ color = colors.periwinkle, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const XIcon = ({ color = colors.text, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const InfoIcon = ({ color = colors.periwinkle, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9.2" stroke={color} strokeWidth="1.9" />
    <path d="M12 11v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="7.5" r="1.2" fill={color} />
  </svg>
);

const SettingsIcon = ({ color = colors.periwinkle, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.9" />
    <path
      d="M19.4 13a7.6 7.6 0 000-2l2-1.4-2-3.4-2.3.7a7.6 7.6 0 00-1.7-1L15 3h-6l-.4 2.9a7.6 7.6 0 00-1.7 1l-2.3-.7-2 3.4L4.6 11a7.6 7.6 0 000 2l-2 1.4 2 3.4 2.3-.7a7.6 7.6 0 001.7 1L9 21h6l.4-2.9a7.6 7.6 0 001.7-1l2.3.7 2-3.4-2-1.4z"
      stroke={color} strokeWidth="1.7" strokeLinejoin="round"
    />
  </svg>
);

const PinIcon = ({ color = colors.text, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="2" />
  </svg>
);

const HeartIcon = ({ color = colors.text, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 21C12 21 3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SaveIcon = ({ color = colors.text, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 3h11l4 4v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 3v5h7V3M7 21v-7h10v7" stroke={color} strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = ({ color = colors.text, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 11v6M14 11v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ThumbIcon = ({ down = false, active = false, size = 24 }) => {
  const stroke = active ? (down ? colors.danger : colors.teal) : "rgba(255,255,255,0.85)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: down ? "rotate(180deg)" : "none" }}>
      <path d="M7 22V11l5-8 1.5 1L12 11h7a2 2 0 012 2.3l-1.6 7A2 2 0 0117.4 22H7z" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" fill={active ? stroke : "none"} fillOpacity={active ? 0.25 : 0} />
      <path d="M3 11h4v11H3z" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
};

const SkipIcon = ({ back = false, size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: back ? "none" : "scaleX(-1)" }}>
    <path d="M6 4.5v15" stroke="rgba(255,255,255,0.85)" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M19 5l-10 7 10 7V5z" stroke="rgba(255,255,255,0.85)" strokeWidth="1.9" strokeLinejoin="round" />
  </svg>
);

const PlayPauseIcon = ({ playing, size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {playing ? (
      <>
        <rect x="6.5" y="4.5" width="3.6" height="15" rx="1.3" stroke="#fff" strokeWidth="1.9" />
        <rect x="13.9" y="4.5" width="3.6" height="15" rx="1.3" stroke="#fff" strokeWidth="1.9" />
      </>
    ) : (
      <path d="M8 4.5l11 7.5-11 7.5v-15z" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" />
    )}
  </svg>
);

// ─── The goat-with-headphones badge — the same pixel art as the onboarding
// GoatMode.svg, redrawn inline so it can take the radio's neon colors (green
// goat, pink headphones) and turn red when the dial is in UN-GOAT mode. ──
const GOAT_HEAD = "M23 49.9667V48.9333H22H21V47.9V46.8667H20H19V41.7V36.5333H18H17V33.4333V30.3333H16H15V29.3V28.2667H13H11V27.2333V26.2H12H13V25.1667V24.1333H12H11V23.1V22.0667H13H15V23.1V24.1333H18H21V23.1V22.0667H22H23V21.0333V20H27H31V21.0333V22.0667H32H33V23.1V24.1333H36H39V23.1V22.0667H41H43V23.1V24.1333H42H41V25.1667V26.2H42H43V27.2333V28.2667H41H39V29.3V30.3333H38H37V33.4333V36.5333H36H35V41.7V46.8667H34H33V47.9V48.9333H32H31V49.9667V51H27H23V49.9667ZM31 47.9V46.8667H32H33V45.8333V44.8H32H31V45.8333V46.8667H27H23V45.8333V44.8H22H21V45.8333V46.8667H22H23V47.9V48.9333H27H31V47.9ZM25 41.7V40.6667H24H23V41.7V42.7333H24H25V41.7ZM31 41.7V40.6667H30H29V41.7V42.7333H30H31V41.7ZM23 30.3333V28.2667H21H19V29.3V30.3333H20H21V31.3667V32.4H22H23V30.3333ZM33 31.3667V30.3333H34H35V29.3V28.2667H33H31V30.3333V32.4H32H33V31.3667Z";
const GOAT_HEADPHONES = [
  "M21.5862 10.375H11.4482V13.75H21.5862V10.375Z", "M43.5517 10.375H33.4138V13.75H43.5517V10.375Z",
  "M33.4138 8.6875H21.5862V12.0625H33.4138V8.6875Z", "M11.4482 12.0625H8.06885V15.4375H11.4482V12.0625Z",
  "M9.7587 15.4375H6.37939V22.1875H9.7587V15.4375Z", "M11.4482 20.5V30.625H4.68945V20.5H11.4482ZM6.37891 27.25H9.75879V23.875H6.37891V27.25Z",
  "M46.9311 12.0625H43.5518V15.4375H46.9311V12.0625Z", "M48.6208 15.4375H45.2415V22.1875H48.6208V15.4375Z",
  "M50.3105 20.5V30.625H43.5518V20.5H50.3105ZM45.2412 27.25H48.6211V23.875H45.2412V27.25Z",
];

const GoatBadge = ({ size = 34, ungoat = false }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
    border: `2px solid ${ungoat ? "#ffc4c4" : "#d6ffe0"}`,
    backgroundColor: ungoat ? "rgba(120,30,30,0.8)" : "rgba(34,120,66,0.8)",
    boxShadow: ungoat ? "0 0 10px rgba(255,80,80,0.8)" : "0 0 10px rgba(90,255,130,0.8)",
    display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
  }}>
    <svg width="100%" height="100%" viewBox="2 4 51 51" fill="none">
      <path d={GOAT_HEAD} fill={ungoat ? "#ff9a9a" : "#8dffab"} />
      {GOAT_HEADPHONES.map((d) => <path key={d} d={d} fill={ungoat ? "#ffe08a" : "#ffa3dc"} />)}
    </svg>
  </div>
);

// ─── Artist search input — used by the Station Panel's Artist / Goat /
// UN-GOAT fields. Debounced against GET /artists/search; onSelectArtist
// fires with a plain artist-name string. ──
const panelFieldStyle = (focused) => ({
  width: "100%", padding: "9px 12px",
  borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.08)",
  border: `1.5px solid ${focused ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.32)"}`,
  color: colors.text, fontSize: "14px", outline: "none",
  fontFamily: kanit, boxSizing: "border-box", transition: "border-color 0.15s ease",
});

const ArtistSearchInput = ({ value, onChange, onSelectArtist, placeholder, disabled = false }) => {
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!focused || !value || value.trim().length < 2) {
      setResults([]);
      return undefined;
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
  }, [value, focused]);

  return (
    <div style={{ position: "relative" }}>
      <input
        className="radio-panel-field"
        style={{ ...panelFieldStyle(focused), opacity: disabled ? 0.6 : 1 }}
        placeholder={placeholder}
        value={value}
        readOnly={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {focused && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 80,
          backgroundColor: "#1c1c1c", borderRadius: "8px", overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.25)", maxHeight: "150px", overflowY: "auto",
        }}>
          {results.map((a) => (
            <div
              key={a.id}
              onMouseDown={(e) => { e.preventDefault(); onSelectArtist(a.name); setResults([]); }}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", cursor: "pointer" }}
            >
              <div style={{ width: 24, height: 24, borderRadius: "5px", overflow: "hidden", flexShrink: 0, backgroundColor: colors.bgCardHover }}>
                {a.coverUrl && <img src={a.coverUrl} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ fontSize: "13px", color: colors.text, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tuner dial — numbers 0–90 over a ruler of tick marks, a thin line of
// glowing station dots under it, and a red needle. Tapping a dot tunes
// instantly; dragging the ruler snaps to whichever station is nearest
// wherever the pointer is released, like an analog dial with detents. ──
const TunerDial = ({ stations, tunedId, tunedPosition, onTune }) => {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(null);

  const positionFromClientX = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return tunedPosition ?? 0;
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
    const pointX = (e) => (e.touches && e.touches[0] ? e.touches[0].clientX : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : e.clientX));
    const handleMove = (e) => setDragPosition(positionFromClientX(pointX(e)));
    const handleUp = (e) => {
      const station = nearestStation(positionFromClientX(pointX(e)));
      setDragging(false);
      setDragPosition(null);
      if (station) onTune(station);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, stations]);

  const displayPosition = dragging && dragPosition !== null ? dragPosition : (tunedPosition ?? 0);
  const startDrag = (clientX) => { setDragging(true); setDragPosition(positionFromClientX(clientX)); };

  return (
    <div style={{ padding: "0 30px", flexShrink: 0 }}>
      <div
        ref={trackRef}
        onMouseDown={(e) => startDrag(e.clientX)}
        onTouchStart={(e) => startDrag(e.touches[0].clientX)}
        style={{ position: "relative", width: "100%", height: "50px", cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}
      >
        {/* Numbers */}
        {[...Array(10)].map((_, i) => (
          <div key={i} style={{
            position: "absolute", left: `${i * 10}%`, top: 0, transform: "translateX(-50%)",
            fontSize: "9.5px", color: "rgba(255,255,255,0.82)", fontFamily: kanit, pointerEvents: "none",
          }}>
            {i * 10}
          </div>
        ))}

        {/* Ruler ticks — one every 2 μHz, taller on the 5s and 10s */}
        {[...Array(50)].map((_, i) => {
          const value = i * 2;
          const h = value % 10 === 0 ? 11 : 7;
          return (
            <div key={i} style={{
              position: "absolute", left: `${value}%`, top: `${29 - h}px`,
              width: "1px", height: `${h}px`, backgroundColor: "rgba(255,255,255,0.7)", pointerEvents: "none",
            }} />
          );
        })}

        {/* Station line + dots */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "41px", height: "1px", backgroundColor: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
        {stations.map((s) => {
          const tuned = s.id === tunedId;
          const size = tuned ? 8 : 6;
          return (
            <div
              key={s.id}
              onMouseDown={(e) => { e.stopPropagation(); onTune(s); }}
              onTouchStart={(e) => { e.stopPropagation(); onTune(s); }}
              title={s.name}
              style={{
                position: "absolute", left: `${s.position}%`, top: "41px", transform: "translate(-50%, -50%)",
                width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <div style={{
                width: size, height: size, borderRadius: "50%",
                backgroundColor: `hsl(${s.hue}, 100%, 62%)`,
                boxShadow: `0 0 6px hsl(${s.hue}, 100%, 60%), 0 0 12px hsl(${s.hue}, 100%, 55%)`,
                transition: "all 0.15s ease",
              }} />
            </div>
          );
        })}

        {/* Needle */}
        <div style={{
          position: "absolute", left: `${displayPosition}%`, top: 0, transform: "translateX(-50%)",
          pointerEvents: "none", transition: dragging ? "none" : "left 0.25s ease",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${colors.needle}` }} />
          <div style={{ width: "2px", height: "43px", backgroundColor: colors.needle, marginTop: "-1px", boxShadow: "0 0 6px rgba(255,59,48,0.7)" }} />
        </div>
      </div>
    </div>
  );
};

// ─── Dark full-frame overlay shared by the Station Panel and the info sheet —
// contained within the phone frame (absolute, not fixed) so it never escapes
// it. The screen underneath stays faintly visible, as in the board mock. ──
const DarkOverlay = ({ onClose, children }) => (
  <div style={{
    position: "absolute", inset: 0, zIndex: 200,
    backgroundColor: "rgba(0,0,0,0.84)",
    display: "flex", flexDirection: "column",
    animation: "radioFade 0.2s ease",
  }}>
    <div onClick={onClose} style={{ position: "absolute", top: "26px", right: "22px", cursor: "pointer", padding: "4px", zIndex: 2 }}>
      <XIcon />
    </div>
    {children}
  </div>
);

const RoundOption = ({ label, onClick, children, ring = true, active = false, dim = false }) => (
  <div
    onClick={onClick}
    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "70px", cursor: onClick ? "pointer" : "default", opacity: dim ? 0.5 : 1 }}
  >
    <div style={{
      width: "46px", height: "46px", borderRadius: "50%", boxSizing: "border-box",
      border: ring ? `2px solid ${active ? "#d6ffe0" : "#fff"}` : "none",
      backgroundColor: ring ? "transparent" : "rgba(255,255,255,0.14)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {children}
    </div>
    <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.88)", fontFamily: kanit, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
      {label}
    </div>
  </div>
);

const RoundAction = ({ onClick, children, danger = false, disabled = false, title }) => (
  <div
    onClick={disabled ? undefined : onClick}
    title={title}
    style={{
      width: "46px", height: "46px", borderRadius: "50%",
      backgroundColor: danger ? "rgba(255,80,80,0.28)" : "rgba(255,255,255,0.13)",
      border: danger ? `1.5px solid ${colors.danger}` : "1.5px solid transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.35 : 1,
      transition: "all 0.15s ease", boxSizing: "border-box",
    }}
  >
    {children}
  </div>
);

// ─── Radio Screen ─────────────────────────────────────────────────────────────
export default function RadioScreen({ setScreen }) {
  const [activeNav, setActiveNav] = useState("radio");
  const [user, setUser] = useState(null);
  const [hotInHere, setHotInHere] = useState([]);
  const [hotInHereLocation, setHotInHereLocation] = useState(null);
  const [hotInHereLoaded, setHotInHereLoaded] = useState(false);
  const [myStation, setMyStation] = useState(null);
  const [customStations, setCustomStations] = useState([]);
  const [goatState, setGoatState] = useState({ artist: null, mode: 'goat' });

  const [tunedId, setTunedId] = useState(null);
  const [tunedTracks, setTunedTracks] = useState([]);
  const [tunedLoading, setTunedLoading] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);
  // Station Panel: null (closed), { mode: 'new' } or { mode: 'edit', stationId }
  const [panel, setPanel] = useState(null);
  const [deleteArmed, setDeleteArmed] = useState(false);

  // Station Panel fields. Name + seed artist create a station today; the
  // description and tags are placeholders until that part is built out.
  const [newStationName, setNewStationName] = useState("");
  const [newStationArtist, setNewStationArtist] = useState("");
  const [panelDescription, setPanelDescription] = useState("");
  const [panelTags, setPanelTags] = useState("");
  const [goatInput, setGoatInput] = useState("");
  const [ungoatInput, setUngoatInput] = useState("");

  const [ratings, setRatings] = useState({});

  const { playTrack, togglePlay, nextTrack, prevTrack, seekTo, currentTrack, isPlaying } = usePlayer();
  const { progress, duration, currentTime } = usePlaybackProgress();

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
      } finally {
        setHotInHereLoaded(true);
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
      subtitle: HOT_IN_HERE_BLURB,
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
  // What the middle of the screen shows: the track playing from this
  // station, or the station's first track as a preview before you press play
  const displayTrack = isTunedActive ? currentTrack : (tunedTracks[0] || null);

  const handleTune = async (station) => {
    if (!station) return;
    setTunedId(station.id);
    setInfoOpen(false);

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
        // No GOAT picked yet — the Station Panel is where you pick one
        setTunedTracks([]);
        openPanel({ mode: 'edit', stationId: 'goat' });
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

  // ── The dial rests on Hot in Here (0 μHz) when you arrive. Tuning never
  // starts playback on its own — that's the play button's job. ──
  useEffect(() => {
    if (hotInHereLoaded && tunedId === null) {
      handleTune({ id: 'hot-in-here', kind: 'hot-in-here' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotInHereLoaded]);

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

  const handleSeek = (e) => {
    if (!isTunedActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  // ── Station Panel ──
  const openPanel = (next) => {
    setPanel(next);
    setInfoOpen(false);
    setDeleteArmed(false);
    setNewStationName("");
    setNewStationArtist("");
    setPanelDescription("");
    setPanelTags("");
    setGoatInput("");
    setUngoatInput("");
  };
  const closePanel = () => { setPanel(null); setDeleteArmed(false); };

  const handleCreateStation = async () => {
    if (!newStationName.trim() || !newStationArtist.trim()) return;
    try {
      const data = await createRadioStation(newStationName.trim(), newStationArtist.trim());
      setCustomStations(prev => [...prev, data.station]);
      closePanel();
      handleTune({ ...data.station, kind: 'custom' });
    } catch (err) {
      console.log('Failed to create station:', err);
    }
  };

  const handleDeleteStation = async (id) => {
    try {
      await deleteRadioStation(id);
      setCustomStations(prev => prev.filter(s => s.id !== id));
      closePanel();
      if (tunedId === id) handleTune({ id: 'hot-in-here', kind: 'hot-in-here' });
    } catch (err) {
      console.log('Failed to delete station:', err);
    }
  };

  const handleSetGoat = async (artistName, mode) => {
    try {
      const data = await apiSetGoat({ artist: artistName, mode });
      setGoatState(data.goat);
      setGoatInput("");
      setUngoatInput("");
    } catch (err) {
      console.log('Failed to set GOAT:', err);
    }
  };

  const handleToggleGoatMode = async () => {
    if (!goatState.artist) return;
    const nextMode = goatState.mode === 'goat' ? 'ungoat' : 'goat';
    try {
      const data = await apiSetGoat({ mode: nextMode });
      setGoatState(data.goat);
    } catch (err) {
      console.log('Failed to toggle GOAT mode:', err);
    }
  };

  // ── Changing the GOAT while tuned to the GOAT station reloads its tracks ──
  useEffect(() => {
    if (tunedId === 'goat' && goatState.artist) handleTune({ id: 'goat', kind: 'goat' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goatState.artist, goatState.mode]);

  const ratingKey = currentTrack ? trackKey(currentTrack) : null;
  const currentRating = isTunedActive && ratingKey ? ratings[ratingKey] : null;
  const isUngoat = goatState.mode === 'ungoat';

  // ── Sign text: the station name, sized to fit two lines ──
  const signText = tunedStation
    ? (tunedStation.kind === 'hot-in-here' ? 'Hot in Here!!!' : tunedStation.name)
    : 'Ponytail Radio';
  const signSize = signText.length <= 14 ? 52 : signText.length <= 22 ? 38 : 29;
  const frequency = tunedStation ? tunedStation.position.toFixed(1) : "0.0";

  const emptyMessage = !tunedStation
    ? "Drag the dial to tune in"
    : tunedLoading
      ? "Tuning in..."
      : tunedStation.kind === 'hot-in-here'
        ? (hotInHereLocation ? "No artists near you are on the air yet" : "Set your city to hear artists near you")
        : tunedStation.kind === 'goat' && !goatState.artist
          ? "Tap the goat to pick your GOAT"
          : tunedStation.kind === 'goat' && isUngoat
            ? "UN-GOAT is muting, not playing"
            : "Nothing on this frequency yet";

  const panelStation = panel?.mode === 'edit' ? (allStations.find(s => s.id === panel.stationId) || null) : null;
  const isNewStation = panel?.mode === 'new';
  const canSaveNew = !!newStationName.trim() && !!newStationArtist.trim();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Knewave&family=Permanent+Marker&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Kanit', sans-serif; }
        body { background: #222222; }
        @keyframes radioFade { from { opacity: 0; } to { opacity: 1; } }
        ::-webkit-scrollbar { display: none; }
        .radio-panel-field::placeholder { color: rgba(255,255,255,0.5); }
        .radio-sign-input::placeholder { color: #ffffa6; opacity: 1; }
        .radio-desc-input::placeholder { color: #dcffdc; opacity: 1; }
      `}</style>

      <div style={{ minHeight: "100vh", width: "100%", backgroundColor: colors.bgDeep, display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: kanit }}>
        <div style={{
          width: "375px", height: "750px", backgroundColor: colors.bg, borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative", overflow: "hidden", marginTop: "40px", marginBottom: "40px",
          display: "flex", flexDirection: "column",
        }}>

          {/* ── Tuner (everything above the footer) ── */}
          <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>

            {/* Backdrop: the cover, blurred edge to edge, under a grey veil */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #5a5a66, #3a3a40)" }}>
              {displayTrack?.coverUrl && (
                <img
                  src={displayTrack.coverUrl}
                  alt=""
                  draggable={false}
                  style={{ position: "absolute", inset: "-12%", width: "124%", height: "124%", objectFit: "cover", filter: "blur(22px)" }}
                />
              )}
              <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(125,125,125,0.62)" }} />
            </div>

            {/* Top-right actions */}
            <div style={{ position: "absolute", top: "24px", right: "18px", zIndex: 3, display: "flex", flexDirection: "column", gap: "18px", filter: glowFilter }}>
              <div onClick={() => setInfoOpen(true)} style={{ cursor: "pointer" }} title="About this station"><InfoIcon /></div>
              <div onClick={() => tunedStation && openPanel({ mode: 'edit', stationId: tunedStation.id })} style={{ cursor: "pointer" }} title="Station settings"><SettingsIcon /></div>
              <div onClick={() => openPanel({ mode: 'new' })} style={{ cursor: "pointer" }} title="New station"><PlusIcon /></div>
            </div>

            {/* Sign: station name */}
            <div
              onClick={() => tunedStation && openPanel({ mode: 'edit', stationId: tunedStation.id })}
              style={{
                position: "relative", zIndex: 2, flexShrink: 0, cursor: "pointer",
                minHeight: "118px", padding: "20px 58px 0 44px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{
                ...neon.yellow, fontFamily: signFont, fontSize: `${signSize}px`, lineHeight: 0.98,
                textAlign: "center", textTransform: "uppercase", transform: "rotate(-3deg) skewX(-6deg)",
                letterSpacing: "0.5px", overflowWrap: "anywhere",
              }}>
                {signText}
              </div>
            </div>

            {/* Frequency · goat · mode */}
            <div style={{ position: "relative", zIndex: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", marginTop: "2px" }}>
              <div style={{ ...neon.blue, fontFamily: signFont, fontSize: "25px", lineHeight: 1 }}>{frequency}</div>
              <div style={{ ...neon.blue, WebkitTextStroke: "4px #1616c4", fontFamily: signFont, fontSize: "15px", lineHeight: 1, marginTop: "5px" }}>μHz</div>
              <div onClick={() => tunedStation && openPanel({ mode: 'edit', stationId: tunedStation.id })} style={{ cursor: "pointer" }}>
                <GoatBadge size={36} ungoat={isUngoat} />
              </div>
              <div style={{ ...neon.blue, WebkitTextStroke: "5px #1616c4", fontFamily: signFont, fontSize: "17px", lineHeight: 1 }}>
                {isUngoat ? "Un-Goat Mode" : "Goat Mode"}
              </div>
            </div>

            {/* Description */}
            <div style={{ position: "relative", zIndex: 2, flexShrink: 0, margin: "10px 20px 0", padding: "3px 4px", background: greenBand, textAlign: "center" }}>
              <div style={{ ...neon.green, WebkitTextStroke: "3px #1d6a2b", fontFamily: markerFont, fontSize: "9.5px", lineHeight: 1.35, textTransform: "uppercase" }}>
                {tunedStation ? tunedStation.subtitle : "Tune the dial to pick a station"}
              </div>
            </div>

            {/* Dial */}
            <div style={{ position: "relative", zIndex: 2, marginTop: "26px", flexShrink: 0 }}>
              <TunerDial
                stations={allStations}
                tunedId={tunedId}
                tunedPosition={tunedStation?.position}
                onTune={handleTune}
              />
            </div>

            {/* Cover */}
            <div style={{ position: "relative", zIndex: 1, flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0 4px" }}>
              {displayTrack ? (
                <div style={{ position: "relative", height: "100%", maxHeight: "150px", aspectRatio: "1" }}>
                  {/* Soft, oversized copy of the cover behind the sharp one */}
                  {displayTrack.coverUrl && (
                    <img
                      src={displayTrack.coverUrl}
                      alt=""
                      draggable={false}
                      style={{ position: "absolute", left: "-14%", top: "-16%", width: "128%", height: "200%", objectFit: "cover", filter: "blur(9px)", opacity: 0.9, borderRadius: "4px" }}
                    />
                  )}
                  <div style={{
                    position: "relative", width: "100%", height: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                    background: `linear-gradient(135deg, hsl(${(displayTrack.title?.charCodeAt(0) || 5) * 37 % 360}, 45%, 38%), hsl(${((displayTrack.title?.charCodeAt(0) || 5) * 37 + 40) % 360}, 40%, 22%))`,
                  }}>
                    {displayTrack.coverUrl && (
                      <img src={displayTrack.coverUrl} alt={displayTrack.title} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  height: "100%", maxHeight: "150px", aspectRatio: "1", border: "1.5px dashed rgba(255,255,255,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", textAlign: "center",
                  fontFamily: markerFont, fontSize: "12px", lineHeight: 1.4, color: "rgba(255,255,255,0.85)", textTransform: "uppercase",
                  backgroundColor: "rgba(0,0,0,0.15)",
                }}>
                  {emptyMessage}
                </div>
              )}
            </div>

            {/* Track title + artist */}
            <div style={{ position: "relative", zIndex: 2, flexShrink: 0, margin: "8px 34px 0", padding: "3px 8px 5px", background: displayTrack ? greenBand : "none", textAlign: "center", minHeight: "46px" }}>
              {displayTrack && (
                <>
                  <div style={{ ...neon.green, fontFamily: markerFont, fontSize: "18px", lineHeight: 1.15, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "2px 4px" }}>
                    {displayTrack.title}
                  </div>
                  <div style={{ ...neon.green, WebkitTextStroke: "3px #1d6a2b", fontFamily: markerFont, fontSize: "13px", lineHeight: 1.2, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "1px 4px" }}>
                    {displayTrack.artist}
                  </div>
                </>
              )}
            </div>

            {/* Transport */}
            <div style={{ position: "relative", zIndex: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 34px 0", opacity: tunedTracks.length === 0 ? 0.45 : 1 }}>
              <div onClick={() => handleRate(-1)} style={{ cursor: isTunedActive ? "pointer" : "default", display: "flex" }} title="Thumbs down">
                <ThumbIcon down active={currentRating === -1} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div onClick={() => isTunedActive && prevTrack()} style={{ cursor: isTunedActive ? "pointer" : "default", display: "flex" }}><SkipIcon back /></div>
                <div
                  onClick={handlePlayPauseTuned}
                  style={{
                    width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: tunedTracks.length === 0 ? "default" : "pointer",
                  }}
                >
                  <PlayPauseIcon playing={showPause} />
                </div>
                <div onClick={() => isTunedActive && nextTrack()} style={{ cursor: isTunedActive ? "pointer" : "default", display: "flex" }}><SkipIcon /></div>
              </div>
              <div onClick={() => handleRate(1)} style={{ cursor: isTunedActive ? "pointer" : "default", display: "flex" }} title="Thumbs up">
                <ThumbIcon active={currentRating === 1} />
              </div>
            </div>

            {/* Progress */}
            <div style={{ position: "relative", zIndex: 2, flexShrink: 0, padding: "14px 34px 16px" }}>
              <div onClick={handleSeek} style={{ padding: "5px 0", cursor: isTunedActive ? "pointer" : "default" }}>
                <div style={{ height: "3px", borderRadius: "2px", backgroundColor: "rgba(255,255,255,0.32)", overflow: "hidden" }}>
                  <div style={{ width: `${isTunedActive ? progress * 100 : 0}%`, height: "100%", backgroundColor: "#fff", borderRadius: "2px", transition: "width 0.5s linear" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.82)", fontFamily: kanit }}>{formatTime(isTunedActive ? currentTime : 0)}</span>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.82)", fontFamily: kanit }}>{formatTime(isTunedActive ? duration : 0)}</span>
              </div>
            </div>
          </div>

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
          <MessagesLayer />
          <PublicPlaylistPanel />

          {/* ── Station info + station list ── */}
          {infoOpen && (
            <DarkOverlay onClose={() => setInfoOpen(false)}>
              <div style={{ padding: "58px 30px 24px", overflowY: "auto", flex: 1 }}>
                <div style={{ ...neon.yellow, WebkitTextStroke: "5px #6d6a12", fontFamily: signFont, fontSize: "26px", textAlign: "center", transform: "rotate(-2deg)" }}>
                  {tunedStation ? tunedStation.name : "Ponytail Radio"}
                </div>
                <div style={{ marginTop: "18px", fontSize: "12.5px", color: "rgba(255,255,255,0.86)", fontFamily: kanit, lineHeight: 1.6, textAlign: "center" }}>
                  {!tunedStation && <>Drag the dial or pick a station below.</>}
                  {tunedStation?.kind === 'hot-in-here' && (
                    hotInHereLocation
                      ? <>Musicians uploading tracks near <strong style={{ color: colors.text }}>{hotInHereLocation}</strong>. It always sits at the very start of the dial.</>
                      : <>Set a city on your profile to start hearing artists uploading near you.</>
                  )}
                  {tunedStation?.kind === 'your-station' && (
                    <>Built from your own uploads, plus catalog tracks matched to your genre, subgenre, mood, or similar-artist tags.</>
                  )}
                  {tunedStation?.kind === 'goat' && (
                    !goatState.artist
                      ? <>Pick the musician you want to hear most. Open the station panel and search under Goat.</>
                      : isUngoat
                        ? <><strong style={{ color: colors.text }}>{goatState.artist}</strong> and every artist similar to them are muted across every other station on your dial.</>
                        : <>Plays <strong style={{ color: colors.text }}>{goatState.artist}</strong> plus the artists most similar to them.</>
                  )}
                  {tunedStation?.kind === 'custom' && (
                    <>Seeded from <strong style={{ color: colors.text }}>{tunedStation.seedArtist}</strong>: their catalog plus similar artists.</>
                  )}
                </div>

                <div style={{ ...neon.green, WebkitTextStroke: "3px #1d6a2b", fontFamily: markerFont, fontSize: "12px", textTransform: "uppercase", margin: "26px 0 10px", textAlign: "center" }}>
                  On your dial
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {[...allStations].sort((a, b) => a.position - b.position).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleTune(s)}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer",
                        backgroundColor: s.id === tunedId ? "rgba(255,255,255,0.12)" : "transparent",
                        border: `1.5px solid ${s.id === tunedId ? "rgba(255,255,255,0.32)" : "transparent"}`,
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, backgroundColor: `hsl(${s.hue}, 100%, 62%)`, boxShadow: `0 0 8px hsl(${s.hue}, 100%, 60%)` }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "500", color: colors.text, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                        <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.6)", fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.subtitle}</div>
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", fontFamily: kanit, flexShrink: 0 }}>{s.position.toFixed(1)} μHz</div>
                    </div>
                  ))}
                </div>
              </div>
            </DarkOverlay>
          )}

          {/* ── Station Panel ── */}
          {panel && (
            <DarkOverlay onClose={closePanel}>
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "30px 34px 22px" }}>

                {/* Name */}
                <div style={{ padding: "0 26px", textAlign: "center" }}>
                  {isNewStation ? (
                    <input
                      className="radio-sign-input"
                      value={newStationName}
                      onChange={(e) => setNewStationName(e.target.value)}
                      placeholder="New Station*"
                      maxLength={40}
                      style={{
                        ...neon.yellow, WebkitTextStroke: "5px #6d6a12", fontFamily: signFont, fontSize: "25px",
                        width: "100%", textAlign: "center", background: "none", border: "none", outline: "none",
                        transform: "rotate(-2deg)", padding: "8px 0",
                      }}
                    />
                  ) : (
                    <div style={{ ...neon.yellow, WebkitTextStroke: "5px #6d6a12", fontFamily: signFont, fontSize: "25px", transform: "rotate(-2deg)", padding: "8px 0", overflowWrap: "anywhere" }}>
                      {panelStation?.name}
                    </div>
                  )}
                </div>

                {/* Description */}
                {isNewStation ? (
                  <input
                    className="radio-desc-input"
                    value={panelDescription}
                    onChange={(e) => setPanelDescription(e.target.value)}
                    placeholder="CLICK HERE TO ADD A DESCRIPTION"
                    maxLength={60}
                    style={{
                      ...neon.green, WebkitTextStroke: "3px #1d6a2b", fontFamily: markerFont, fontSize: "11.5px", textTransform: "uppercase",
                      width: "100%", textAlign: "center", background: "none", border: "none", outline: "none", padding: "4px 0", marginTop: "2px",
                    }}
                  />
                ) : (
                  <div style={{ ...neon.green, WebkitTextStroke: "3px #1d6a2b", fontFamily: markerFont, fontSize: "11.5px", textTransform: "uppercase", textAlign: "center", padding: "4px 0", marginTop: "2px", lineHeight: 1.35 }}>
                    {panelStation?.subtitle}
                  </div>
                )}

                {/* Frequency + sample */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "10px" }}>
                  <div style={{ ...neon.blue, WebkitTextStroke: "5px #1616c4", fontFamily: signFont, fontSize: "18px" }}>
                    {panelStation ? panelStation.position.toFixed(1) : "??.?"} μHz
                  </div>
                  <div
                    onClick={() => {
                      if (panelStation && panelStation.id === tunedId && tunedTracks.length > 0) { handlePlayPauseTuned(); closePanel(); }
                    }}
                    style={{
                      padding: "5px 12px", borderRadius: "20px", backgroundColor: "#cfcfff", color: "#16161f",
                      fontSize: "12px", fontWeight: "500", fontFamily: kanit, whiteSpace: "nowrap",
                      cursor: panelStation && panelStation.id === tunedId && tunedTracks.length > 0 ? "pointer" : "default",
                    }}
                  >
                    Station Sample
                  </div>
                </div>

                {/* Options */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "22px" }}>
                  <div
                    onClick={handleToggleGoatMode}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "70px", cursor: goatState.artist ? "pointer" : "default" }}
                    title={goatState.artist ? "Switch between Goat and Un-Goat" : "Pick a Goat below first"}
                  >
                    <GoatBadge size={46} ungoat={isUngoat} />
                    <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.88)", fontFamily: kanit, whiteSpace: "nowrap" }}>
                      {isUngoat ? "Un-Goat mode" : "Goat mode"}
                    </div>
                  </div>
                  <RoundOption label="AA 100%">
                    <span style={{ fontSize: "27px", fontWeight: "700", color: "#fff", fontFamily: kanit, lineHeight: 1 }}>A</span>
                  </RoundOption>
                  <RoundOption label={hotInHereLocation || "No location"} ring={false}>
                    <PinIcon />
                  </RoundOption>
                  <RoundOption label="Locale">
                    <HeartIcon />
                  </RoundOption>
                </div>

                {/* Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "20px" }}>
                  <ArtistSearchInput
                    value={isNewStation ? newStationArtist : (panelStation?.seedArtist || "")}
                    onChange={setNewStationArtist}
                    onSelectArtist={setNewStationArtist}
                    placeholder="Artist"
                    disabled={!isNewStation}
                  />
                  <input
                    className="radio-panel-field"
                    style={panelFieldStyle(false)}
                    placeholder="Tags"
                    value={panelTags}
                    onChange={(e) => setPanelTags(e.target.value)}
                  />
                  <ArtistSearchInput
                    value={goatInput}
                    onChange={setGoatInput}
                    onSelectArtist={(name) => handleSetGoat(name, 'goat')}
                    placeholder={goatState.artist && !isUngoat ? `Goat: ${goatState.artist}` : "Goat"}
                  />
                  <ArtistSearchInput
                    value={ungoatInput}
                    onChange={setUngoatInput}
                    onSelectArtist={(name) => handleSetGoat(name, 'ungoat')}
                    placeholder={goatState.artist && isUngoat ? `UN-GOAT: ${goatState.artist}` : "UN-GOAT"}
                  />
                </div>

                {/* Save / delete */}
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", paddingTop: "14px" }}>
                  {deleteArmed && (
                    <div style={{ fontSize: "11px", color: colors.danger, fontFamily: kanit, marginRight: "auto" }}>
                      Tap the bin again to delete
                    </div>
                  )}
                  <RoundAction
                    title={isNewStation ? "Save station" : "Done"}
                    disabled={isNewStation && !canSaveNew}
                    onClick={() => (isNewStation ? handleCreateStation() : closePanel())}
                  >
                    <SaveIcon />
                  </RoundAction>
                  <RoundAction
                    title={isNewStation ? "Discard" : "Delete station"}
                    danger={deleteArmed}
                    disabled={!isNewStation && panelStation?.kind !== 'custom'}
                    onClick={() => {
                      if (isNewStation) { closePanel(); return; }
                      if (!deleteArmed) { setDeleteArmed(true); return; }
                      handleDeleteStation(panelStation.id);
                    }}
                  >
                    <TrashIcon color={deleteArmed ? colors.danger : colors.text} />
                  </RoundAction>
                </div>
              </div>
            </DarkOverlay>
          )}

        </div>
      </div>
    </>
  );
}
