import { useState, useEffect } from "react";
import { getMe } from '../services/authService';
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
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MY_STATIONS = [
  { id: "s1", name: "Late Night Jazz", genre: "Jazz", tracks: 142, hue: 40, lastPlayed: "2h ago" },
  { id: "s2", name: "Surf & Reverb", genre: "Surf Rock", tracks: 89, hue: 180, lastPlayed: "Yesterday" },
  { id: "s3", name: "Dream Sequences", genre: "Dream Pop", tracks: 204, hue: 280, lastPlayed: "3 days ago" },
  { id: "s4", name: "Post-Rock Odyssey", genre: "Post-Rock", tracks: 67, hue: 340, lastPlayed: "1 week ago" },
];

const HOT_IN_HERE = [
  { id: "h1", artist: "Margot Veil", track: "Slow Burn City", genre: "Indie Folk", distance: "0.4 mi", location: "Mission District, SF", listeners: 142, hue: 170 },
  { id: "h2", artist: "Dusk Relay", track: "Frequency Maps", genre: "Electronic", distance: "1.2 mi", location: "SoMa, SF", listeners: 89, hue: 220 },
  { id: "h3", artist: "The Pelican Stairs", track: "Low Tide", genre: "Surf Rock", distance: "3.7 mi", location: "Haight-Ashbury, SF", listeners: 204, hue: 30 },
  { id: "h4", artist: "Neon Parish", track: "Glass & Copper", genre: "Dream Pop", distance: "8.1 mi", location: "Oakland, CA", listeners: 317, hue: 280 },
  { id: "h5", artist: "Callow Kings", track: "Borrowed Hours", genre: "Post-Rock", distance: "14.5 mi", location: "Berkeley, CA", listeners: 61, hue: 340 },
  { id: "h6", artist: "Sable Junction", track: "The Quiet Algorithm", genre: "Jazz Fusion", distance: "22.3 mi", location: "San Jose, CA", listeners: 178, hue: 120 },
];

const COMING_SOON_STATIONS = [
  { label: "Pony Mode Radio", icon: "pony", description: "Stations built from your taste profile" },
  { label: "Goat Mode Radio", icon: "goat", description: "Hackable stations you control" },
  { label: "Genre Stations", icon: "genre", description: "Deep dives into any genre" },
  { label: "Artist Radio", icon: "artist", description: "Endless music from artists you love" },
];

const SUGGESTED_STATIONS = [
  { id: "sg1", name: "Jazz After Dark", genre: "Jazz", hue: 40, tracks: 98 },
  { id: "sg2", name: "Shoegaze Haze", genre: "Shoegaze", hue: 260, tracks: 74 },
  { id: "sg3", name: "Lo-fi Mornings", genre: "Lo-fi", hue: 160, tracks: 112 },
  { id: "sg4", name: "Post-Punk Revival", genre: "Post-Punk", hue: 320, tracks: 63 },
  { id: "sg5", name: "Neo Soul Sundays", genre: "Neo Soul", hue: 20, tracks: 88 },
];

const FRIENDS_STATIONS = [
  { id: "fr1", name: "andrew's jazz picks", genre: "Jazz Fusion", hue: 200, tracks: 54, friend: "andrew_g" },
  { id: "fr2", name: "late night electronica", genre: "Electronic", hue: 220, tracks: 131, friend: "margot_v" },
  { id: "fr3", name: "folk & feelings", genre: "Folk", hue: 80, tracks: 47, friend: "dusk_relay" },
  { id: "fr4", name: "sunday soul session", genre: "Soul", hue: 30, tracks: 93, friend: "neon_p" },
];

const RANDOM_STATIONS = [
  { id: "rn1", name: "Cumbia Nights", genre: "Cumbia", hue: 350, tracks: 67 },
  { id: "rn2", name: "Koto Dreams", genre: "Japanese Traditional", hue: 140, tracks: 41 },
  { id: "rn3", name: "Afrobeat Energy", genre: "Afrobeat", hue: 50, tracks: 88 },
  { id: "rn4", name: "Nordic Ambient", genre: "Ambient", hue: 190, tracks: 55 },
  { id: "rn5", name: "Balkan Brass", genre: "World Music", hue: 10, tracks: 33 },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const PinIcon = ({ color = colors.muted }) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={color} />
    <circle cx="12" cy="9" r="2.5" fill="#1a1a1a" />
  </svg>
);

const UsersIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
    <circle cx="9" cy="7" r="4" stroke={colors.muted} strokeWidth="2" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke={colors.teal} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M5 4l15 8-15 8V4z" fill={colors.teal} />
  </svg>
);

