import { useEffect, useRef } from "react";
import { usePlayer } from '../context/PlayerContext';

const colors = {
  bg: "#222222",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  muted: "#888888",
  border: "rgba(255,255,255,0.08)",
};

// ─── Chevron Down Icon ────────────────────────────────────────────────────────
const ChevronDown = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Previous Icon ────────────────────────────────────────────────────────────
const PrevIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M19 20L9 12l10-8v16z" fill={colors.text} />
    <rect x="5" y="4" width="2.5" height="16" rx="1" fill={colors.text} />
  </svg>
);

// ─── Next Icon ────────────────────────────────────────────────────────────────
const NextIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M5 4l10 8-10 8V4z" fill={colors.text} />
    <rect x="16.5" y="4" width="2.5" height="16" rx="1" fill={colors.text} />
  </svg>
);

// ─── Full Player Screen ───────────────────────────────────────────────────────
export default function FullPlayer() {
  const { currentTrack, isPlaying, isPlayerOpen, togglePlay, nextTrack, prevTrack, closePlayer, progress, currentTime, duration, seekTo } = usePlayer();

  // Progress bar click handler:
  const handleProgressClick = (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(Math.max(0, Math.min(1, ratio)));
  };

  if (!currentTrack) return null;

  const hue = currentTrack.title?.charCodeAt(0) * 37 % 360 || 200;

  return (
  <>
    {/* Backdrop */}
    {isPlayerOpen && (
      <div
        onClick={closePlayer}
        style={{
          position: "absolute", inset: 0, zIndex: 999,
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      />
    )}

    {/* Player panel */}
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 1000,
      backgroundColor: colors.bg,
      transform: isPlayerOpen ? "translateY(0)" : "translateY(100%)",
      transition: "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      pointerEvents: isPlayerOpen ? "all" : "none",
    }}>

      {/* ── Background album art ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {currentTrack.coverUrl ? (
          <img
            src={currentTrack.coverUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.3 }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(160deg, hsl(${hue}, 50%, 25%) 0%, hsl(${hue + 40}, 40%, 15%) 100%)`,
          }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(34,34,34,0.6) 0%, rgba(34,34,34,0.95) 60%)" }} />
      </div>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "16px 24px 32px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
          <button onClick={closePlayer} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <ChevronDown />
          </button>
          <div style={{ fontSize: "13px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "1px", textTransform: "uppercase" }}>
            Now Playing
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* ── Album art ── */}
        <div style={{
          width: "100%",
          aspectRatio: "1",
          borderRadius: "16px",
          overflow: "hidden",
          marginBottom: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          backgroundColor: "#2a2a2a",
          flexShrink: 0,
        }}>
          {currentTrack.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.album}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `linear-gradient(135deg, hsl(${hue}, 60%, 35%), hsl(${hue + 40}, 50%, 25%))`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M9 18V6l12-2v12" stroke={colors.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="6" cy="18" r="3" stroke={colors.teal} strokeWidth="1.5" />
                <circle cx="18" cy="16" r="3" stroke={colors.teal} strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </div>

        {/* ── Track info ── */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            fontSize: "22px", fontWeight: "700", color: colors.text,
            fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginBottom: "6px",
          }}>
            {currentTrack.title}
          </div>
          <div style={{ fontSize: "15px", color: colors.teal, fontFamily: "'Kanit', sans-serif", fontWeight: "600", marginBottom: "2px" }}>
            {currentTrack.artist}
          </div>
          <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
            {currentTrack.album}
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div
            onClick={handleProgressClick}
            style={{ height: "3px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "2px", marginBottom: "8px", cursor: "pointer" }}
            >
            <div style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: colors.teal, borderRadius: "2px", transition: "width 0.5s linear" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
            </span>
            <span style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>
                {duration > 0
                ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`
                : '3:30'}
            </span>
        </div>

        {/* ── Controls ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "32px" }}>
          <button
            onClick={prevTrack}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", opacity: 0.9, transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.6"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.9"}
          >
            <PrevIcon />
          </button>

          <button
            onClick={togglePlay}
            style={{
              width: 64, height: 64, borderRadius: "50%",
              backgroundColor: colors.teal, border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s ease",
              boxShadow: `0 0 30px rgba(93,235,215,0.4)`,
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {isPlaying ? (
              <div style={{ display: "flex", gap: "4px" }}>
                <div style={{ width: 4, height: 18, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
                <div style={{ width: 4, height: 18, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
              </div>
            ) : (
              <div style={{
                width: 0, height: 0,
                borderTop: "10px solid transparent",
                borderBottom: "10px solid transparent",
                borderLeft: "18px solid #1a1a1a",
                marginLeft: 3,
              }} />
            )}
          </button>

          <button
            onClick={nextTrack}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", opacity: 0.9, transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.6"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.9"}
          >
            <NextIcon />
          </button>
        </div>
      </div>
    </div>
  </>
 );
}