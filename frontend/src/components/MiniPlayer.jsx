import { usePlayer } from '../context/PlayerContext';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlay, openPlayer } = usePlayer();

  if (!currentTrack) return null;

  return (
    <div style={{
      width: "100%", backgroundColor: "#1a1a1a",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center",
      padding: "8px 12px", gap: "10px",
      boxSizing: "border-box", flexShrink: 0, cursor: "pointer",
    }}>
      {/* Tappable area — opens full player */}
      <div
        // In MiniPlayer.jsx, update openPlayer click:
onClick={() => { console.log('MiniPlayer tapped, calling openPlayer'); openPlayer(); }}
        style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}
      >
        {/* Album art */}
        <div style={{
          width: 40, height: 40, borderRadius: "6px", overflow: "hidden",
          backgroundColor: "#2a2a2a", flexShrink: 0,
        }}>
          {currentTrack.coverUrl ? (
            <img src={currentTrack.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `linear-gradient(135deg, hsl(${currentTrack.title?.charCodeAt(0) * 37 % 360 || 200}, 50%, 35%), hsl(${(currentTrack.title?.charCodeAt(0) * 37 % 360 || 200) + 40}, 40%, 25%))`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18V6l12-2v12" stroke="#5DEBD7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="6" cy="18" r="3" stroke="#5DEBD7" strokeWidth="2" />
                <circle cx="18" cy="16" r="3" stroke="#5DEBD7" strokeWidth="2" />
              </svg>
            </div>
          )}
        </div>

        {/* Track info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "13px", fontWeight: "600", color: "#ffffff",
            fontFamily: "'Kanit', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {currentTrack.title}
          </div>
          <div style={{
            fontSize: "11px", color: "#888888",
            fontFamily: "'Kanit', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {currentTrack.artist}
          </div>
        </div>
      </div>

      {/* Play/Pause button — separate from openPlayer tap area */}
      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        style={{
          width: 36, height: 36, borderRadius: "50%",
          backgroundColor: "#5DEBD7", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}
      >
        {isPlaying ? (
          <div style={{ display: "flex", gap: "3px" }}>
            <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
            <div style={{ width: 3, height: 12, backgroundColor: "#1a1a1a", borderRadius: 2 }} />
          </div>
        ) : (
          <div style={{
            width: 0, height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderLeft: "10px solid #1a1a1a",
            marginLeft: 2,
          }} />
        )}
      </button>
    </div>
  );
}