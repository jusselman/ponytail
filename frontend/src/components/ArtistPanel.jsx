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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M5 4l15 8-15 8V4z" fill={colors.teal} />
  </svg>
);

const MusicNoteIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.8" />
    <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.8" />
  </svg>
);

// ─── Album Card ───────────────────────────────────────────────────────────────
const ArtistAlbumCard = ({ album, artist, onPlay, currentTrack, isPlaying }) => {
  const [hovered, setHovered] = useState(false);
  const isActive = currentTrack?.album === album.album;
  const showPause = isActive && isPlaying;

  return (
    <div
      onClick={() => onPlay(album)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        padding: "10px 0", borderBottom: `1px solid ${colors.border}`,
        cursor: "pointer", transition: "opacity 0.2s ease",
        opacity: hovered ? 0.8 : 1,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: "8px", flexShrink: 0,
        backgroundColor: colors.bgCard, overflow: "hidden",
        position: "relative",
      }}>
        {album.coverUrl ? (
          <img src={album.coverUrl} alt={album.album} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MusicNoteIcon />
          </div>
        )}
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {album.album}
        </div>
        <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>
          {album.trackCount} track{album.trackCount === 1 ? '' : 's'}
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

// ─── Tag Pill Row ─────────────────────────────────────────────────────────────
const TagSection = ({ title, tags }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ fontSize: "11px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {tags.map((tag, i) => (
          <div key={i} style={{
            fontSize: "12px", fontWeight: "600", color: colors.teal,
            backgroundColor: colors.tealGlow, border: `1px solid ${colors.teal}`,
            borderRadius: "20px", padding: "4px 12px",
            fontFamily: "'Kanit', sans-serif",
          }}>
            {tag}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Artist Panel ─────────────────────────────────────────────────────────────
export default function ArtistPanel({ artistName, isOpen, onClose, onAlbumTap, zIndexOverride }) {
  const [animateIn, setAnimateIn] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  // ── Trigger slide-in animation on mount ──
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setAnimateIn(true), 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ── Fetch artist detail ──
  useEffect(() => {
    if (!artistName || !isOpen) return;

    const fetchDetail = async () => {
      setLoading(true);
      setDetail(null);
      try {
        const res = await fetch(`http://localhost:5000/api/auth/artists/detail?name=${encodeURIComponent(artistName)}`);
        const data = await res.json();
        setDetail(data);
      } catch (err) {
        console.log('Failed to fetch artist detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [artistName, isOpen]);

  const handleAlbumTap = (album) => {
    onAlbumTap({ artist: artistName, album: album.album });
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
        zIndex: zIndexOverride || 1090,
        backgroundColor: colors.bg,
        transform: animateIn ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: isOpen ? "all" : "none",
    }}>

      {/* ── Background image filling top portion ── */}
      <div style={{ position: "relative", width: "100%", height: "280px", flexShrink: 0, overflow: "hidden" }}>
        {detail?.backgroundUrl ? (
          <img
            src={detail.backgroundUrl}
            alt={artistName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(160deg, hsl(${(artistName?.charCodeAt(0) || 0) * 37 % 360}, 50%, 25%) 0%, #1a1a1a 100%)`,
          }} />
        )}
        {/* Dark gradient overlay for readability */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(34,34,34,0.4) 60%, rgba(34,34,34,1) 100%)",
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

        {/* Artist name */}
        <div style={{
          position: "absolute", bottom: "20px", left: "20px", right: "20px",
          zIndex: 1,
        }}>
          <div style={{
            fontSize: "28px", fontWeight: "800", color: colors.text,
            fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.5px",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}>
            {artistName}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>

        {loading ? (
          <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", paddingTop: "40px" }}>
            Loading artist...
          </div>
        ) : detail ? (
          <>
            {/* ── Albums ── */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "16px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.2px", marginBottom: "12px" }}>
                Albums
              </div>
              {detail.albums.map((album, i) => (
                <ArtistAlbumCard
                    key={i}
                    album={album}
                    artist={artistName}
                    onPlay={handleAlbumTap}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                />
                ))}
            </div>

            {/* ── Tags ── */}
            <TagSection title="Genre" tags={detail.genres} />
            <TagSection title="Subgenre" tags={detail.subgenres} />
            <TagSection title="Similar Artists" tags={detail.similarArtists} />
            <TagSection title="Mood" tags={detail.moods} />

            <div style={{ height: "20px" }} />
          </>
        ) : (
          <div style={{ textAlign: "center", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontSize: "14px", paddingTop: "40px" }}>
            Artist not found.
          </div>
        )}
      </div>
    </div>
  );
}