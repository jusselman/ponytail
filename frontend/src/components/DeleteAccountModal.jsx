import { useState, useEffect } from "react";
import PonyAnxious from "../assets/images/ponyAnxious.png";

// ─── Delete Account Modal — the second, final confirmation in the delete-account
// flow (SettingsPanel shows a plain LogoutConfirmModal-style "are you sure?" first;
// only a "Yes" there reaches this one). Rises from the bottom like the other
// confirm sheets, but carries the actual delete call, so it needs its own
// loading/error state — a failed request should let the user retry or back out,
// not silently close. ──
const colors = {
  bg: "#2a2a2a",
  teal: "#5DEBD7",
  text: "#ffffff",
  muted: "#999999",
  border: "rgba(255,255,255,0.08)",
  danger: "#ff6b6b",
};

export default function DeleteAccountModal({ isOpen, onCancel, onConfirmDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  // ── Reset stale error/loading state if the sheet is closed (e.g. via Cancel)
  // and reopened later. ──
  useEffect(() => {
    if (!isOpen) {
      setDeleting(false);
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      // Expected to also handle post-delete cleanup/navigation on success —
      // this component unmounts along with the rest of the authenticated
      // screen tree once that happens, so nothing further to do here.
      await onConfirmDelete();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete your account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 1310,
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Backdrop — disabled while a delete is in flight, so a stray click can't
      dismiss the sheet mid-request */}
      <div
        onClick={deleting ? undefined : onCancel}
        style={{
          position: "absolute", inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
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
          src={PonyAnxious}
          alt=""
          style={{ width: "384px", height: "384px", maxWidth: "100%", objectFit: "contain", marginBottom: "16px" }}
        />

        <div style={{
          fontSize: "16px", fontWeight: "700", color: colors.text,
          fontFamily: "'Kanit', sans-serif", textAlign: "center",
          lineHeight: 1.4, marginBottom: "8px",
        }}>
          Are you absolutely sure you want to delete your account?
        </div>
        <div style={{
          fontSize: "13px", fontWeight: "600", color: colors.danger,
          fontFamily: "'Kanit', sans-serif", textAlign: "center", marginBottom: "22px",
        }}>
          This action cannot be undone.
        </div>

        {error && (
          <div style={{
            fontSize: "12px", color: colors.danger, fontFamily: "'Kanit', sans-serif",
            textAlign: "center", marginBottom: "14px",
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={deleting}
          style={{
            width: "100%", padding: "13px", borderRadius: "50px", border: "none",
            backgroundColor: deleting ? "rgba(255,107,107,0.5)" : colors.danger,
            color: "#1a1a1a", fontSize: "15px", fontWeight: "700",
            cursor: deleting ? "not-allowed" : "pointer",
            fontFamily: "'Kanit', sans-serif", marginBottom: "10px",
            transition: "opacity 0.2s ease",
          }}
        >
          {deleting ? "Deleting..." : "Yes, Delete My Account"}
        </button>
        <button
          onClick={onCancel}
          disabled={deleting}
          style={{
            width: "100%", padding: "13px", borderRadius: "50px",
            border: `1.5px solid ${colors.border}`, backgroundColor: "transparent",
            color: colors.text, fontSize: "15px", fontWeight: "600",
            cursor: deleting ? "not-allowed" : "pointer",
            fontFamily: "'Kanit', sans-serif",
            opacity: deleting ? 0.5 : 1,
            transition: "background 0.2s ease",
          }}
          onMouseEnter={e => { if (!deleting) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
