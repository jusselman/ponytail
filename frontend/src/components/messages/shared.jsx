// Shared bits for the direct-messages UI (InboxPanel, ConversationPanel,
// InboxButton) — colors, avatar, and time formatting live here so the three stay
// visually identical.

export const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  inputBg: "#2e2e2e",
  teal: "#5DEBD7",
  tealDark: "#1f4f49",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
  danger: "#ff6b6b",
};

export const font = "'Kanit', sans-serif";

// ── Photo if they have one, otherwise the same initials-gradient avatar used
// across the app ──
export const UserAvatar = ({ name, picture, size = 44 }) => {
  if (picture) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
        <img src={picture} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  const safe = name || "?";
  const initials = safe.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const hue = safe.charCodeAt(0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${hue + 40}, 70%, 35%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: "700", color: "#fff",
      fontFamily: font, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

export const ArtistBadge = () => (
  <span style={{
    fontSize: "9px", fontWeight: "700", color: colors.teal,
    border: `1px solid ${colors.teal}`, borderRadius: "6px",
    padding: "1px 5px", marginLeft: "6px", letterSpacing: "0.5px",
    textTransform: "uppercase", fontFamily: font, flexShrink: 0,
  }}>
    Artist
  </span>
);

export const ChatIcon = ({ size = 22, stroke = colors.text }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── "now", "5m", "3h", "Tue", "Sep 3" — for inbox rows ──
export const shortTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMin = (Date.now() - d.getTime()) / 60000;
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${Math.floor(diffMin)}m`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h`;
  if (diffMin < 60 * 24 * 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// ── "Today 4:12 PM", "Yesterday 9:03 AM", "Sep 3, 4:12 PM" — for thread separators ──
export const separatorTime = (iso) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
};

// ── One-line summary of a message for the inbox preview ──
export const previewText = (msg) => {
  if (!msg) return "";
  const prefix = msg.mine ? "You: " : "";
  if (msg.body) return prefix + msg.body;
  if (msg.attachmentType === "track") return `${prefix}Shared a track · ${msg.attachment?.title || ""}`;
  if (msg.attachmentType === "playlist") return `${prefix}Shared a playlist · ${msg.attachment?.title || ""}`;
  return prefix;
};

// ─── Block / Unblock toggle — one button whose icon and label flip with the
// state: a red circle-slash "Block" while not blocked, a teal "Unblock" once
// blocked. Used in the conversation header and on profiles. ──
export const BlockToggleButton = ({ blocked, pending, onPress, compact = false }) => {
  const color = blocked ? colors.teal : colors.danger;
  return (
    <button
      onClick={onPress}
      disabled={pending}
      aria-label={blocked ? "Unblock" : "Block"}
      title={blocked ? "Unblock" : "Block"}
      style={{
        display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
        padding: compact ? "5px" : "5px 10px", borderRadius: "14px",
        border: `1.5px solid ${blocked ? colors.teal : "rgba(255,107,107,0.55)"}`,
        backgroundColor: blocked ? colors.tealGlow : "transparent",
        cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
        transition: "all 0.2s ease",
      }}
    >
      {blocked ? (
        // Unblock: open circle with a check — "let them back in"
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <path d="M8 12.5l2.8 2.8L16.5 9.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        // Block: circle-slash
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <path d="M5.6 5.6l12.8 12.8" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {!compact && (
        <span style={{ fontSize: "11px", fontWeight: "600", color, fontFamily: font }}>
          {blocked ? "Unblock" : "Block"}
        </span>
      )}
    </button>
  );
};
