import PonyAbout from "../assets/images/ponyAbout.png";

// ─── About Ponytail Modal — rises from the bottom like the app's other confirm
// sheets, but this one is purely informational (no destructive action, no
// second step) — a single "Got it!" button is the only way to close it,
// besides tapping the backdrop. ──
const colors = {
  bg: "#242424",
  teal: "#5DEBD7",
  text: "#ffffff",
  textSecondary: "#cccccc",
  muted: "#999999",
  border: "rgba(255,255,255,0.08)",
};

export default function AboutPonytailModal({ isOpen, onClose }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1300,
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

      {/* Sheet — capped height with its own scroll region, since the copy runs
      long, but the "Got it!" button stays pinned at the bottom so it is always
      reachable without scrolling all the way down. */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: "85%",
        backgroundColor: colors.bg,
        borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Grabber */}
        <div style={{
          width: "36px", height: "4px", borderRadius: "2px",
          backgroundColor: colors.border, margin: "18px auto 0",
          flexShrink: 0,
        }} />

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 8px" }}>
          <img
            src={PonyAbout}
            alt=""
            style={{ display: "block", width: "160px", height: "160px", maxWidth: "100%", objectFit: "contain", margin: "0 auto 18px" }}
          />

          <div style={{
            fontSize: "19px", fontWeight: "700", color: colors.text,
            fontFamily: "'Kanit', sans-serif", textAlign: "center",
            marginBottom: "20px", letterSpacing: "-0.2px",
          }}>
            About Ponytail
          </div>

          <div style={{
            fontSize: "14px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif",
            lineHeight: 1.6, marginBottom: "16px", fontWeight: "600",
          }}>
            Ponytail is built by musicians, for musicians.
          </div>

          <div style={{
            fontSize: "14px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif",
            lineHeight: 1.6, marginBottom: "16px",
          }}>
            We got tired of watching artists pour everything into their music and get pennies back. So we built something different — a streaming app that actually pays fair, actually gives credit, and actually listens when musicians say something's broken.
          </div>

          <div style={{
            fontSize: "14px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif",
            lineHeight: 1.6, marginBottom: "16px",
          }}>
            No black-box algorithms deciding who gets heard. No fine print that quietly screws you over. Just music, made by people who make music, running a platform that treats musicians like the professionals they are.
          </div>

          <div style={{
            fontSize: "14px", color: colors.textSecondary, fontFamily: "'Kanit', sans-serif",
            lineHeight: 1.6, marginBottom: "16px",
          }}>
            Two things we're especially proud of: musicians keep about 90% of the sales profit, not whatever's left after everyone else takes their cut. And listeners control their own algorithm — you decide what shapes your feed, not some formula trying to maximize your scroll time.
          </div>

          <div style={{
            fontSize: "14px", color: colors.text, fontFamily: "'Kanit', sans-serif",
            lineHeight: 1.6, marginBottom: "8px", fontWeight: "600",
          }}>
            You made the song. You should get the respect — and the money — that comes with it.
          </div>
        </div>

        {/* Pinned footer */}
        <div style={{
          flexShrink: 0, padding: "14px 24px 26px",
          borderTop: `1px solid ${colors.border}`,
        }}>
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
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
