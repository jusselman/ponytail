import { useState, useEffect, useRef } from "react";
import {
  getMe, getHotInHere, getMyStation,
  getRadioStations, createRadioStation, deleteRadioStation,
  getStationTracks, saveStationSettings, searchTags,
  searchArtists, rateTrack, getTrackRatings, saveStationStyle,
} from '../services/authService';
import FooterNav from '../components/FooterNav';
import FullPlayer from '../components/FullPlayer';
import ProfilePanel from '../components/ProfilePanel';
import PublicPlaylistPanel from '../components/PublicPlaylistPanel';
import MessagesLayer from '../components/MessagesLayer';
import StationNameEditor from '../components/StationNameEditor';
import CityPickerSheet from '../components/CityPickerSheet';
import { setHomeCity } from '../services/placesService';
import {
  DEFAULT_STATION_STYLE, loadStationFonts, fontStack, fontWeightFor, fontScaleFor, neonSign,
} from '../constants/stationFonts';
import { usePlayer, usePlaybackProgress } from '../context/PlayerContext';

// ─── Radio — board-directed "neon tuner" look. The whole screen is the
// player: the playing track's cover blurred edge to edge behind a grey veil,
// the tuned station's name as a neon sign, a 0–100 μHz dial, the cover, and
// transport controls. The app header and mini player are intentionally not
// rendered here (the screen itself is the player); the footer nav stays so
// you can still leave. Station details live in the Station Panel, opened by
// tapping the station name, the goat badge, the gear, or "+". Tapping the
// name inside that panel opens the Edit Station Name sheet, where the sign's
// font and color (and, for the listener's own stations, its name) are set. ──

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
const signFont = "'Knewave', 'Permanent Marker', 'Kanit', sans-serif";   // frequency + mode (the station name uses the listener's chosen font)
const markerFont = "'Permanent Marker', 'Kanit', sans-serif";            // description, track title

// ─── Neon text. paint-order puts the dark outline behind the pale fill, and
// the text-shadow supplies the glow, so each one reads as a lit tube. The
// station name's neon is built from its chosen color by neonSign(). ──
const neon = {
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

// ─── Station Panel fields (Goat Mode) ──
const panelFieldStyle = (focused) => ({
  width: "100%", padding: "9px 12px",
  borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.08)",
  border: `1.5px solid ${focused ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.32)"}`,
  color: colors.text, fontSize: "14px", outline: "none",
  fontFamily: kanit, boxSizing: "border-box", transition: "border-color 0.15s ease",
});

const EMPTY_SETTINGS = { artist: null, tags: [], goat: null, ungoat: [] };

// One line for what a station plays, from its four fields
const describeSettings = (st) => {
  const parts = [];
  if (st?.artist) parts.push(`Sounds like ${st.artist}`);
  if (st?.tags?.length) parts.push(st.tags.join(', '));
  if (st?.goat) parts.push(`Goat: ${st.goat}`);
  return parts.join(' · ') || 'Nothing picked yet';
};

const findArtists = async (q) => (await searchArtists(q)).artists || [];
const findTags = async (q) => ((await searchTags(q)).tags || []).map(t => ({ ...t, meta: `${t.tracks} track${t.tracks === 1 ? '' : 's'}` }));

