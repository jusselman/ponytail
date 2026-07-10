import { useState, useEffect } from "react";
import { usePlayer } from '../context/PlayerContext';

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
    <path d="M6 9l6 6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlayIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M5 4l15 8-15 8V4z" fill={colors.teal} />
  </svg>
);

const MusicNoteIcon = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.5" />
    <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.5" />
  </svg>
);

const AddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke={colors.teal} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Format seconds as m:ss ───────────────────────────────────────────────────
const formatLength = (seconds) => {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ─── Track Row — `onAdd`, if provided, shows a small teal Add button so the row can
// also be used to add a track to a playlist (opt-in; unused consumers see no change) ──
const TrackRow = ({ track, index, onPlay, currentTrack, isPlaying, onAdd }) => {
  const [hovered, setHovered] = useState(false);
  const isActive = currentTrack?.title === track.title && currentTrack?.album === track.albumName;
  const showPause = isActive && isPlaying;

  return (
    <div
      onClick={() => onPlay(track, index)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        padding: "11px 0", borderBottom: `1px solid ${colors.border}`,
        cursor: "pointer", transition: "background 0.15s ease",
        backgroundColor: hovered ? colors.bgCard : "transparent",
      }}
    >
      <div style={{
        width: 24, flexShrink: 0, textAlign: "center",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {(hovered || isActive) ? (
          showPause ? (
            <div style={{ display: "flex", gap: "3px" }}>
              <div style={{ width: 3, height: 12, backgroundColor: colors.teal, borderRadius: 2 }} />
              <div style={{ width: 3, height: 12, backgroundColor: colors.teal, borderRadius: 2 }} />
            </div>
          ) : (
            <PlayIcon />
          )
        ) : (
          <span style={{ fontSize: "13px", color: isActive ? colors.teal : colors.muted, fontFamily: "'Kanit', sans-serif" }}>
            {track.trackNumber}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "14px", fontWeight: "600",
          color: isActive ? colors.teal : colors.text,
          fontFamily: "'Kanit', sans-serif",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {track.title}
        </div>
      </div>
      <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", flexShrink: 0 }}>
        {formatLength(track.lengthSeconds)}
      </div>
      {onAdd && (
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          style={{
            marginLeft: "4px", width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            border: `1.5px solid ${colors.teal}`, backgroundColor: colors.tealGlow,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <AddIcon />
        </button>
      )}
    </div>
  );
};

// ─── Album Panel ──────────────────────────────────────────────────────────────
export default function AlbumPanel({ artistName, albumName, isOpen, onClose, onArtistTap, zIndexOverride, onAddTrack }) {
  const [animateIn, setAnimateIn] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setAnimateIn(true), 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ── Fetch album detail ──
  useEffect(() => {
    if (!artistName || !albumName || !isOpen) return;

    const fetchDetail = async () => {
      setLoading(true);
      setDetail(null);
      try {
        const res = await fetch(
          `http://localhost:5000/api/auth/albums/detail?artist=${encodeURIComponent(artistName)}&album=${encodeURIComponent(albumName)}`
        );
        const data = await res.json();
        setDetail(data);
      } catch (err) {
        console.log('Failed to fetch album detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [artistName, albumName, isOpen]);

  const handlePlayTrack = (track, index) => {
    if (!detail) return;
    const queue = detail.tracks.map(t => ({
      title: t.title,
      artist: artistName,
      album: albumName,
      genre: detail.genre,
      coverUrl: t.coverUrl,
      audioUrl: t.audioUrl,
    }));
    playTrack(queue[index], queue, index);
  };

  const handleClose = () => {       
    setAnimateIn(false);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
  <div style={{
    position: "absolute",
    inset: 0,
    zIndex: zIndexOverride || 1095,
    backgroundColor: colors.bg,
    transform: animateIn ? "translateY(0)" : "translateY(100%)",
    transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    pointerEvents: isOpen ? "all" : "none",
  }}>

    {loading ? (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px" }}>
          Loading album...
        </div>
      </div>
    ) : detail ? (
      <>
        {/* ── Cover art filling top portion, square ── */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "1", flexShrink: 0, overflow: "hidden" }}>
          {detail.coverUrl ? (
            <img
              src={detail.coverUrl}
              alt={detail.album}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `linear-gradient(160deg, hsl(${(artistName?.charCodeAt(0) || 0) * 37 % 360}, 50%, 25%) 0%, #1a1a1a 100%)`,
            }}>
              <MusicNoteIcon size={64} />
            </div>
          )}

          {/* Fade to background gradient */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(34,34,34,0.3) 70%, rgba(34,34,34,1) 100%)",
          }} />

          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: "absolute", top: "16px", left: "16px",
              background: "rgba(0,0,0,0.4)", border: "none",
              borderRadius: "50%", width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", zIndex: 2,
            }}
          >
            <ChevronDown />
        </button>

          {/* Album title */}
          <div style={{
            position: "absolute", bottom: "16px", left: "20px", right: "20px",
            zIndex: 1,
          }}>
            <div style={{
              fontSize: "24px", fontWeight: "800", color: colors.text,
              fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.4px",
              textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            }}>
              {detail.album}
            </div>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 0" }}>

          {/* ── Artist + track count, left aligned ── */}
          <div style={{ marginBottom: "20px" }}>
            <div
              onClick={() => onArtistTap(detail.artist)}
              style={{ fontSize: "15px", color: colors.teal, fontFamily: "'Kanit', sans-serif", fontWeight: "600", marginBottom: "4px", cursor: "pointer" }}
            >
              {detail.artist}
            </div>
            <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
              {detail.tracks.length} track{detail.tracks.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* ── Tracklist ── */}
          <div>
            {detail.tracks.map((track, i) => (
              <TrackRow
                key={i}
                track={{ ...track, albumName: detail.album }}
                index={i}
                onPlay={handlePlayTrack}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onAdd={onAddTrack ? () => onAddTrack({
                  title: track.title,
                  artist: artistName,
                  album: detail.album,
                  genre: detail.genre,
                  coverUrl: track.coverUrl,
                  audioUrl: track.audioUrl,
                }) : undefined}
              />
            ))}
          </div>

          <div style={{ height: "20px" }} />
        </div>
      </>
    ) : (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px" }}>
          Album not found.
        </div>
      </div>
    )}
  </div>
);
}