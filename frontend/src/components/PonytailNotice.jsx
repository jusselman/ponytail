// ─── Ponytail Notice — in-app replacement for the browser's alert() ──────────
// Same bottom sheet as LogoutConfirmModal (grabber, Kanit, rounded top, slides
// up over a dimmed screen), with one teal action and an optional second one.
// Render it inside the screen's card (a positioned parent) so it covers the
// phone-sized screen rather than the whole browser window.
const colors = {
  bg: "#2a2a2a",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.12)",
  text: "#ffffff",
  muted: "#999999",
  border: "rgba(255,255,255,0.08)",
};

const font = "'Kanit', sans-serif";

export default function PonytailNotice({
  isOpen,
  onClose,
  title,
  message,
  icon = null,                 // optional element shown above the title
  actionLabel = "Got it",
  onAction,                    // defaults to onClose
  secondaryLabel = null,
  onSecondary,
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      style={{ position: "absolute", inset: 0, zIndex: 1300, pointerEvents: isOpen ? "all" : "none" }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
          opacity: isOpen ? 1 : 0, transition: "opacity 0.25s ease",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        backgroundColor: colors.bg,
        borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
        padding: "28px 24px 28px",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
      }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: colors.border, margin: "0 auto 20px" }} />

        {icon && (
          <div style={{
            width: "52px", height: "52px", borderRadius: "50%", backgroundColor: colors.tealGlow,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
          }}>
            {icon}
          </div>
        )}

        <div style={{ fontSize: "17px", fontWeight: "700", color: colors.text, fontFamily: font, textAlign: "center", marginBottom: "8px", lineHeight: 1.3 }}>
          {title}
        </div>
        {message && (
          <div style={{ fontSize: "13px", color: colors.muted, fontFamily: font, textAlign: "center", lineHeight: 1.55, marginBottom: "24px" }}>
            {message}
          </div>
        )}

        <button
          onClick={onAction || onClose}
          style={{
            width: "100%", padding: "13px", borderRadius: "50px", border: "none",
            backgroundColor: colors.teal, color: "#1a1a1a", fontSize: "15px", fontWeight: "600",
            cursor: "pointer", fontFamily: font, transition: "opacity 0.2s ease",
            marginBottom: secondaryLabel ? "10px" : 0,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          {actionLabel}
        </button>
        {secondaryLabel && (
          <button
            onClick={onSecondary || onClose}
            style={{
              width: "100%", padding: "13px", borderRadius: "50px",
              border: `1.5px solid ${colors.border}`, backgroundColor: "transparent",
              color: colors.text, fontSize: "15px", fontWeight: "600",
              cursor: "pointer", fontFamily: font,
            }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Small teal icon for name problems
export const NameTakenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="10" cy="8" r="4" stroke="#5DEBD7" strokeWidth="1.8" />
    <path d="M3 20c0-3.3 3.1-6 7-6 1.2 0 2.3.2 3.2.7" stroke="#5DEBD7" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="18" cy="17" r="4" stroke="#5DEBD7" strokeWidth="1.8" />
    <path d="M15.3 19.7l5.4-5.4" stroke="#5DEBD7" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