// A Station Panel field: type a few letters, pick from the menu that drops
// down. `multi` fields (Tags, Un-Goat) collect several picks as chips under
// the field; the others hold one pick, shown in the field with an ✕ to clear.
//   value     string | null, or string[] when multi
//   onChange  (next) => void, same shape as value
//   search    async (text) => [{ id, name, coverUrl?, meta? }]
const StationField = ({ label, search, value, onChange, multi = false, minChars = 2, disabled = false, danger = false, thumbs = true }) => {
  const picked = multi ? (value || []) : [];
  const single = multi ? "" : (value || "");
  const [text, setText] = useState(single);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);
  const requestRef = useRef(0);
  const inputRef = useRef(null);
  const singleRef = useRef(single);
  singleRef.current = single;

  // The field shows whatever is saved, whenever that changes
  useEffect(() => { if (!multi) setText(single); }, [single, multi]);

  const query = text.trim();
  const searching = focused && !disabled && query.length >= minChars && (multi || query !== single);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searching) {
      setResults([]);
      setSearched(false);
      return undefined;
    }
    const request = ++requestRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await search(query);
        if (request !== requestRef.current) return;
        setResults(found);
        setSearched(true);
      } catch (err) {
        console.log('Station field search failed:', err);
      }
    }, 220);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searching]);

  const has = (name) => picked.some(p => p.toLowerCase() === name.toLowerCase());
  const options = results.filter(r => !has(r.name));

  const pick = (name) => {
    setResults([]);
    setSearched(false);
    if (multi) {
      if (!has(name)) onChange([...picked, name]);
      setText("");
    } else {
      onChange(name);
      inputRef.current?.blur();
    }
  };

  return (
    <div style={{ opacity: disabled ? 0.42 : 1 }}>
      <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        className="radio-panel-field"
        style={{ ...panelFieldStyle(focused && !disabled), paddingRight: !multi && single ? "92px" : "12px" }}
        placeholder={label}
        value={text}
        readOnly={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && options.length > 0) pick(options[0].name); }}
        onFocus={() => setFocused(true)}
        // Leaving without picking puts the saved value back
        onBlur={() => setTimeout(() => { setFocused(false); if (!multi) setText(singleRef.current); }, 150)}
      />
      {!multi && single && !disabled && (
        <div style={{ position: "absolute", right: "6px", top: 0, bottom: 0, display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "9.5px", letterSpacing: "0.6px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontFamily: kanit }}>{label}</span>
          <div
            onMouseDown={(e) => { e.preventDefault(); onChange(null); }}
            title={`Clear ${label}`}
            style={{ width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: "15px", lineHeight: 1 }}
          >×</div>
        </div>
      )}
      {searching && (options.length > 0 || searched) && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 80,
          backgroundColor: "#1c1c1c", borderRadius: "8px", overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.25)", maxHeight: "150px", overflowY: "auto",
        }}>
          {options.length === 0 && (
            <div style={{ padding: "9px 12px", fontSize: "12.5px", color: "rgba(255,255,255,0.55)", fontFamily: kanit }}>No matches</div>
          )}
          {options.map((item) => (
            <div
              key={item.id}
              onMouseDown={(e) => { e.preventDefault(); pick(item.name); }}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", cursor: "pointer" }}
            >
              {thumbs && (
                <div style={{ width: 24, height: 24, borderRadius: "5px", overflow: "hidden", flexShrink: 0, backgroundColor: colors.bgCardHover }}>
                  {item.coverUrl && <img src={item.coverUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, fontSize: "13px", color: colors.text, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.name}
              </div>
              {item.meta && <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.5)", fontFamily: kanit, flexShrink: 0 }}>{item.meta}</div>}
            </div>
          ))}
        </div>
      )}
      </div>
      {multi && picked.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "6px" }}>
          {picked.map((name) => (
            <div
              key={name}
              style={{
                display: "flex", alignItems: "center", gap: "5px", maxWidth: "100%", padding: "3px 5px 3px 10px", borderRadius: "14px",
                backgroundColor: danger ? "rgba(255,90,90,0.16)" : "rgba(93,235,215,0.14)",
                border: `1px solid ${danger ? "rgba(255,120,120,0.55)" : "rgba(93,235,215,0.5)"}`,
              }}
            >
              <span style={{ fontSize: "11.5px", color: colors.text, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
              {!disabled && (
                <span
                  onClick={() => onChange(picked.filter(p => p !== name))}
                  title={`Remove ${name}`}
                  style={{ width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: "14px", lineHeight: 1, flexShrink: 0 }}
                >×</span>
              )}
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
  // true while the listener has no city of their own and the backend is
  // assuming San Francisco for them
  const [hotInHereIsDefault, setHotInHereIsDefault] = useState(false);
  const [hotInHereLoaded, setHotInHereLoaded] = useState(false);
  const [myStation, setMyStation] = useState(null);
  const [customStations, setCustomStations] = useState([]);
  // The built-in stations' Station Panel fields, by station id
  const [builtInSettings, setBuiltInSettings] = useState({});

  const [tunedId, setTunedId] = useState(null);
  const [tunedTracks, setTunedTracks] = useState([]);
  const [tunedLoading, setTunedLoading] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);
  // Station Panel: null (closed), { mode: 'new' } or { mode: 'edit', stationId }
  const [panel, setPanel] = useState(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  // Sign style (font + color) per station id, saved on the user — see
  // migration 012. A station with no entry uses DEFAULT_STATION_STYLE.
  const [stationStyles, setStationStyles] = useState({});
  // Set Your City sheet, opened from the Station Panel's location button
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  // Edit Station Name sheet: null (closed), 'new', or a station id
  const [nameEditorFor, setNameEditorFor] = useState(null);
  // The style picked for a station that hasn't been created yet
  const [newStationStyle, setNewStationStyle] = useState(DEFAULT_STATION_STYLE);

  // Station Panel fields. Name + seed artist create a station today; the
  // description and tags are placeholders until that part is built out.
  const [newStationName, setNewStationName] = useState("");
  const [panelDescription, setPanelDescription] = useState("");
  // The four fields of a station that hasn't been saved yet
  const [draftSettings, setDraftSettings] = useState(EMPTY_SETTINGS);
  const [panelError, setPanelError] = useState("");

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

  // ── Hot in Here's pool: artists within 10 miles of the listener's city (San
  // Francisco until they set one). Returns the tracks so a caller can use
  // them straight away instead of waiting for the state to update. ──
  const loadHotInHere = async () => {
    try {
      const data = await getHotInHere();
      const tracks = (data.tracks || []).map(t => ({ ...t, track: t.title }));
      setHotInHereLocation(data.location || null);
      setHotInHereIsDefault(!!data.isDefaultLocation);
      setHotInHere(tracks);
      return tracks;
    } catch (err) {
      console.log('Failed to fetch Hot in Here:', err);
      return null;
    } finally {
      setHotInHereLoaded(true);
    }
  };

  const hotInHereQueue = (tracks) => tracks.map(t => ({
    title: t.track, artist: t.artist, album: t.album || t.genre, genre: t.genre,
    coverUrl: t.coverUrl || null, audioUrl: t.audioUrl || "http://localhost:5000/audio/dummy.mp3",
  }));

  useEffect(() => {
    loadHotInHere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setBuiltInSettings(data.settings || {});
        setStationStyles(data.styles || {});
      } catch (err) {
        console.log('Failed to fetch radio stations:', err);
      }
    };
    fetchStations();
  }, []);

  // Thumbs the listener has already given, so they show lit on return.
  // Merged under anything tapped while this was loading.
  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const data = await getTrackRatings();
        const saved = {};
        (data.ratings || []).forEach(r => { saved[trackKey(r)] = r.rating; });
        setRatings(prev => ({ ...saved, ...prev }));
      } catch (err) {
        console.log('Failed to fetch ratings:', err);
      }
    };
    fetchRatings();
  }, []);

  // ── Every station on the dial — built-ins first, then the user's own ──
  // Your Station names itself unless the listener has renamed it, and it
  // can be taken off the dial. Hot in Here can't.
  const yourStationAutoName = 'Your Station';
  const autoNames = { 'your-station': yourStationAutoName };
  const isHidden = (id) => !!stationStyles[id]?.hidden;
  const hiddenStations = [
    ...(user?.is_artist && isHidden('your-station') ? [{ id: 'your-station', name: yourStationAutoName }] : []),
  ];

  const allStations = [
    {
      id: 'hot-in-here', kind: 'hot-in-here', name: 'Hot in Here',
      hue: HOT_IN_HERE_HUE, position: HOT_IN_HERE_POSITION,
      subtitle: HOT_IN_HERE_BLURB,
    },
    ...(user?.is_artist && !isHidden('your-station') ? [{
      id: 'your-station', kind: 'your-station', name: stationStyles['your-station']?.name || yourStationAutoName,
      hue: YOUR_STATION_HUE, position: YOUR_STATION_POSITION,
      subtitle: 'Your uploads + similar artists',
    }] : []),
    ...customStations.map(s => ({
      ...s, kind: 'custom', subtitle: describeSettings(s.settings),
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
      setTunedTracks(hotInHereQueue(hotInHere));
      return;
    }
    if (station.kind === 'your-station') {
      setTunedTracks(myStation ? [...myStation.ownTracks, ...myStation.matchedTracks] : []);
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
    const previous = ratings[key];
    // Tapping the thumb that is already lit takes the rating back
    const next = previous === value ? 0 : value;
    const rated = currentTrack;
    setRatings(prev => ({ ...prev, [key]: next || null }));
    // A thumbs down moves straight on to the next track
    if (next === -1) nextTrack();
    try {
      await rateTrack(rated, next);
    } catch (err) {
      // Not saved: put the thumb back rather than show a rating that will vanish
      console.log('Failed to rate track:', err);
      setRatings(prev => ({ ...prev, [key]: previous }));
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
    setPanelDescription("");
    setDraftSettings(EMPTY_SETTINGS);
    setPanelError("");
    setNewStationStyle(DEFAULT_STATION_STYLE);
    setNameEditorFor(null);
  };
  const closePanel = () => { setPanel(null); setDeleteArmed(false); setNameEditorFor(null); setCityPickerOpen(false); };

  // ── Save the listener's city to their account (it persists across sessions
  // and devices), then reload Hot in Here for the new spot. If the dial is on
  // Hot in Here, its queue is swapped right away. Errors are thrown back to
  // the sheet so it can say the save failed. ──
  const handlePickCity = async (city) => {
    await setHomeCity(city.id);
    const tracks = await loadHotInHere();
    if (tracks && tunedId === 'hot-in-here') setTunedTracks(hotInHereQueue(tracks));
    setCityPickerOpen(false);
  };

  const styleFor = (stationId) => (stationStyles[stationId]?.font ? stationStyles[stationId] : DEFAULT_STATION_STYLE);

  // ── Fonts are fetched only when a sign actually uses them ──
  useEffect(() => {
    loadStationFonts([DEFAULT_STATION_STYLE.font, newStationStyle.font, ...Object.values(stationStyles).map(st => st?.font)]);
  }, [stationStyles, newStationStyle]);

  // ── Save from the Edit Station Name sheet. A station being created just
  // remembers the name + style until it's saved; an existing station is
  // updated straight away. Hot in Here only ever takes the style. Your
  // Station and GOAT keep naming themselves until given a name of their own. ──
  const handleSaveName = async ({ name, font, color }) => {
    if (nameEditorFor === 'new') {
      setNewStationName(name);
      setNewStationStyle({ font, color });
      setNameEditorFor(null);
      return;
    }
    try {
      // Leaving a built-in's automatic name untouched isn't a rename
      const sentName = autoNames[nameEditorFor] === name ? '' : name;
      const data = await saveStationStyle(nameEditorFor, { font, color, name: sentName });
      setStationStyles(data.styles || {});
      if (data.station) {
        setCustomStations(prev => prev.map(st => (st.id === data.station.id ? { ...st, ...data.station } : st)));
      }
      setNameEditorFor(null);
    } catch (err) {
      console.log('Failed to save station style:', err);
    }
  };

  const handleCreateStation = async () => {
    if (!canSaveNew) return;
    try {
      const data = await createRadioStation(newStationName.trim(), draftSettings);
      setCustomStations(prev => [...prev, data.station]);
      // Carry over the sign style picked before the station existed
      try {
        const styled = await saveStationStyle(data.station.id, newStationStyle);
        setStationStyles(styled.styles || {});
      } catch (err) {
        console.log('Failed to save the new station style:', err);
      }
      closePanel();
      handleTune({ ...data.station, kind: 'custom' });
    } catch (err) {
      console.log('Failed to create station:', err);
    }
  };

  const handleDeleteStation = async (id) => {
    try {
      const data = await deleteRadioStation(id);
      setCustomStations(prev => prev.filter(s => s.id !== id));
      if (data.styles) {
        // Your Station: taken off the dial
        setStationStyles(data.styles);
      } else {
        setStationStyles(prev => { const next = { ...prev }; delete next[id]; return next; });
      }
      closePanel();
      if (tunedId === id) handleTune({ id: 'hot-in-here', kind: 'hot-in-here' });
    } catch (err) {
      console.log('Failed to delete station:', err);
    }
  };

  // Put a removed Your Station back on the dial
  const handleRestoreStation = async (id) => {
    try {
      const data = await saveStationStyle(id, DEFAULT_STATION_STYLE);
      setStationStyles(data.styles || {});
    } catch (err) {
      console.log('Failed to restore station:', err);
    }
  };

  // ── Station Panel fields. A station being created just collects them; an
  // existing station saves each change as it's made and, if the dial is on
  // it, rebuilds its queue so the change can be heard straight away. ──
  const settingsOf = (station) => {
    if (!station) return EMPTY_SETTINGS;
    const saved = station.kind === 'custom' ? station.settings : builtInSettings[station.id];
    return { ...EMPTY_SETTINGS, ...(saved || {}) };
  };

  const handleSettingsChange = async (patch) => {
    setPanelError("");
    if (panel?.mode === 'new') {
      setDraftSettings(prev => ({ ...prev, ...patch }));
      return;
    }
    const station = allStations.find(s => s.id === panel?.stationId);
    if (!station) return;
    try {
      const data = await saveStationSettings(station.id, { ...settingsOf(station), ...patch });
      if (station.kind === 'custom') {
        setCustomStations(prev => prev.map(st => (st.id === data.station.id ? { ...st, ...data.station } : st)));
        if (tunedId === station.id) handleTune({ ...data.station, kind: 'custom' });
      } else {
        setBuiltInSettings(data.builtIn || {});
        if (station.kind === 'hot-in-here') {
          const tracks = await loadHotInHere();
          if (tracks && tunedId === 'hot-in-here') setTunedTracks(hotInHereQueue(tracks));
        } else if (station.kind === 'your-station') {
          const mine = await getMyStation();
          setMyStation(mine);
          if (tunedId === 'your-station') setTunedTracks([...mine.ownTracks, ...mine.matchedTracks]);
        }
      }
    } catch (err) {
      console.log('Failed to save station settings:', err);
      setPanelError(err?.response?.data?.error || "Couldn't save that change.");
    }
  };

  const ratingKey = currentTrack ? trackKey(currentTrack) : null;
  const currentRating = isTunedActive && ratingKey ? ratings[ratingKey] : null;

  // ── Sign text: the station name, sized to fit two lines ──
  const signText = tunedStation
    ? (tunedStation.kind === 'hot-in-here' ? 'Hot in Here!!!' : tunedStation.name)
    : 'Ponytail Radio';
  const signStyle = tunedStation ? styleFor(tunedStation.id) : DEFAULT_STATION_STYLE;
  const signSize = Math.round((signText.length <= 14 ? 50 : signText.length <= 22 ? 38 : 29) * fontScaleFor(signStyle.font));
  const frequency = tunedStation ? tunedStation.position.toFixed(1) : "0.0";

  const emptyMessage = !tunedStation
    ? "Drag the dial to tune in"
    : tunedLoading
      ? "Tuning in..."
      : tunedStation.kind === 'hot-in-here'
        ? (hotInHereLocation ? `No artists within 10 miles of ${hotInHereLocation} yet` : "Couldn't load artists near you")
        : "Nothing on this frequency yet";

  const panelStation = panel?.mode === 'edit' ? (allStations.find(s => s.id === panel.stationId) || null) : null;
  const isNewStation = panel?.mode === 'new';
  const canSaveNew = !!newStationName.trim() && !!(draftSettings.artist || draftSettings.goat || draftSettings.tags.length);
  const panelSettings = isNewStation ? draftSettings : settingsOf(panelStation);
  // Hot in Here plays whoever is local, so Un-Goat is the one field it takes
  const soundFieldsLocked = panelStation?.kind === 'hot-in-here';
  const panelSignStyle = isNewStation ? newStationStyle : styleFor(panelStation?.id);
  const panelSignText = panelStation?.kind === 'hot-in-here' ? 'Hot in Here!!!' : (panelStation?.name || '');
  // What the Edit Station Name sheet is working on
  const editorStation = nameEditorFor && nameEditorFor !== 'new' ? (allStations.find(st => st.id === nameEditorFor) || null) : null;
  const editorNameLocked = editorStation?.kind === 'hot-in-here';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Knewave&family=Permanent+Marker&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Kanit', sans-serif; }
        body { background: #222222; }
        @keyframes radioFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes radioBreathe { from { transform: scale(1); } to { transform: scale(1.14); } }
        .radio-backdrop-img { animation: radioBreathe 22s ease-in-out infinite alternate; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .radio-backdrop-img { animation: none; } }
        @keyframes stationSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        ::-webkit-scrollbar { display: none; }
        .radio-panel-field::placeholder { color: rgba(255,255,255,0.5); }
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
          <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", borderRadius: "40px 40px 0 0", display: "flex", flexDirection: "column" }}>

            {/* Backdrop: the cover, blurred edge to edge, under a grey veil.
                It carries its own rounded clip: a blurred, animated layer can
                otherwise paint past the phone frame's rounded corners. */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "40px 40px 0 0", clipPath: "inset(0 round 40px 40px 0 0)", isolation: "isolate", transform: "translateZ(0)", background: "linear-gradient(160deg, #5a5a66, #3a3a40)" }}>
              {displayTrack?.coverUrl && (
                <img
                  src={displayTrack.coverUrl}
                  alt=""
                  draggable={false}
                  className="radio-backdrop-img"
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
                ...neonSign(signStyle.color, 7), fontFamily: fontStack(signStyle.font), fontWeight: fontWeightFor(signStyle.font),
                fontSize: `${signSize}px`, lineHeight: 1.02,
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
                <GoatBadge size={36} />
              </div>
              <div style={{ ...neon.blue, WebkitTextStroke: "5px #1616c4", fontFamily: signFont, fontSize: "17px", lineHeight: 1 }}>
                Goat Mode
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
                <div style={{ ...neonSign(signStyle.color, 5), fontFamily: fontStack(signStyle.font), fontWeight: fontWeightFor(signStyle.font), fontSize: `${Math.round(26 * fontScaleFor(signStyle.font))}px`, textAlign: "center", transform: "rotate(-2deg)", overflowWrap: "anywhere" }}>
                  {tunedStation ? tunedStation.name : "Ponytail Radio"}
                </div>
                <div style={{ marginTop: "18px", fontSize: "12.5px", color: "rgba(255,255,255,0.86)", fontFamily: kanit, lineHeight: 1.6, textAlign: "center" }}>
                  {!tunedStation && <>Drag the dial or pick a station below.</>}
                  {tunedStation?.kind === 'hot-in-here' && (
                    hotInHereLocation
                      ? <>Artists from within 10 miles of <strong style={{ color: colors.text }}>{hotInHereLocation}</strong>, Ponytail musicians first. It always sits at the very start of the dial.{hotInHereIsDefault && <> You haven't set a city yet, so it's tuned to San Francisco for now. Tap the location button in the station panel to set yours.</>}</>
                      : <>Couldn't load the artists near you. Check that the backend is running.</>
                  )}
                  {tunedStation?.kind === 'your-station' && (
                    <>Built from your own uploads, plus catalog tracks matched to your genre, subgenre, mood, or similar-artist tags. The station panel fields add to it.</>
                  )}
                  {tunedStation?.kind === 'custom' && (
                    <>
                      {tunedStation.settings?.artist && <>Plays music that sounds like <strong style={{ color: colors.text }}>{tunedStation.settings.artist}</strong>. </>}
                      {tunedStation.settings?.tags?.length > 0 && <>Tagged <strong style={{ color: colors.text }}>{tunedStation.settings.tags.join(', ')}</strong>. </>}
                      {tunedStation.settings?.goat && <><strong style={{ color: colors.text }}>{tunedStation.settings.goat}</strong> is the Goat here and comes round about every third track. </>}
                      {tunedStation.settings?.ungoat?.length > 0 && <>Never plays {tunedStation.settings.ungoat.join(', ')}.</>}
                    </>
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
                  {hiddenStations.map((s) => (
                    <div
                      key={`restore-${s.id}`}
                      onClick={() => handleRestoreStation(s.id)}
                      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", border: "1.5px dashed rgba(255,255,255,0.22)", marginTop: "4px" }}
                    >
                      <div style={{ flex: 1, fontSize: "12.5px", color: "rgba(255,255,255,0.7)", fontFamily: kanit }}>{s.name} was removed</div>
                      <div style={{ fontSize: "11.5px", fontWeight: "500", color: colors.teal, fontFamily: kanit, flexShrink: 0 }}>Bring back</div>
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

                {/* Name — tap to open the Edit Station Name sheet */}
                <div
                  onClick={() => setNameEditorFor(isNewStation ? 'new' : panelStation?.id)}
                  title="Edit name and style"
                  style={{ padding: "0 26px", textAlign: "center", cursor: "pointer" }}
                >
                  <div style={{
                    ...neonSign(panelSignStyle.color, 5), fontFamily: fontStack(panelSignStyle.font), fontWeight: fontWeightFor(panelSignStyle.font),
                    fontSize: `${Math.round(25 * fontScaleFor(panelSignStyle.font))}px`, lineHeight: 1.1,
                    transform: "rotate(-2deg)", padding: "8px 0", overflowWrap: "anywhere", textTransform: "uppercase",
                  }}>
                    {isNewStation ? (newStationName.trim() || "New Station*") : panelSignText}
                  </div>
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "70px" }}>
                    <GoatBadge size={46} />
                    <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.88)", fontFamily: kanit, whiteSpace: "nowrap" }}>
                      Goat mode
                    </div>
                  </div>
                  <RoundOption label="AA 100%">
                    <span style={{ fontSize: "27px", fontWeight: "700", color: "#fff", fontFamily: kanit, lineHeight: 1 }}>A</span>
                  </RoundOption>
                  <RoundOption label={hotInHereLocation || "No location"} ring={false} onClick={() => setCityPickerOpen(true)}>
                    <PinIcon color={hotInHereIsDefault || !hotInHereLocation ? colors.text : "#f5cf00"} />
                  </RoundOption>
                  <RoundOption label="Locale">
                    <HeartIcon />
                  </RoundOption>
                </div>

                {/* Fields — Goat Mode */}
                <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "20px" }}>
                  <StationField
                    label="Artist"
                    search={findArtists}
                    value={panelSettings.artist}
                    onChange={(artist) => handleSettingsChange({ artist })}
                    disabled={soundFieldsLocked}
                  />
                  <StationField
                    label="Tags"
                    multi
                    minChars={1}
                    thumbs={false}
                    search={findTags}
                    value={panelSettings.tags}
                    onChange={(tags) => handleSettingsChange({ tags })}
                    disabled={soundFieldsLocked}
                  />
                  <StationField
                    label="Goat"
                    search={findArtists}
                    value={panelSettings.goat}
                    onChange={(goat) => handleSettingsChange({ goat })}
                    disabled={soundFieldsLocked}
                  />
                  <StationField
                    label="UN-GOAT"
                    multi
                    danger
                    search={findArtists}
                    value={panelSettings.ungoat}
                    onChange={(ungoat) => handleSettingsChange({ ungoat })}
                  />
                  {(panelError || soundFieldsLocked) && (
                    <div style={{ fontSize: "11px", color: panelError ? colors.danger : "rgba(255,255,255,0.55)", fontFamily: kanit, lineHeight: 1.4 }}>
                      {panelError || "Hot in Here plays whoever is local, so Un-Goat is the only field it takes."}
                    </div>
                  )}
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
                    disabled={!isNewStation && (!panelStation || panelStation.kind === 'hot-in-here')}
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

          {/* ── Set Your City (the Station Panel's location button) ── */}
          {cityPickerOpen && (
            <CityPickerSheet
              currentCity={hotInHereLocation}
              isDefault={hotInHereIsDefault}
              onPick={handlePickCity}
              onCancel={() => setCityPickerOpen(false)}
            />
          )}

          {/* ── Edit Station Name (font, color and — for your own stations — the name) ── */}
          {nameEditorFor && (nameEditorFor === 'new' || editorStation) && (
            <StationNameEditor
              key={nameEditorFor}
              stationName={nameEditorFor === 'new'
                ? newStationName
                : (editorStation.kind === 'hot-in-here' ? 'Hot in Here!!!' : editorStation.name)}
              nameLocked={editorNameLocked}
              lockedHint="Hot in Here always keeps its name and its spot at 0 on the dial. Its look is yours to change."
              initialStyle={nameEditorFor === 'new' ? newStationStyle : styleFor(nameEditorFor)}
              onSave={handleSaveName}
              onCancel={() => setNameEditorFor(null)}
            />
          )}

        </div>
      </div>
    </>
  );
}
