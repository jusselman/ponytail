import { useState, useEffect } from "react";
import { getMe } from '../services/authService';
import { useUI } from '../context/UIContext';
import SettingsPanel from './SettingsPanel';

const colors = {
  bg: "#222222",
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

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronDown = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GearIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke={colors.muted} strokeWidth="1.8" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={colors.muted} strokeWidth="1.8" />
  </svg>
);

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="4" stroke={colors.teal} strokeWidth="1.8" />
  </svg>
);

const MusicNoteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={colors.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={colors.muted} strokeWidth="1.8" />
    <circle cx="18" cy="16" r="3" stroke={colors.muted} strokeWidth="1.8" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke={colors.teal} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 80 }) => {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = name.charCodeAt(0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 40}, 70%, 35%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: "700", color: "#fff",
      fontFamily: "'Kanit', sans-serif",
    }}>
      {initials}
    </div>
  );
};

// ─── Stat Block ───────────────────────────────────────────────────────────────
const StatBlock = ({ value, label }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>
      {value}
    </div>
    <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
      {label}
    </div>
  </div>
);

// ─── Playlist Card ────────────────────────────────────────────────────────────
const PlaylistCard = ({ playlist, index }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "10px 0",
        borderBottom: `1px solid ${colors.border}`,
        cursor: "pointer", transition: "opacity 0.2s ease",
        opacity: hovered ? 0.75 : 1,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: "8px", flexShrink: 0,
        background: `linear-gradient(135deg, hsl(${playlist.hue}, 45%, 28%), hsl(${playlist.hue + 40}, 35%, 20%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <MusicNoteIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {playlist.name}
        </div>
        <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
          {playlist.tracks} tracks · {playlist.updated}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M9 18l6-6-6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

// ─── Mock playlists ───────────────────────────────────────────────────────────
const MOCK_PLAYLISTS = [
  { id: "pl1", name: "Late Night Drives", tracks: 24, updated: "2 days ago", hue: 220 },
  { id: "pl2", name: "Morning Jazz", tracks: 18, updated: "1 week ago", hue: 40 },
  { id: "pl3", name: "Focus Mode", tracks: 31, updated: "3 days ago", hue: 160 },
  { id: "pl4", name: "Weekend Vibes", tracks: 12, updated: "2 weeks ago", hue: 300 },
];

// ─── Profile Panel ────────────────────────────────────────────────────────────
export default function ProfilePanel() {
  const { isProfileOpen, closeProfile, openSettings } = useUI();
  const [user, setUser] = useState(null);

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

  return (
    <>
      {/* Backdrop */}
      {isProfileOpen && (
        <div
          onClick={closeProfile}
          style={{ position: "absolute", inset: 0, zIndex: 1099, backgroundColor: "rgba(0,0,0,0.6)" }}
        />
      )}

      {/* Profile panel */}
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 1100,
        backgroundColor: colors.bg,
        transform: isProfileOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: isProfileOpen ? "all" : "none",
      }}>

        {/* ── Header bar ── */}
        <div style={{
          padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}>
          <button onClick={closeProfile} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
            <ChevronDown />
          </button>
          <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.3px" }}>
            Profile
          </div>
          <button onClick={openSettings} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
            <GearIcon />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 0" }}>

          {/* ── Profile picture + info ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>

            {/* Avatar with camera overlay */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar name={user?.username || "User"} size={80} />
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: "50%",
                backgroundColor: colors.bg,
                border: `2px solid ${colors.bg}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                backgroundColor: colors.bgCard,
              }}>
                <CameraIcon />
              </div>
            </div>

            {/* Name + stats */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: "22px", fontWeight: "700", color: colors.text,
                fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                marginBottom: "12px",
              }}>
                {user?.username || ""}
              </div>
              <div style={{ display: "flex", gap: "20px" }}>
                <StatBlock value="0" label="Followers" />
                <StatBlock value="0" label="Following" />
                <StatBlock value={MOCK_PLAYLISTS.length} label="Playlists" />
              </div>
            </div>
          </div>

          {/* ── Genre taste pills ── */}
          {user?.favorite_artists && user.favorite_artists.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px" }}>
                Taste
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {user.favorite_artists.map((artist, i) => (
                  <div key={i} style={{
                    fontSize: "12px", fontWeight: "600", color: colors.teal,
                    backgroundColor: colors.tealGlow, border: `1px solid ${colors.teal}`,
                    borderRadius: "20px", padding: "4px 12px",
                    fontFamily: "'Kanit', sans-serif",
                  }}>
                    {artist.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Playlists ── */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase" }}>
                Playlists
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: "4px",
                cursor: "pointer", padding: "4px 8px",
                borderRadius: "20px", border: `1px solid ${colors.teal}`,
                backgroundColor: colors.tealGlow,
              }}>
                <PlusIcon />
                <span style={{ fontSize: "11px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>New</span>
              </div>
            </div>

            {MOCK_PLAYLISTS.map((playlist, i) => (
              <PlaylistCard key={playlist.id} playlist={playlist} index={i} />
            ))}

            <div style={{
              textAlign: "center", padding: "16px 0",
              fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
              fontStyle: "italic",
            }}>
              Playlist functionality coming soon
            </div>
          </div>

          <div style={{ height: "20px" }} />
        </div>

        {/* ── Settings panel renders inside profile ── */}
        <SettingsPanel />

      </div>
    </>
  );
}