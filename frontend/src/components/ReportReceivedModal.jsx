import PonyMechanic from "../assets/images/ponyMechanic.png";

// ─── Report Received Modal — the follow-up sheet shown after "submitting" a
// report in ReportProblemModal. Purely a confirmation, closed only via its own
// "Got It!" button (or the backdrop) — no further action to take. ──
const colors = {
  bg: "#2a2a2a",
  teal: "#5DEBD7",
  text: "#ffffff",
  muted: "#999999",
  border: "rgba(255,255,255,0.08)",
};

export default function ReportReceivedModal({ isOpen, onClose }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1310,
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          backgroundColor: "rgba(0,0,0,0.65)",
          opacity: isOpen ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        backgroundColor: colors.bg,
        borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
        padding: "22px 24px 26px",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Grabber */}
        <div style={{
          width: "36px", height: "4px", borderRadius: "2px",
          backgroundColor: colors.border, marginBottom: "18px",
        }} />

        <img
          src={PonyMechanic}
          alt=""
          style={{ width: "640px", height: "auto", maxWidth: "100%", objectFit: "contain", marginBottom: "16px" }}
        />

        <div style={{
          fontSize: "17px", fontWeight: "700", color: colors.text,
          fontFamily: "'Kanit', sans-serif", textAlign: "center",
          lineHeight: 1.4, marginBottom: "8px",
        }}>
          Report received!
        </div>
        <div style={{
          fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
          textAlign: "center", lineHeight: 1.5, marginBottom: "24px",
        }}>
          The mechanics at Ponytail have received your report. Repairs are on the way.
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "13px", borderRadius: "50px", border: "none",
            backgroundColor: colors.teal, color: "#1a1a1a",
            fontSize: "15px", fontWeight: "700", cursor: "pointer",
            fontFamily: "'Kanit', sans-serif", transition: "opacity 0.2s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Got It!
        </button>
      </div>
    </div>
  );
}