const StationIcon = ({ type }) => {
  const icons = {
    pony: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5l-2 8h10l-2-8c1-1 2-3 2-5 0-4-3-7-5-7z" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9c0 1.5 1.5 3 3 3s3-1.5 3-3" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    goat: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 3c-2 0-4 1.5-4 4 0 1.5.5 3 1.5 4L8 20h8l-1.5-9c1-1 1.5-2.5 1.5-4 0-2.5-2-4-4-4z" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 5c-.5-.5-2-1-3 0M15 5c.5-.5 2-1 3 0" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    genre: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.8" />
        <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.8" />
      </svg>
    ),
    artist: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={colors.teal} strokeWidth="1.8" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  };
  return icons[type] || null;
};

// ─── My Station Card ──────────────────────────────────────────────────────────
const StationCard = ({ station, index, onPlay, currentTrack, isPlaying }) => {
  const [hovered, setHovered] = useState(false);
  const isActive = currentTrack?.album === station.name;
  const showPause = isActive && isPlaying;

  return (
    <div
      onClick={() => onPlay(station)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "16px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${isActive ? colors.teal : colors.border}`,
        boxShadow: isActive ? `0 0 20px rgba(93,235,215,0.1)` : "none",
        display: "flex", alignItems: "center", gap: "14px",
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      {/* Station art */}
      <div style={{
        width: 56, height: 56, borderRadius: "12px", flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${station.hue}, 55%, 30%), hsl(${station.hue + 40}, 45%, 20%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="9" width="20" height="13" rx="2" stroke={colors.teal} strokeWidth="1.8" />
          <path d="M7 9L15 3" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="15" r="2" fill={colors.teal} />
          <path d="M6 15H7M17 15H18" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {(hovered || isActive) && (
          <div style={{
            position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {showPause ? (
              <div style={{ display: "flex", gap: "3px" }}>
                <div style={{ width: 3, height: 12, backgroundColor: colors.teal, borderRadius: 2 }} />
                <div style={{ width: 3, height: 12, backgroundColor: colors.teal, borderRadius: 2 }} />
              </div>
            ) : (
              <PlayIcon />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {station.name}
        </div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginBottom: "4px" }}>
          {station.genre}
        </div>
        <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
          {station.tracks} tracks · Last played {station.lastPlayed}
        </div>
      </div>

      {isActive && (
        <div style={{
          fontSize: "10px", fontWeight: "700", color: colors.teal,
          fontFamily: "'Kanit', sans-serif", backgroundColor: colors.tealGlow,
          padding: "3px 8px", borderRadius: "20px", border: `1px solid ${colors.teal}`,
          flexShrink: 0,
        }}>
          {isPlaying ? "PLAYING" : "PAUSED"}
        </div>
      )}
    </div>
  );
};

// ─── Hot Card ─────────────────────────────────────────────────────────────────
const HotCard = ({ item, index, onPlay, currentTrack, isPlaying }) => {
  const [hovered, setHovered] = useState(false);
  const isCurrentTrack = currentTrack &&
    `${currentTrack.title}|${currentTrack.artist}` === `${item.track}|${item.artist}`;
  const showPause = isCurrentTrack && isPlaying;

  return (
    <div
      onClick={() => onPlay(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? colors.bgCardHover : colors.bgCard,
        borderRadius: "16px", padding: "14px", marginBottom: "10px",
        border: `1px solid ${isCurrentTrack ? colors.teal : colors.border}`,
        boxShadow: isCurrentTrack ? `0 0 20px rgba(93,235,215,0.1)` : "none",
        display: "flex", alignItems: "center", gap: "12px",
        cursor: "pointer", transition: "all 0.2s ease",
        animation: `fadeSlideUp 0.4s ease ${index * 0.07}s forwards`, opacity: 0,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: "10px", flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${item.hue}, 55%, 30%), hsl(${item.hue + 40}, 45%, 20%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.8" />
          <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.8" />
        </svg>
        {(hovered || isCurrentTrack) && (
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {showPause ? (
              <div style={{ display: "flex", gap: "3px" }}>
                <div style={{ width: 3, height: 10, backgroundColor: colors.teal, borderRadius: 2 }} />
                <div style={{ width: 3, height: 10, backgroundColor: colors.teal, borderRadius: 2 }} />
              </div>
            ) : (
              <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: `10px solid ${colors.teal}`, marginLeft: 2 }} />
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "2px" }}>
          {item.track}
        </div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.artist}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <PinIcon />
            <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.location}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <UsersIcon />
            <span style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.listeners} listening</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: colors.gold, fontFamily: "'Kanit', sans-serif" }}>{item.distance}</div>
        <div style={{ fontSize: "10px", color: colors.teal, fontFamily: "'Kanit', sans-serif", backgroundColor: colors.tealGlow, padding: "2px 8px", borderRadius: "20px", border: `1px solid ${colors.teal}` }}>
          {item.genre}
        </div>
      </div>
    </div>
  );
};

// ─── Coming Soon Card ─────────────────────────────────────────────────────────
const ComingSoonCard = ({ item, index }) => (
  <div style={{
    backgroundColor: colors.bgCard, borderRadius: "14px", padding: "16px",
    border: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: "12px",
    animation: `fadeSlideUp 0.4s ease ${0.4 + index * 0.07}s forwards`, opacity: 0,
  }}>
    <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: colors.tealGlow, border: `1px solid rgba(93,235,215,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <StationIcon type={item.icon} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "13px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "2px" }}>{item.label}</div>
      <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>{item.description}</div>
    </div>
    <div style={{ fontSize: "10px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", backgroundColor: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: "20px", border: `1px solid rgba(255,255,255,0.1)`, flexShrink: 0 }}>
      Soon
    </div>
  </div>
);

// ─── My Stations Tab ──────────────────────────────────────────────────────────
const MyStationsTab = ({ onPlay, onAddStation, currentTrack, isPlaying }) => (
  <div style={{ padding: "20px 16px 0" }}>
    {/* Header row with + button */}
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: "16px",
      animation: "fadeSlideUp 0.4s ease 0s forwards", opacity: 0,
    }}>
      <div>
        <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px" }}>
          My Stations
        </div>
        <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
          {MY_STATIONS.length} stations
        </div>
      </div>
      <div
        onClick={onAddStation}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          cursor: "pointer", padding: "8px 14px",
          borderRadius: "20px", border: `1px solid ${colors.teal}`,
          backgroundColor: colors.tealGlow, transition: "opacity 0.2s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        <PlusIcon />
        <span style={{ fontSize: "12px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>
          Add Station
        </span>
      </div>
    </div>

    {/* Station list */}
    {MY_STATIONS.map((station, i) => (
      <StationCard
        key={station.id}
        station={station}
        index={i}
        onPlay={onPlay}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
      />
    ))}

    <div style={{ height: "20px" }} />
  </div>
);

// ─── Horizontal Station Card (compact) ───────────────────────────────────────
const HorizontalStationCard = ({ station, onPlay, currentTrack, isPlaying }) => {
  const [hovered, setHovered] = useState(false);
  const isActive = currentTrack?.album === station.name;
  const showPause = isActive && isPlaying;

  return (
    <div
      onClick={() => onPlay(station)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0, width: 120, cursor: "pointer",
        transition: "transform 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div style={{
        width: 120, height: 120, borderRadius: "12px", overflow: "hidden",
        background: `linear-gradient(135deg, hsl(${station.hue}, 55%, 30%), hsl(${station.hue + 40}, 45%, 20%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: "8px", position: "relative",
        border: `1px solid ${isActive ? colors.teal : "transparent"}`,
        boxShadow: isActive ? `0 0 16px rgba(93,235,215,0.2)` : "0 4px 12px rgba(0,0,0,0.3)",
        transition: "box-shadow 0.2s ease",
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="9" width="20" height="13" rx="2" stroke={colors.teal} strokeWidth="1.8" />
          <path d="M7 9L15 3" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="15" r="2" fill={colors.teal} />
        </svg>
        {(hovered || isActive) && (
          <div style={{
            position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {showPause ? (
              <div style={{ display: "flex", gap: "3px" }}>
                <div style={{ width: 3, height: 14, backgroundColor: colors.teal, borderRadius: 2 }} />
                <div style={{ width: 3, height: 14, backgroundColor: colors.teal, borderRadius: 2 }} />
              </div>
            ) : (
              <div style={{
                width: 0, height: 0,
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                borderLeft: `14px solid ${colors.teal}`,
                marginLeft: 3,
              }} />
            )}
          </div>
        )}
      </div>
      <div style={{ fontSize: "12px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "2px" }}>
        {station.name}
      </div>
      <div style={{ fontSize: "10px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
        {station.genre}
      </div>
      {station.friend && (
        <div style={{ fontSize: "10px", color: colors.teal, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
          {station.friend}
        </div>
      )}
    </div>
  );
};

// ─── Section Row ─────────────────────────────────────────────────────────────
const StationRow = ({ title, subtitle, stations, onPlay, currentTrack, isPlaying, index = 0 }) => (
  <div style={{ marginBottom: "28px", animation: `fadeSlideUp 0.4s ease ${index * 0.1}s forwards`, opacity: 0 }}>
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "15px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
          {subtitle}
        </div>
      )}
    </div>
    <div style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "4px" }}>
      {stations.map((station, i) => (
        <HorizontalStationCard
          key={station.id}
          station={station}
          onPlay={onPlay}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
        />
      ))}
    </div>
  </div>
);

// ─── Discover Tab ─────────────────────────────────────────────────────────────
const DiscoverTab = ({ onPlay, onPlayHot, currentTrack, isPlaying }) => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ padding: "16px 16px 0" }}>

      {/* ── Search bar ── */}
      <div style={{ position: "relative", marginBottom: "24px", animation: "fadeSlideUp 0.4s ease 0s forwards", opacity: 0 }}>
        <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke={focused ? colors.teal : "#666"} strokeWidth="2" />
            <path d="M16.5 16.5L21 21" stroke={focused ? colors.teal : "#666"} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <input
          style={{
            width: "100%", padding: "11px 40px 11px 40px",
            borderRadius: "12px", backgroundColor: colors.bgCard,
            border: `1.5px solid ${focused ? colors.teal : "transparent"}`,
            color: colors.text, fontSize: "14px", outline: "none",
            fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
            boxShadow: focused ? `0 0 0 3px rgba(93,235,215,0.1)` : "none",
            transition: "all 0.2s ease",
          }}
          placeholder="Search stations..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery("")}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Suggested For You ── */}
      <StationRow
        title="Suggested For You"
        subtitle="Based on your listening"
        stations={SUGGESTED_STATIONS}
        onPlay={onPlay}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        index={1}
      />

      {/* ── Friends Are Listening ── */}
      <StationRow
        title="Friends Are Listening"
        subtitle="Stations your friends follow"
        stations={FRIENDS_STATIONS}
        onPlay={onPlay}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        index={2}
      />

      {/* ── Explore Something New ── */}
      <StationRow
        title="Explore Something New"
        subtitle="Stations outside your usual taste"
        stations={RANDOM_STATIONS}
        onPlay={onPlay}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        index={3}
      />

      <div style={{ height: "20px" }} />
    </div>
  );
};

// ─── Radio Screen ─────────────────────────────────────────────────────────────
export default function RadioScreen({ setScreen }) {
  const [activeTab, setActiveTab] = useState("mystations");
  const [activeNav, setActiveNav] = useState("radio");
  const [user, setUser] = useState(null);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

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

  const handlePlayStation = (station) => {
    playTrack(
      { title: `${station.name} Radio`, artist: station.genre, album: station.name, genre: station.genre, coverUrl: null, audioUrl: "http://localhost:5000/audio/dummy.mp3" },
      [],
      0
    );
  };

  const handlePlayHot = (item) => {
    playTrack(
      { title: item.track, artist: item.artist, album: item.genre, genre: item.genre, coverUrl: null, audioUrl: "http://localhost:5000/audio/dummy.mp3" },
      HOT_IN_HERE.map(t => ({ title: t.track, artist: t.artist, album: t.genre, genre: t.genre, coverUrl: null, audioUrl: "http://localhost:5000/audio/dummy.mp3" })),
      HOT_IN_HERE.findIndex(t => t.id === item.id)
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

      <div style={{ minHeight: "100vh", width: "100%", backgroundColor: colors.bgDeep, display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "'Kanit', sans-serif" }}>
        <div style={{
          width: "375px", height: "750px", backgroundColor: colors.bg, borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          position: "relative", overflow: "hidden", marginTop: "40px", marginBottom: "40px",
          display: "flex", flexDirection: "column",
        }}>

          {/* ── Header ── */}
          <AppHeader />

          {/* ── Tabs ── */}
          <div style={{
            display: "flex", gap: "4px", padding: "0 20px",
            backgroundColor: colors.bg,
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}>
            {[
              { key: "mystations", label: "My Stations" },
              { key: "discover", label: "Discover" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: "12px 0", background: "none", border: "none", cursor: "pointer",
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

          {/* ── Tab content ── */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", width: "100%", boxSizing: "border-box", minHeight: 0 }}>
            {activeTab === "mystations" && (
              <MyStationsTab
                onPlay={handlePlayStation}
                onAddStation={() => setActiveTab("discover")}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
              />
            )}
            {activeTab === "discover" && (
            <DiscoverTab
              onPlay={handlePlayStation}
              onPlayHot={handlePlayHot}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
            />
          )}
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

        </div>
      </div>
    </>
  );
}