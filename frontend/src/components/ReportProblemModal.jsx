import { useState, useEffect } from "react";

// ─── Colors — matches SettingsPanel.jsx's palette ──────────────────────────────
const colors = {
  bg: "#2a2a2a",
  inputBg: "#242424",
  teal: "#5DEBD7",
  text: "#ffffff",
  muted: "#999999",
  border: "rgba(255,255,255,0.08)",
};

// ─── Report a Problem Modal — rises from the bottom, same sheet treatment as
// the app's other confirm sheets. Purely cosmetic for now: submitting doesn't
// send anything anywhere, it just fakes a brief "Submitting..." beat (so the
// demo feels real) before handing off to SettingsPanel, which shows the
// ponyMechanic "received" modal. Real submission is future work. ──
export default function ReportProblemModal({ isOpen, onCancel, onSubmitted }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);

  // ── Clear the form every time the sheet opens, rather than leaving a
  // previous draft sitting around. ──
  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setBody("");
    setSubmitting(false);
  }, [isOpen]);

  const canSubmit = title.trim() && body.trim() && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    // ── No real request yet — just a believable delay before the "received"
    // modal takes over. Swap this for an actual API call when the backend
    // exists. ──
    setTimeout(() => {
      setSubmitting(false);
      onSubmitted();
    }, 700);
  };

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1300,
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Backdrop */}
      <div
        onClick={submitting ? undefined : onCancel}
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
        padding: "18px 20px 24px",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
      }}>
        {/* Grabber */}
        <div style={{
          width: "36px", height: "4px", borderRadius: "2px",
          backgroundColor: colors.border, margin: "0 auto 18px",
        }} />

        <div style={{
          fontSize: "17px", fontWeight: "700", color: colors.text,
          fontFamily: "'Kanit', sans-serif", marginBottom: "4px",
        }}>
          Report a Problem
        </div>
        <div style={{
          fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif",
          marginBottom: "18px", lineHeight: 1.5,
        }}>
          Tell us what's broken — the more detail, the faster we can fix it.
        </div>

        <div style={{
          fontSize: "11px", fontWeight: "600", color: colors.muted,
          fontFamily: "'Kanit', sans-serif", letterSpacing: "0.6px",
          textTransform: "uppercase", marginBottom: "8px",
        }}>
          Title
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          placeholder="Short summary of the issue"
          disabled={submitting}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: "12px",
            backgroundColor: colors.inputBg,
            border: `1.5px solid ${titleFocused ? colors.teal : "transparent"}`,
            color: colors.text, fontSize: "14px", outline: "none",
            fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
            boxShadow: titleFocused ? "0 0 0 3px rgba(93,235,215,0.1)" : "none",
            transition: "all 0.2s ease", marginBottom: "16px",
          }}
        />

        <div style={{
          fontSize: "11px", fontWeight: "600", color: colors.muted,
          fontFamily: "'Kanit', sans-serif", letterSpacing: "0.6px",
          textTransform: "uppercase", marginBottom: "8px",
        }}>
          What happened?
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onFocus={() => setBodyFocused(true)}
          onBlur={() => setBodyFocused(false)}
          placeholder="Describe the issue — what you were doing, what you expected, and what happened instead"
          disabled={submitting}
          rows={5}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: "12px",
            backgroundColor: colors.inputBg,
            border: `1.5px solid ${bodyFocused ? colors.teal : "transparent"}`,
            color: colors.text, fontSize: "14px", outline: "none",
            fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
            boxShadow: bodyFocused ? "0 0 0 3px rgba(93,235,215,0.1)" : "none",
            transition: "all 0.2s ease", resize: "none",
            marginBottom: "20px",
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: "100%", padding: "13px", borderRadius: "50px", border: "none",
            backgroundColor: canSubmit ? colors.teal : "rgba(93,235,215,0.3)",
            color: canSubmit ? "#1a1a1a" : "rgba(26,26,26,0.5)",
            fontSize: "15px", fontWeight: "700",
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "'Kanit', sans-serif", marginBottom: "10px",
            transition: "all 0.2s ease",
          }}
        >
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          style={{
            width: "100%", padding: "13px", borderRadius: "50px",
            border: `1.5px solid ${colors.border}`, backgroundColor: "transparent",
            color: colors.text, fontSize: "15px", fontWeight: "600",
            cursor: submitting ? "not-allowed" : "pointer",
            fontFamily: "'Kanit', sans-serif",
            opacity: submitting ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
