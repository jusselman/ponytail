import { useState, useEffect } from "react";
import { getPublicProfile, followUser, unfollowUser } from '../services/authService';
import { useUI } from '../context/UIContext';

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

const MusicNoteIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={colors.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={colors.muted} strokeWidth="1.8" />
    <circle cx="18" cy="16" r="3" stroke={colors.muted} strokeWidth="1.8" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke={colors.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

// ─── Follow button — controlled by the parent, which owns the real follow
// state and persists it to the backend ──
const FollowButton = ({ following, pending, onToggle }) => (
  <button
    onClick={onToggle}
    disabled={pending}
    style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "7px 16px", borderRadius: "20px",
      border: `1.5px solid ${colors.teal}`,
      backgroundColor: following ? "transparent" : colors.tealGlow,
      cursor: pending ? "default" : "pointer",
      opacity: pending ? 0.6 : 1,
      marginTop: "10px",
    }}
  >
    {following && <CheckIcon />}
    <span style={{ fontSize: "12px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>
      {following ? "Following" : "Follow"}
    </span>
  </button>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <div style={{ marginBottom: "10px" }}>
    <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase" }}>
      {title}
    </div>
  </div>
);

// ─── Horizontal scroll row ──
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
// Not tappable here — playlist detail viewing for other users' playlists isn't built yet. ──
const PlaylistTile = ({ playlist, subtitle, size = 110 }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div style={{ flexShrink: 0, width: size }}>
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

// ─── Person tile — circular avatar + name + optional secondary line ──
const PersonTile = ({ name, subtitle, size = 72 }) => (
  <div style={{ flexShrink: 0, width: size + 16, textAlign: "center" }}>
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

// ─── Map a playlist row from the public profile endpoint into PlaylistTile's shape ──
const mapPlaylist = (playlist) => ({
  id: playlist.id,
  name: playlist.title,
  tracks: playlist.track_count ?? 0,
  hue: hueFromString(playlist.id || playlist.title),
  coverUrl: playlist.cover_art_url || null,
});

// ─── Mock data — same placeholders ProfilePanel uses, since following isn't built yet.
// Shown here too so the layout mirrors "like the Profile screen" as asked. ──
const MOCK_FOLLOWED_PLAYLISTS = [
  { id: "fpl1", name: "Sunday Coffee", creator: "mara_j", tracks: 19, hue: 190 },
  { id: "fpl2", name: "Gym Pump", creator: "dtrain", tracks: 27, hue: 10 },
  { id: "fpl3", name: "Rainy Day Jazz", creator: "coltraner", tracks: 14, hue: 260 },
  { id: "fpl4", name: "Road Trip 2025", creator: "wanderlust", tracks: 42, hue: 90 },
];

const MOCK_FOLLOWED_ARTISTS = [
  { id: "art1", name: "Nova Reyes", genre: "Indie Pop" },
  { id: "art2", name: "The Low Keys", genre: "Jazz" },
  { id: "art3", name: "Marcus Lane", genre: "R&B" },
  { id: "art4", name: "Echo Bloom", genre: "Electronic" },
];

const MOCK_FOLLOWED_USERS = [
  { id: "usr1", name: "Priya S" },
  { id: "usr2", name: "Jordan K" },
  { id: "usr3", name: "Aiko T" },
  { id: "usr4", name: "Devon M" },
];

// ─── User Profile Panel — read-only view of someone else's profile.
// Unlike ProfilePanel.jsx: no photo upload, no add-playlist affordance, section
// labels are possessive ("Andrew's Playlists"), and there's a Follow button. ──
export default function UserProfilePanel() {
  const { isUserProfileOpen, viewedUsername, closeUserProfile } = useUI();
  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isUserProfileOpen || !viewedUsername) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await getPublicProfile(viewedUsername);
        setProfile(data.user);
        setPlaylists((data.playlists || []).map(mapPlaylist));
      } catch (err) {
        console.log('Failed to fetch public profile:', err);
        setProfile(null);
        setPlaylists([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isUserProfileOpen, viewedUsername]);

  const [pendingFollow, setPendingFollow] = useState(false);

  // ── Toggle follow/unfollow — optimistic update (flips is_following and
  // adjusts the followers count immediately), reverted if the request fails ──
  const handleToggleFollow = async () => {
    if (!profile || pendingFollow) return;
    const wasFollowing = profile.is_following;

    setPendingFollow(true);
    setProfile(prev => ({
      ...prev,
      is_following: !wasFollowing,
      followers_count: prev.followers_count + (wasFollowing ? -1 : 1),
    }));

    try {
      if (wasFollowing) {
        await unfollowUser(viewedUsername);
      } else {
        await followUser(viewedUsername);
      }
    } catch (err) {
      console.log('Failed to toggle follow:', err);
      // Revert on failure
      setProfile(prev => ({
        ...prev,
        is_following: wasFollowing,
        followers_count: prev.followers_count + (wasFollowing ? 1 : -1),
      }));
    } finally {
      setPendingFollow(false);
    }
  };

  const displayName = profile?.display_name || profile?.username || "";
  const possessive = displayName ? `${displayName}'s` : "Their";

  return (
    <>
      {/* Backdrop */}
      {isUserProfileOpen && (
        <div
          onClick={closeUserProfile}
          style={{ position: "absolute", inset: 0, zIndex: 1099, backgroundColor: "rgba(0,0,0,0.6)" }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 1100,
        backgroundColor: colors.bg,
        transform: isUserProfileOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: isUserProfileOpen ? "all" : "none",
      }}>

        {/* ── Header bar — no settings gear, this isn't your profile ── */}
        <div style={{
          padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}>
          <button onClick={closeUserProfile} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
            <ChevronDown />
          </button>
          <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.3px" }}>
            {displayName || "Profile"}
          </div>
          <div style={{ width: "28px" }} />
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 0" }}>

          {loading ? (
            <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", padding: "40px 0" }}>
              Loading...
            </div>
          ) : !profile ? (
            <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", padding: "40px 0" }}>
              User not found.
            </div>
          ) : (
            <>
              {/* ── Profile picture + info — no camera overlay, this isn't editable ── */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
                {profile.profile_picture ? (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                    <img src={profile.profile_picture} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ) : (
                  <Avatar name={displayName || "User"} size={80} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "22px", fontWeight: "700", color: colors.text,
                    fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    marginBottom: "4px",
                  }}>
                    {displayName}
                  </div>
                  <FollowButton
                    following={profile.is_following}
                    pending={pendingFollow}
                    onToggle={handleToggleFollow}
                  />
                  <div style={{ display: "flex", gap: "20px", marginTop: "14px" }}>
                    <StatBlock value={profile.followers_count ?? 0} label="Followers" />
                    <StatBlock value={profile.following_count ?? 0} label="Following" />
                    <StatBlock value={playlists.length} label="Playlists" />
                  </div>
                </div>
              </div>

              {/* ── Genre taste pills ── */}
              {profile.favorite_artists && profile.favorite_artists.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px" }}>
                    Taste
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {profile.favorite_artists.map((artist, i) => (
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

              {/* ── {Name}'s Playlists — real, public playlists only, not tappable yet ── */}
              <SectionHeader title={`${possessive} Playlists`} />
              <ScrollRow
                items={playlists}
                renderItem={(playlist) => (
                  <PlaylistTile
                    key={playlist.id}
                    playlist={playlist}
                    subtitle={`${playlist.tracks} track${playlist.tracks === 1 ? '' : 's'}`}
                  />
                )}
                emptyMessage={`${possessive} public playlists will appear here`}
              />

              {/* ── {Name}'s Playlists You Follow — mocked ── */}
              <SectionHeader title={`${possessive} Playlists You Follow`} />
              <ScrollRow
                items={MOCK_FOLLOWED_PLAYLISTS}
                renderItem={(playlist) => (
                  <PlaylistTile
                    key={playlist.id}
                    playlist={playlist}
                    subtitle={`by ${playlist.creator}`}
                  />
                )}
                emptyMessage={`${possessive} followed playlists will appear here`}
              />

              {/* ── {Name}'s Musicians You Follow — mocked ── */}
              <SectionHeader title={`${possessive} Musicians You Follow`} />
              <ScrollRow
                items={MOCK_FOLLOWED_ARTISTS}
                renderItem={(artist) => (
                  <PersonTile key={artist.id} name={artist.name} subtitle={artist.genre} />
                )}
                emptyMessage={`${possessive} followed musicians will appear here`}
              />

              {/* ── {Name}'s People You Follow — mocked ── */}
              <SectionHeader title={`${possessive} People You Follow`} />
              <ScrollRow
                items={MOCK_FOLLOWED_USERS}
                renderItem={(person) => (
                  <PersonTile key={person.id} name={person.name} />
                )}
                emptyMessage={`${possessive} followed people will appear here`}
              />
            </>
          )}

          <div style={{ height: "20px" }} />
        </div>
      </div>
    </>
  );
}
