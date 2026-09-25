import { useState, useEffect } from "react";
import { useUI } from '../context/UIContext';
import { usePlayer } from '../context/PlayerContext';
import { LibrarySubPanel, LibraryRow, RowText, Cover, EmptyState, LoadingState, ChevronRight, colors } from './library/shared';

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 4l14 8-14 8V4z" fill={colors.teal} /></svg>
);
const PauseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 4h3v16H7zM14 4h3v16h-3z" fill={colors.teal} /></svg>
);

// ─── Settings > Library > My Music (musician accounts only). Lists every track
// the musician has uploaded. The small play button previews it; tapping the
// row opens SongPanel to edit or delete it; Upload opens UploadTrackPanel.
// SongPanel/UploadTrackPanel are rendered by SettingsPanel at full width —
// this panel just asks for them through onEditTrack/onUpload. ──
export default function MyMusicLibraryPanel({ isOpen, onClose, onEditTrack, onUpload }) {
  const { myUploads, refreshMyUploads } = useUI();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(myUploads.length === 0);
    refreshMyUploads().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, refreshMyUploads]);

  const count = myUploads.length;

  return (
    <LibrarySubPanel
      isOpen={isOpen}
      onClose={onClose}
      title="My Music"
      subtitle={count ? `${count} track${count === 1 ? "" : "s"} uploaded` : null}
      actionLabel="Upload"
      onAction={onUpload}
    >
      {loading ? (
        <LoadingState />
      ) : count === 0 ? (
        <EmptyState
          title="No uploads yet"
          message="Tracks you upload show up here, where you can edit their details, change the cover, or remove them."
        />
      ) : (
        myUploads.map(track => {
          const isThis = currentTrack && currentTrack.title === track.title && currentTrack.artist === track.artist;
          const playingThis = isThis && isPlaying;
          return (
            <LibraryRow key={track.id} onTap={() => onEditTrack(track)}>
              <Cover url={track.coverUrl} seed={track.title || "?"} />
              <RowText
                title={track.title}
                subtitle={[track.album, track.genre].filter(Boolean).join(" · ") || track.artist}
              />
              <button
                onClick={(e) => { e.stopPropagation(); playTrack(track, [track], 0); }}
                aria-label={playingThis ? "Pause" : "Play"}
                style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                  border: `1.5px solid ${colors.teal}`, backgroundColor: isThis ? colors.tealGlow : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {playingThis ? <PauseIcon /> : <PlayIcon />}
              </button>
              <ChevronRight />
            </LibraryRow>
          );
        })
      )}
      <div style={{ height: "20px" }} />
    </LibrarySubPanel>
  );
}
