import { useState, useEffect, useRef } from "react";
import { checkUsername } from "../services/authService";

// ─── Signup step: choose your @username ───────────────────────────────────────
// People pick their own handle instead of getting one built from their email,
// which used to publish half of everyone's email address (SECURITY_RISKS.md
// SR-35). Checked with the server while typing (format, reserved words, taken,
// artist names), and again on Next. Each signup screen passes in its own Input
// and NextButton so the step matches that screen.

const font = "'Kanit', sans-serif";

// Only what a username can contain; capitals become lower case as you type
const clean = (value) => value.toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9._]/g, "").slice(0, 30);

// "Sigur Rós" -> "sigurros", for a suggested username
export const suggestUsername = (name) =>
  clean(String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ""))
    .replace(/^[._]+|[._]+$/g, "");

export default function UsernameStep({ username, setUsername, suggestion = "", onNext, Input, NextButton, colors }) {
  const [focused, setFocused] = useState(null);
  const [status, setStatus] = useState({ state: "idle" }); // idle | checking | ok | taken | error
  const latest = useRef(username);

  // Start from the suggestion the first time the step opens
  useEffect(() => {
    if (!username && suggestion) setUsername(suggestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check while typing, a moment after the last keystroke
  useEffect(() => {
    latest.current = username;
    if (!username) { setStatus({ state: "idle" }); return; }
    if (username.length < 3) { setStatus({ state: "taken", message: "Usernames need at least 3 characters." }); return; }
    setStatus({ state: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsername(username);
        if (latest.current !== username) return; // they've typed more since
        setStatus(result.available ? { state: "ok" } : { state: "taken", message: result.message });
      } catch (err) {
        if (latest.current !== username) return;
        setStatus({
          state: "error",
          message: err.response?.data?.error || "Couldn't check that username. Check your connection and try again.",
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const statusLine = {
    checking: { color: colors.muted || "#888", text: "Checking..." },
    ok: { color: colors.teal, text: `@${username} is available` },
    taken: { color: "#ff6b6b", text: status.message },
    error: { color: "#ff6b6b", text: status.message },
  }[status.state];

  return (
    <div style={{ width: "100%", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text, fontFamily: font,
        marginBottom: "8px", letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        Choose a username
      </div>
      <div style={{ fontSize: "13px", color: colors.muted || "#888", fontFamily: font, marginBottom: "24px", lineHeight: 1.45 }}>
        Your @handle on Ponytail, shown on your profile and posts. Letters, numbers, dots and underscores.
      </div>

      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)",
          color: colors.muted || "#888", fontFamily: font, fontSize: "15px", pointerEvents: "none", zIndex: 1,
        }}>@</span>
        <Input
          name="username" focused={focused}
          onFocus={setFocused} onBlur={setFocused}
          placeholder="yourname"
          value={username}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username"
          onChange={e => setUsername(clean(e.target.value))}
          onKeyDown={e => { if (e.key === "Enter" && status.state === "ok") onNext(); }}
          style={{ paddingLeft: "34px" }}
        />
      </div>

      <div style={{ minHeight: "20px", marginTop: "8px", marginLeft: "4px", fontSize: "13px", fontFamily: font, color: statusLine?.color }}>
        {statusLine?.text}
      </div>

      <div style={{ marginTop: "16px" }}>
        <NextButton onPress={onNext} disabled={status.state !== "ok"} />
      </div>
    </div>
  );
}
