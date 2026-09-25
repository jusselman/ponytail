import { useState, useEffect } from "react";
import { useUI } from '../context/UIContext';
import { updatePlaylist } from '../services/playlistService';
import { LibrarySubPanel, LibraryRow, RowText, Cover, EmptyState, LoadingState, ChevronRight, colors, font } from './library/shared';

const GlobeIcon = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" stroke={color} strokeWidth="2" />
  </svg>
);
const LockIcon = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="11" width="16" height="10" rx="2" stroke={color} strokeWidth="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Public/Private pill — flips visibility in place without opening the editor ──
const VisibilityPill = ({ isPublic, pending, onToggle }) => {
  const color = isPublic ? colors.teal : colors.textSecondary;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      disabled={pending}
      title={isPublic ? "Public: tap to make private" : "Private: tap to make public"}
      style={{
        display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
        padding: "4px 10px", borderRadius: "12px",
        border: `1px solid ${isPublic ? colors.teal : "rgba(255,255,255,0.2)"}`,
        backgroundColor: isPublic ? colors.tealGlow : "transparent",
        cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
      }}
    >
      {isPublic ? <GlobeIcon color={color} /> : <LockIcon color={color} />}
      <span style={{ fontSize: "11px", fontWeight: "600", color, fontFamily: font }}>
        {isPublic ? "Public" : "Private"}
      </span>
    </button>
  );
};

// ─── Settings > Library > My Playlists (every account). Lists the playlists
// you created, with an inline Public/Private toggle. Tapping a row opens the
// same PlaylistPanel editor My Music uses (add/reorder/remove tracks, rename,
// cover, delete); New opens it in create mode. PlaylistPanel is rendered by
// SettingsPanel at full width — this panel asks for it via onEditPlaylist. ──
export default function MyPlaylistsLibraryPanel({ isOpen, onClose, onEditPlaylist }) {
  const { myPlaylists, refreshMyPlaylists } = useUI();
  const [loading, setLoading] = useState(false);
  const [pendingIds, setPendingIds] = useState({});
  // Optimistic visibility overrides, keyed by playlist id, until the refresh lands
  const [visibility, setVisibility] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(myPlaylists.length === 0);
    refreshMyPlaylists().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, refreshMyPlaylists]);

  const isPublicOf = (p) => (p.id in visibility ? visibility[p.id] : p.is_public);

  const handleToggleVisibility = async (playlist) => {
    if (pendingIds[playlist.id]) return;
    const next = !isPublicOf(playlist);
    setVisibility(prev => ({ ...prev, [playlist.id]: next }));
    setPendingIds(prev => ({ ...prev, [playlist.id]: true }));
    try {
      await updatePlaylist(playlist.id, { is_public: next });
      await refreshMyPlaylists();
      setVisibility(prev => { const { [playlist.id]: _, ...rest } = prev; return rest; });
    } catch (err) {
      console.log('Failed to update playlist visibility:', err);
      setVisibility(prev => ({ ...prev, [playlist.id]: !next }));
    } finally {
      setPendingIds(prev => { const { [playlist.id]: _, ...rest } = prev; return rest; });
    }
  };

  const count = myPlaylists.length;

  return (
    <LibrarySubPanel
      isOpen={isOpen}
      onClose={onClose}
      title="My Playlists"
      subtitle={count ? `${count} playlist${count === 1 ? "" : "s"} created` : null}
      actionLabel="New"
      onAction={() => onEditPlaylist(null)}
    >
      {loading ? (
        <LoadingState />
      ) : count === 0 ? (
        <EmptyState
          title="No playlists yet"
          message="Playlists you create show up here. Tap New to start one."
        />
      ) : (
        myPlaylists.map(p => (
          <LibraryRow key={p.id} onTap={() => onEditPlaylist(p)}>
            <Cover url={p.cover_art_url} seed={p.title || "?"} />
            <RowText
              title={p.title}
              subtitle={`${p.track_count ?? 0} track${p.track_count === 1 ? "" : "s"}`}
            />
            <VisibilityPill
              isPublic={isPublicOf(p)}
              pending={!!pendingIds[p.id]}
              onToggle={() => handleToggleVisibility(p)}
            />
            <ChevronRight />
          </LibraryRow>
        ))
      )}
      <div style={{ height: "20px" }} />
    </LibrarySubPanel>
  );
}
