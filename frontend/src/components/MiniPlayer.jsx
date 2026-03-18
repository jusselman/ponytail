import { useState } from "react";

// ─── MiniPlayer ───────────────────────────────────────────────────────────────
// Reusable bottom music player bar, similar to Spotify's mini player.
// Props:
//   track: { title, artist, album, coverUrl }
//   onPlayPause: optional callback
// ─────────────────────────────────────────────────────────────────────────────
export default function MiniPlayer({ track, onPlayPause }) {
  const [playing, setPlaying] = useState(false);

  const handleToggle = () => {
    setPlaying(prev => !prev);
    if (onPlayPause) onPlayPause(!playing);
  };

  const defaultTrack = {
    title: "No track selected",
    artist: "",
    album: "",
    coverUrl: null,
  };

  const t = track || defaultTrack;

  return (
    <div style={{
      width: "100%",
      backgroundColor: "#1a1a1a",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      boxSizing: "border-box",
      flexShrink: 0,
    }}>

      {/* ── Album art ── */}
      <div style={{
        width: 46,
        height: 46,
        borderRadius: "6px",
        backgroundColor: "#2c2c2c",
        flexShrink: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {t.coverUrl ? (
          <img
            src={t.coverUrl}
            alt={t.album}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, #2a2a2a, #3a3a3a)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "18px" }}>♪</span>
          </div>
        )}
      </div>

      {/* ── Track info ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "#ffffff",
          fontFamily: "'Kanit', sans-serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {t.title}
        </div>
        <div style={{
          fontSize: "11px",
          color: "#aaaaaa",
          fontFamily: "'Kanit', sans-serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginTop: "1px",
        }}>
          {t.artist}
        </div>
        <div style={{
          fontSize: "11px",
          color: "#666666",
          fontFamily: "'Kanit', sans-serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginTop: "1px",
        }}>
          {t.album}
        </div>
      </div>

      {/* ── Play/Pause button ── */}
      <button
        onClick={handleToggle}
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          backgroundColor: "#5DEBD7",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background-color 0.2s ease, transform 0.15s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#3ecfba"}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = "#5DEBD7"}
      >
        {playing ? (
          // Pause icon
          <div style={{ display: "flex", gap: "3px" }}>
            <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
            <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
          </div>
        ) : (
          // Play icon
          <div style={{
            width: 0, height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderLeft: "10px solid #1a1a1a",
            marginLeft: 3,
          }} />
        )}
      </button>
    </div>
  );
}