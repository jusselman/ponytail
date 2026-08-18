import { useState, useEffect } from "react";
import { changePassword } from "../services/authService";

// ─── Colors — matches SettingsPanel.jsx / EditProfilePanel.jsx's palette ───────
const colors = {
  bg: "#222222",
  inputBg: "#2c2c2c",
  teal: "#5DEBD7",
  text: "#ffffff",
  muted: "#888888",
  border: "rgba(255,255,255,0.07)",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FieldLabel = ({ children, top = false }) => (
  <div style={{
    fontSize: "11px", fontWeight: "600", color: colors.muted,
    fontFamily: "'Kanit', sans-serif", letterSpacing: "0.6px",
    textTransform: "uppercase", marginBottom: "8px",
    marginTop: top ? "22px" : 0,
  }}>
    {children}
  </div>
);

const PonytailInput = (props) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%", padding: "12px 14px", borderRadius: "12px",
        backgroundColor: colors.inputBg,
        border: `1.5px solid ${focused ? colors.teal : "transparent"}`,
        color: colors.text, fontSize: "14px", outline: "none",
        fontFamily: "'Kanit', sans-serif", boxSizing: "border-box",
        boxShadow: focused ? "0 0 0 3px rgba(93,235,215,0.1)" : "none",
        transition: "all 0.2s ease",
      }}
    />
  );
};

// ─── Change Password Panel — slides in over SettingsPanel, reached only after
// the "are you sure?" confirm modal SettingsPanel shows first. Works the same
// for a listener or an artist account — both have a password_hash to check
// against (Google-only accounts get a clear server-side error instead). ──
export default function ChangePasswordPanel({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // ── Clear the form every time the panel opens, rather than leaving a
  // previous attempt's values (or error) sitting around. ──
  useEffect(() => {
    if (!isOpen) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSaved(false);
  }, [isOpen]);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill out all three fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.response?.data?.error || "Could not change your password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = currentPassword && newPassword && confirmPassword && !saving;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 5,
      backgroundColor: colors.bg,
      transform: isOpen ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
      display: "flex", flexDirection: "column",
      pointerEvents: isOpen ? "all" : "none",
    }}>
      {/* Header */}
      <div style={{
        padding: "48px 20px 16px",
        borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: "12px",
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
        >
          <ChevronLeft />
        </button>
        <div style={{ fontSize: "18px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", letterSpacing: "-0.3px" }}>
          Change Password
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <FieldLabel>Current Password</FieldLabel>
        <PonytailInput
          type="password"
          placeholder="Your current password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
        />

        <FieldLabel top>New Password</FieldLabel>
        <PonytailInput
          type="password"
          placeholder="At least 8 characters"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />

        <FieldLabel top>Confirm New Password</FieldLabel>
        <PonytailInput
          type="password"
          placeholder="Type it again"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />

        {error && (
          <div style={{ color: "#ff6b6b", fontSize: "13px", fontFamily: "'Kanit', sans-serif", marginTop: "18px" }}>
            {error}
          </div>
        )}
        {saved && (
          <div style={{ color: colors.teal, fontSize: "13px", fontFamily: "'Kanit', sans-serif", marginTop: "18px" }}>
            Password changed!
          </div>
        )}

        <div style={{ marginTop: "26px" }}>
          <button
            onClick={handleSave}
            disabled={!canSubmit}
            style={{
              width: "100%", padding: "13px", borderRadius: "50px", border: "none",
              backgroundColor: canSubmit ? colors.teal : "rgba(93,235,215,0.3)",
              color: canSubmit ? "#1a1a1a" : "rgba(26,26,26,0.5)",
              fontSize: "15px", fontWeight: "600",
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "'Kanit', sans-serif", transition: "all 0.2s ease",
            }}
          >
            {saving ? "Saving..." : "Change Password"}
          </button>
        </div>
        <div style={{ height: "30px" }} />
      </div>
    </div>
  );
}
