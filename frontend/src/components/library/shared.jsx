// Shared building blocks for Settings > Library (MyMusicLibraryPanel,
// MyPlaylistsLibraryPanel) — both slide in over the settings list inside the
// settings drawer, exactly like EditProfilePanel.

export const colors = {
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

export const font = "'Kanit', sans-serif";

const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M9 18l6-6-6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke={colors.teal} strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

// ─── Slide-in sub-panel shell: back chevron, title, optional teal action pill ──
export const LibrarySubPanel = ({ isOpen, onClose, title, subtitle, actionLabel, onAction, children }) => (
  <div style={{
    position: "absolute", inset: 0, zIndex: 5,
    backgroundColor: colors.bg,
    transform: isOpen ? "translateX(0)" : "translateX(100%)",
    transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
    display: "flex", flexDirection: "column",
    pointerEvents: isOpen ? "all" : "none",
  }}>
    <div style={{
      padding: "48px 20px 16px",
      borderBottom: `1px solid ${colors.border}`,
      display: "flex", alignItems: "center", gap: "12px",
      flexShrink: 0,
    }}>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
        <ChevronLeft />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: font, letterSpacing: "-0.3px" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: "12px", color: colors.muted, fontFamily: font }}>{subtitle}</div>
        )}
      </div>
      {actionLabel && (
        <button
          onClick={onAction}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "6px 12px", borderRadius: "16px", cursor: "pointer",
            border: `1.5px solid ${colors.teal}`, backgroundColor: colors.tealGlow,
          }}
        >
          <PlusIcon />
          <span style={{ fontSize: "12px", fontWeight: "600", color: colors.teal, fontFamily: font }}>{actionLabel}</span>
        </button>
      )}
    </div>
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
      {children}
    </div>
  </div>
);

// ─── Square cover with a hue-gradient + note fallback ──
export const Cover = ({ url, seed = "?", size = 48 }) => {
  const hue = (seed.charCodeAt(0) || 63) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "8px", overflow: "hidden", flexShrink: 0,
      background: url ? "#333" : `linear-gradient(135deg, hsl(${hue}, 45%, 35%), hsl(${hue + 40}, 55%, 25%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {url ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none">
          <path d="M9 18V6l12-2v12" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" />
          <circle cx="18" cy="16" r="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" />
        </svg>
      )}
    </div>
  );
};

export const EmptyState = ({ title, message }) => (
  <div style={{ textAlign: "center", padding: "60px 32px" }}>
    <div style={{ fontSize: "16px", fontWeight: "600", color: colors.text, fontFamily: font, marginBottom: "8px" }}>{title}</div>
    <div style={{ fontSize: "13px", color: colors.textSecondary, fontFamily: font, lineHeight: 1.5 }}>{message}</div>
  </div>
);

export const LoadingState = () => (
  <div style={{ textAlign: "center", color: colors.muted, fontFamily: font, fontSize: "14px", padding: "40px 0" }}>
    Loading...
  </div>
);

// ─── Row shell with hover background ──
export const LibraryRow = ({ onTap, children }) => (
  <div
    onClick={onTap}
    onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.bgCard}
    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
    style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 20px", cursor: "pointer",
      transition: "background 0.15s ease",
    }}
  >
    {children}
  </div>
);

export const RowText = ({ title, subtitle }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {title}
    </div>
    {subtitle && (
      <div style={{ fontSize: "12px", color: colors.textSecondary, fontFamily: font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
        {subtitle}
      </div>
    )}
  </div>
);
