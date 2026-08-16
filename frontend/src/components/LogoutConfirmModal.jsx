// ─── Logout Confirm Modal — compact action-sheet-style modal that rises from
// the bottom of the screen, asking the user to confirm before actually logging
// out. Deliberately generic (title/message/confirmLabel props) so it can back
// other destructive confirmations later (e.g. Delete Account) without a rewrite. ──
const colors = {
  bg: "#2a2a2a",
  teal: "#5DEBD7",
  text: "#ffffff",
  muted: "#999999",
  border: "rgba(255,255,255,0.08)",
  danger: "#ff6b6b",
};

export default function LogoutConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
  title = "Log out?",
  message = "You'll need to sign back in to access your account.",
  confirmLabel = "Yes, Log Out",
  cancelLabel = "No",
}) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1300,
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "absolute", inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          opacity: isOpen ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Sheet — rises from the bottom, sized to content rather than filling the screen */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        backgroundColor: colors.bg,
        borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
        padding: "28px 20px 24px",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
      }}>
        {/* Grabber */}
        <div style={{
          width: "36px", height: "4px", borderRadius: "2px",
          backgroundColor: colors.border, margin: "0 auto 20px",
        }} />

        <div style={{
          fontSize: "17px", fontWeight: "700", color: colors.text,
          fontFamily: "'Kanit', sans-serif", textAlign: "center", marginBottom: "8px",
        }}>
          {title}
        </div>
        <div style={{
          fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
          textAlign: "center", lineHeight: 1.5, marginBottom: "24px",
        }}>
          {message}
        </div>

        <button
          onClick={onConfirm}
          style={{
            width: "100%", padding: "13px", borderRadius: "50px", border: "none",
            backgroundColor: colors.danger,
            color: "#1a1a1a", fontSize: "15px", fontWeight: "600",
            cursor: "pointer", fontFamily: "'Kanit', sans-serif",
            marginBottom: "10px", transition: "opacity 0.2s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            width: "100%", padding: "13px", borderRadius: "50px",
            border: `1.5px solid ${colors.border}`, backgroundColor: "transparent",
            color: colors.text, fontSize: "15px", fontWeight: "600",
            cursor: "pointer", fontFamily: "'Kanit', sans-serif",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
