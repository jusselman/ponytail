import { useState, useEffect, useRef } from "react";
import { getMe, getFollowing } from '../services/authService';
import { getFollowedPlaylists } from '../services/playlistService';
import { useUI } from '../context/UIContext';
import SettingsPanel from './SettingsPanel';
import PlaylistPanel from './PlaylistPanel';


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
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={colors.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={colors.muted} strokeWidth="1.8" />
    <circle cx="18" cy="16" r="3" stroke={colors.muted} strokeWidth="1.8" />
  </svg>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 80 }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = (name || "?").charCodeAt(0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 40}, 70%, 35%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: "700", color: "#fff",
      fontFamily: "'Kanit', sans-serif", flexShrink: 0,
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

// ─── Section header — plain title + optional subtitle, no action (rows below are either
// real data or explicitly-mocked placeholders, so there's nothing to trigger from here) ──
const SectionHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: "10px" }}>
    <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase" }}>
      {title}
    </div>
    {subtitle && (
      <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
        {subtitle}
      </div>
    )}
  </div>
);

// ─── Horizontal scroll row — shared by all four rows below ──
const ScrollRow = ({ items, renderItem, emptyMessage }) => {
  if (!items || items.length === 0) {
    return (
      <div style={{
        height: "110px", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: colors.bgCard, borderRadius: "12px", marginBottom: "24px",
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
      marginBottom: "24px",
      scrollbarWidth: "none",
    }}>
      {items.map((item, i) => renderItem(item, i))}
    </div>
  );
};

// ─── Playlist tile — square cover art (real or gradient fallback) + name + subtitle.
// Used for both the user's own playlists and the mocked "playlists you follow" row.
// `onTap`, if provided, makes the tile clickable (only the user's real playlists are
// wired up — the mocked follow rows stay inert since that functionality doesn't exist yet). ──
const PlaylistTile = ({ playlist, subtitle, size = 110, onTap }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      onClick={onTap ? () => onTap(playlist) : undefined}
      style={{ flexShrink: 0, width: size, cursor: onTap ? "pointer" : "default" }}
    >
      <div style={{
        width: size, height: size,
        borderRadius: "10px", overflow: "hidden",
        backgroundColor: colors.bgCard,
        marginBottom: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}>
        {playlist.coverUrl && !imgError ? (
          <img
            src={playlist.coverUrl}
            alt={playlist.name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, hsl(${playlist.hue}, 45%, 28%), hsl(${playlist.hue + 40}, 35%, 20%))`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MusicNoteIcon />
          </div>
        )}
      </div>
      <div style={{
        fontSize: "12px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        marginBottom: "2px",
      }}>
        {playlist.name}
      </div>
      <div style={{
        fontSize: "11px", color: colors.muted,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {subtitle}
      </div>
    </div>
  );
};

// ─── Person tile — circular avatar + name + optional secondary line.
// Used for both the "musicians you follow" and "people you follow" rows.
// `onTap`, if provided, opens that user's public profile panel. ──
const PersonTile = ({ name, subtitle, size = 72, onTap }) => (
  <div
    onClick={onTap}
    style={{ flexShrink: 0, width: size + 16, textAlign: "center", cursor: onTap ? "pointer" : "default" }}
  >
    <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center" }}>
      <Avatar name={name} size={size} />
    </div>
    <div style={{
      fontSize: "12px", fontWeight: "600", color: colors.text,
      fontFamily: "'Kanit', sans-serif",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      marginBottom: "2px",
    }}>
      {name}
    </div>
    {subtitle && (
      <div style={{
        fontSize: "10px", color: colors.muted,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {subtitle}
      </div>
    )}
  </div>
);

// ─── Derive a stable hue from any string (playlist id/title) for the gradient fallback ──
const hueFromString = (str) => {
  if (!str) return 200;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

// ─── Map a playlist row from the API into the shape PlaylistTile expects — same
// mapping MyMusicScreen.jsx uses, kept in sync with it ──
const mapPlaylist = (playlist) => ({
  id: playlist.id,
  name: playlist.title,
  tracks: playlist.track_count ?? 0,
  hue: hueFromString(playlist.id || playlist.title),
  coverUrl: playlist.cover_art_url || null,
});

// ─── Map a followed-playlist row (from GET /playlists/followed) into PlaylistTile's
// shape, keeping the creator's username around for the "by {creator}" subtitle ──
const mapFollowedPlaylist = (playlist) => ({
  id: playlist.id,
  name: playlist.title,
  creator: playlist.creator_username,
  tracks: playlist.track_count ?? 0,
  hue: hueFromString(playlist.id || playlist.title),
  coverUrl: playlist.cover_art_url || null,
});

// ─── Profile Panel ────────────────────────────────────────────────────────────
export default function ProfilePanel() {
  const {
    isProfileOpen, closeProfile, openSettings, profileImage, setProfileImage, user, setUser, openPublicPlaylist,
    myPlaylists, refreshMyPlaylists, addMyPlaylist, openUserProfile,
  } = useUI();
  // ── Playlists live in UIContext now, shared with MyMusicScreen.jsx, so a
  // playlist created or edited from either screen shows up in both instantly ──
  const playlists = myPlaylists.map(mapPlaylist);
  const [followedPlaylists, setFollowedPlaylists] = useState([]);
  const [followedMusicians, setFollowedMusicians] = useState([]);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [isPlaylistPanelOpen, setIsPlaylistPanelOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

 useEffect(() => {
  const loadUser = async () => {
    try {
      const me = await getMe();
      setUser(me);
      if (me?.profile_picture) {
        setProfileImage(me.profile_picture);
      }
    } catch (err) {
      console.log('Could not load user:', err);
    }
  };
  loadUser();
}, []);

  // ── Fetch the user's real playlists (shared UIContext state) so the stat and
  // the row above reflect actual data. Re-run after the playlist panel closes,
  // picking up any track/cover edits made while it was open — same pattern as
  // MyMusicScreen.jsx, which shares this same underlying state. ──
  useEffect(() => {
    refreshMyPlaylists();
  }, []);

  // ── Fetch playlists you follow — re-run whenever the panel opens so a follow/unfollow
  // toggled in PublicPlaylistPanel (mounted alongside this one) is reflected on return ──
  const fetchFollowedPlaylists = async () => {
    try {
      const data = await getFollowedPlaylists();
      setFollowedPlaylists((data || []).map(mapFollowedPlaylist));
    } catch (err) {
      console.log('Failed to fetch followed playlists:', err);
    }
  };

  useEffect(() => {
    if (isProfileOpen) fetchFollowedPlaylists();
  }, [isProfileOpen]);

  // ── Fetch musicians/people you follow — same re-fetch-on-open pattern as
  // followed playlists, so a follow/unfollow from a public profile is reflected here ──
  const fetchFollowing = async () => {
    try {
      const data = await getFollowing();
      setFollowedMusicians(data?.musicians || []);
      setFollowedUsers(data?.people || []);
    } catch (err) {
      console.log('Failed to fetch following list:', err);
    }
  };

  useEffect(() => {
    if (isProfileOpen) fetchFollowing();
  }, [isProfileOpen]);

  // ── Tapping one of the user's own playlists opens the same build-mode panel used in
  // My Music ──
  const handlePlaylistTap = (playlist) => {
    setSelectedPlaylist(playlist);
    setIsPlaylistPanelOpen(true);
  };

  // ── Tapping a followed playlist opens the read-only public viewer ──
  const handleFollowedPlaylistTap = (playlist) => {
    openPublicPlaylist(playlist.id);
  };

  const handleClosePlaylistPanel = () => {
    setIsPlaylistPanelOpen(false);
    setSelectedPlaylist(null);
    refreshMyPlaylists();
  };

const fileInputRef = useRef(null);

const handleImageChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Show preview immediately while uploading
  const previewUrl = URL.createObjectURL(file);
  setProfileImage(previewUrl);

  try {
    const token = await import('../services/authService').then(m => m.getToken());
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch('http://localhost:5000/api/auth/upload-avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (data.avatarUrl) {
      setProfileImage(data.avatarUrl); // replace preview with permanent URL
    }
  } catch (err) {
    console.log('Avatar upload error:', err);
  }
};

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
            <div
                style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
                onClick={() => fileInputRef.current?.click()}
                >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                />
                {profileImage ? (
                    <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden" }}>
                    <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                ) : (
                    <Avatar name={user?.username || "User"} size={80} />
                )}
                <div style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 28, height: 28, borderRadius: "50%",
                    backgroundColor: colors.bgCard,
                    border: `2px solid ${colors.bg}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
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
                <StatBlock value={user?.followers_count ?? 0} label="Followers" />
                <StatBlock value={user?.following_count ?? 0} label="Following" />
                <StatBlock value={playlists.length} label="Playlists" />
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

          {/* ── Your Playlists — real data, row layout, no add action (creating a
          playlist already lives in My Music) ── */}
          <SectionHeader title="Your Playlists" />
          <ScrollRow
            items={playlists}
            renderItem={(playlist) => (
              <PlaylistTile
                key={playlist.id}
                playlist={playlist}
                subtitle={`${playlist.tracks} track${playlist.tracks === 1 ? '' : 's'}`}
                onTap={handlePlaylistTap}
              />
            )}
            emptyMessage="Create a playlist in My Music to see it here"
          />

          {/* ── Playlists You Follow — real data, tap opens the read-only viewer ── */}
          <SectionHeader title="Playlists You Follow" />
          <ScrollRow
            items={followedPlaylists}
            renderItem={(playlist) => (
              <PlaylistTile
                key={playlist.id}
                playlist={playlist}
                subtitle={`by ${playlist.creator}`}
                onTap={handleFollowedPlaylistTap}
              />
            )}
            emptyMessage="Playlists you follow will appear here"
          />

          {/* ── Musicians You Follow — real data, tap opens their public profile ── */}
          <SectionHeader title="Musicians You Follow" />
          <ScrollRow
            items={followedMusicians}
            renderItem={(musician) => (
              <PersonTile
                key={musician.username}
                name={musician.name}
                subtitle={musician.genre}
                onTap={() => openUserProfile(musician.username)}
              />
            )}
            emptyMessage="Musicians you follow will appear here"
          />

          {/* ── People You Follow — real data, tap opens their public profile ── */}
          <SectionHeader title="People You Follow" />
          <ScrollRow
            items={followedUsers}
            renderItem={(person) => (
              <PersonTile
                key={person.username}
                name={person.name}
                onTap={() => openUserProfile(person.username)}
              />
            )}
            emptyMessage="People you follow will appear here"
          />

          <div style={{ height: "20px" }} />
        </div>

        {/* ── Settings panel renders inside profile ── */}
        <SettingsPanel />

        {/* ── Playlist build-mode panel — same component My Music opens ── */}
        <PlaylistPanel
          isOpen={isPlaylistPanelOpen}
          playlist={selectedPlaylist}
          onClose={handleClosePlaylistPanel}
          onCreated={addMyPlaylist}
        />

      </div>
    </>
  );
}
