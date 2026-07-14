import { useState, useEffect } from "react";
import { getPlaylistDetail, followPlaylist, unfollowPlaylist } from '../services/playlistService';
import { usePlayer } from '../context/PlayerContext';
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
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronDown = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MusicNoteIcon = ({ size = 32, color = colors.teal }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.5" />
    <circle cx="18" cy="16" r="3" stroke={color} strokeWidth="1.5" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={colors.textSecondary} strokeWidth="1.6" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z" stroke={colors.textSecondary} strokeWidth="1.6" />
  </svg>
);

const ShuffleIcon = ({ color = colors.text }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <polyline points="16 3 21 3 21 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="4" y1="20" x2="21" y2="3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <polyline points="21 16 21 21 16 21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="15" y1="15" x2="21" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="4" y1="4" x2="9" y2="9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke={colors.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Follow button — same optimistic-update pattern as UserProfilePanel's ──
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
    }}
  >
    {following && <CheckIcon />}
    <span style={{ fontSize: "12px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>
      {following ? "Following" : "Follow"}
    </span>
  </button>
);

// ─── A single read-only track row — no remove/drag, just tap-to-play ──
const TrackRow = ({ track, index, isCurrent, onTap }) => (
  <div
    onClick={onTap}
    style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "8px 6px", cursor: "pointer",
      backgroundColor: isCurrent ? colors.bgCardHover : "transparent",
      borderRadius: "10px",
    }}
  >
    <div style={{ width: 20, fontSize: "12px", color: isCurrent ? colors.teal : colors.muted, fontFamily: "'Kanit', sans-serif", textAlign: "center", flexShrink: 0 }}>
      {index + 1}
    </div>
    <div style={{
      width: 40, height: 40, borderRadius: "6px", flexShrink: 0,
      backgroundColor: colors.bgCard, overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {track.coverUrl ? (
        <img src={track.coverUrl} alt={track.album} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <MusicNoteIcon size={16} />
      )}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: "13px", fontWeight: "600", color: isCurrent ? colors.teal : colors.text,
        fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {track.title}
      </div>
      <div style={{
        fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px",
      }}>
        {track.artist}
      </div>
    </div>
  </div>
);

// ─── Public Playlist Panel — read-only viewer for a playlist you don't own.
// Shows the same header/Play/Shuffle affordances as PlaylistPanel's build view,
// but the track list has no add/remove/reorder, and there's a Follow button
// (hidden if you somehow land here on your own playlist) instead of the "…" menu. ──
export default function PublicPlaylistPanel() {
  const { isPublicPlaylistOpen, viewedPlaylistId, closePublicPlaylist } = useUI();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingFollow, setPendingFollow] = useState(false);

  useEffect(() => {
    if (!isPublicPlaylistOpen || !viewedPlaylistId) return;

    setLoading(true);
    setError(null);
    getPlaylistDetail(viewedPlaylistId)
      .then((detail) => setPlaylist(detail))
      .catch((err) => {
        console.log('Failed to load playlist:', err);
        setPlaylist(null);
        setError(err?.response?.status === 403 ? 'This playlist is private.' : 'Could not load this playlist.');
      })
      .finally(() => setLoading(false));
  }, [isPublicPlaylistOpen, viewedPlaylistId]);

  const tracks = playlist?.tracks || [];
  const displayTitle = playlist?.title || 'Playlist';
  const headerCoverUrl = playlist?.cover_art_url || null;
  const isThisPlaylistPlaying = Boolean(
    isPlaying && currentTrack && tracks.some(t => t.title === currentTrack.title && t.artist === currentTrack.artist)
  );

  // ── Follow/unfollow — optimistic, reverted on failure, same pattern as UserProfilePanel ──
  const handleToggleFollow = async () => {
    if (!playlist || pendingFollow) return;
    const wasFollowing = playlist.is_following;

    setPendingFollow(true);
    setPlaylist(prev => ({ ...prev, is_following: !wasFollowing }));

    try {
      if (wasFollowing) {
        await unfollowPlaylist(viewedPlaylistId);
      } else {
        await followPlaylist(viewedPlaylistId);
      }
    } catch (err) {
      console.log('Failed to toggle playlist follow:', err);
      setPlaylist(prev => ({ ...prev, is_following: wasFollowing }));
    } finally {
      setPendingFollow(false);
    }
  };

  const mapForPlayer = (t) => ({
    title: t.title, artist: t.artist, album: t.album, genre: t.genre,
    coverUrl: t.coverUrl, audioUrl: t.audioUrl,
  });

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    if (isThisPlaylistPlaying) { togglePlay(); return; }
    const mapped = tracks.map(mapForPlayer);
    playTrack(mapped[0], mapped, 0);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const mapped = tracks.map(mapForPlayer);
    const shuffled = [...mapped];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playTrack(shuffled[0], shuffled, 0);
  };

  const handleTrackTap = (index) => {
    const mapped = tracks.map(mapForPlayer);
    playTrack(mapped[index], mapped, index);
  };

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 1120,
      pointerEvents: isPublicPlaylistOpen ? "all" : "none",
    }}>
      {/* Backdrop */}
      {isPublicPlaylistOpen && (
        <div
          onClick={closePublicPlaylist}
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)" }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundColor: colors.bg,
        transform: isPublicPlaylistOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* ── Header bar ── */}
        <div style={{
          padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}>
          <button
            onClick={closePublicPlaylist}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
          >
            <ChevronDown />
          </button>
          <div style={{
            fontSize: "14px", fontWeight: "600", color: colors.text,
            fontFamily: "'Kanit', sans-serif", letterSpacing: "0.3px",
            maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {displayTitle}
          </div>
          <div style={{ width: "28px" }} />
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 0" }}>

          {loading ? (
            <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", padding: "40px 0" }}>
              Loading...
            </div>
          ) : error || !playlist ? (
            <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", padding: "40px 0" }}>
              {error || 'Playlist not found.'}
            </div>
          ) : (
            <>
              {/* ── Playlist header — cover, name, description, visibility, creator ── */}
              <div style={{ display: "flex", gap: "14px", marginBottom: "18px" }}>
                <div style={{
                  width: 88, height: 88, borderRadius: "12px", flexShrink: 0, overflow: "hidden",
                  background: headerCoverUrl ? "transparent" : `linear-gradient(135deg, hsl(200, 45%, 28%), hsl(240, 35%, 20%))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                }}>
                  {headerCoverUrl ? (
                    <img src={headerCoverUrl} alt={displayTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <MusicNoteIcon size={32} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{
                    fontSize: "18px", fontWeight: "800", color: colors.text,
                    fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {displayTitle}
                  </div>
                  {playlist.description && (
                    <div style={{
                      fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "4px",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {playlist.description}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                    <GlobeIcon />
                    <span style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                      Public
                    </span>
                  </div>
                  {playlist.creator_username && (
                    <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "4px" }}>
                      By {playlist.creator_username}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Play / Shuffle / Follow ── */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                <button
                  onClick={handlePlayAll}
                  disabled={tracks.length === 0}
                  style={{
                    width: 52, height: 52, borderRadius: "50%",
                    backgroundColor: tracks.length === 0 ? colors.bgCardHover : colors.teal,
                    border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: tracks.length === 0 ? "default" : "pointer",
                    boxShadow: tracks.length === 0 ? "none" : "0 0 24px rgba(93,235,215,0.35)",
                  }}
                >
                  {isThisPlaylistPlaying ? (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <div style={{ width: 4, height: 16, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                      <div style={{ width: 4, height: 16, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 0, height: 0,
                      borderTop: "9px solid transparent",
                      borderBottom: "9px solid transparent",
                      borderLeft: `15px solid ${tracks.length === 0 ? colors.muted : "#1a1a1a"}`,
                      marginLeft: 3,
                    }} />
                  )}
                </button>

                <button
                  onClick={handleShuffle}
                  disabled={tracks.length === 0}
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: tracks.length === 0 ? "default" : "pointer",
                    opacity: tracks.length === 0 ? 0.4 : 1,
                  }}
                >
                  <ShuffleIcon />
                </button>

                {/* Hidden if this happens to be your own playlist */}
                {!playlist.owned && (
                  <FollowButton
                    following={playlist.is_following}
                    pending={pendingFollow}
                    onToggle={handleToggleFollow}
                  />
                )}
              </div>

              {/* ── Tracks — read only ── */}
              <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px" }}>
                Tracks{tracks.length > 0 ? ` (${tracks.length})` : ""}
              </div>

              {tracks.length === 0 ? (
                <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "13px", padding: "20px 0 32px" }}>
                  This playlist has no tracks yet.
                </div>
              ) : (
                tracks.map((track, i) => (
                  <TrackRow
                    key={track.id ?? `${track.title}-${track.artist}-${i}`}
                    track={track}
                    index={i}
                    isCurrent={Boolean(currentTrack && track.title === currentTrack.title && track.artist === currentTrack.artist)}
                    onTap={() => handleTrackTap(i)}
                  />
                ))
              )}

              <div style={{ height: "20px" }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
