import { useState } from "react";
import { register } from '../services/authService';

// ─── Colors — matches OnboardingScreen.jsx's palette ──────────────────────────
const colors = {
  bg: "#222222",
  teal: "#5DEBD7",
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  gold: "#f5cf00",
  text: "#ffffff",
  muted: "#888888",
  inputBg: "#2c2c2c",
};

// ─── Next Button — same component as OnboardingScreen.jsx, duplicated rather than
// imported since neither file exports its internal pieces (matches existing convention) ──
const NextButton = ({ onPress, label = "Next", disabled = false }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <button
        onClick={onPress}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: "10px 24px",
          borderRadius: "50px",
          border: "none",
          backgroundColor: disabled
            ? "rgba(93,235,215,0.3)"
            : hovered ? colors.tealDark : colors.teal,
          color: disabled ? "rgba(26,26,26,0.5)" : "#1a1a1a",
          fontSize: "15px",
          fontWeight: "600",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          transform: hovered && !disabled ? "translateY(-1px)" : "translateY(0)",
          boxShadow: hovered && !disabled
            ? "0 8px 24px rgba(93,235,215,0.35)"
            : "0 4px 12px rgba(93,235,215,0.2)",
          fontFamily: "'Kanit', sans-serif",
          letterSpacing: "0.2px",
        }}
      >
        {label}
      </button>
    </div>
  );
};

// ─── Reusable Input ───────────────────────────────────────────────────────────
const PonytailInput = ({ name, focused, onFocus, onBlur, ...props }) => (
  <input
    style={{
      width: "100%",
      padding: "14px 16px",
      borderRadius: "14px",
      backgroundColor: colors.inputBg,
      border: `1.5px solid ${focused === name ? colors.teal : "transparent"}`,
      color: colors.text,
      fontSize: "15px",
      outline: "none",
      transition: "border 0.2s ease, box-shadow 0.2s ease",
      fontFamily: "'Kanit', sans-serif",
      boxSizing: "border-box",
      boxShadow: focused === name ? `0 0 0 4px rgba(93,235,215,0.1)` : "none",
    }}
    onFocus={() => onFocus(name)}
    onBlur={() => onBlur(null)}
    {...props}
  />
);

// ─── Step 1: Email ────────────────────────────────────────────────────────────
const EmailStep = ({ email, setEmail, onNext }) => {
  const [focused, setFocused] = useState(null);
  const [error, setError] = useState(null);

  const handleNext = () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div style={{ width: "100%", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif", marginBottom: "28px",
        letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        Enter your email address:
      </div>
      <PonytailInput
        name="email" focused={focused}
        onFocus={setFocused} onBlur={setFocused}
        placeholder="you@example.com" type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(null); }}
      />
      {error && (
        <div style={{ color: "#ff6b6b", fontSize: "13px", fontFamily: "'Kanit', sans-serif", marginTop: "8px", marginLeft: "4px" }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: "24px" }}>
        <NextButton onPress={handleNext} disabled={!email} />
      </div>
    </div>
  );
};

// ─── Step 2: Password ─────────────────────────────────────────────────────────
const PasswordStep = ({ password, setPassword, onNext }) => {
  const [focused, setFocused] = useState(null);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);

  const handleNext = () => {
    if (!password || password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match. Please try again."); return; }
    setError(null);
    onNext();
  };

  const inputStyle = (name) => ({
    width: "100%", padding: "14px 16px", borderRadius: "6px",
    backgroundColor: colors.inputBg, border: `1.5px solid #FFFFFF`,
    color: colors.text, fontSize: "15px", outline: "none",
    transition: "box-shadow 0.2s ease", fontFamily: "'Kanit', sans-serif",
    boxSizing: "border-box",
    boxShadow: focused === name ? `0 0 0 3px rgba(93,235,215,0.15)` : "none",
  });

  return (
    <div style={{ width: "100%", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{ fontSize: "22px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "12px", letterSpacing: "-0.2px", lineHeight: 1.3 }}>
        Enter a password:
      </div>
      <input style={inputStyle("password")} placeholder="" type="password" value={password}
        onChange={e => { setPassword(e.target.value); setError(null); }}
        onFocus={() => setFocused("password")} onBlur={() => setFocused(null)} />

      <div style={{ fontSize: "22px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "12px", marginTop: "28px", letterSpacing: "-0.2px", lineHeight: 1.3 }}>
        One more time:
      </div>
      <input style={inputStyle("confirm")} placeholder="" type="password" value={confirm}
        onChange={e => { setConfirm(e.target.value); setError(null); }}
        onFocus={() => setFocused("confirm")} onBlur={() => setFocused(null)} />

      {error && (
        <div style={{ color: "#ff6b6b", fontSize: "13px", fontFamily: "'Kanit', sans-serif", marginTop: "10px", marginLeft: "2px" }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: "24px" }}>
        <NextButton onPress={handleNext} disabled={!password || !confirm} />
      </div>
    </div>
  );
};

// ─── Step 3: Artist / Stage Name — musician-specific, replaces the favorite-artists
// picker since that step doesn't apply to an account that will be uploading, not
// discovering, music. This becomes the artist name attached to every uploaded track. ──
const ArtistNameStep = ({ artistName, setArtistName, onNext, loading }) => {
  const [focused, setFocused] = useState(null);

  return (
    <div style={{ width: "100%", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{
        fontSize: "22px", fontWeight: "600", color: colors.text,
        fontFamily: "'Kanit', sans-serif", marginBottom: "8px",
        letterSpacing: "-0.2px", lineHeight: 1.3,
      }}>
        What name do you release music under?
      </div>
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "24px" }}>
        This is the artist name listeners will see on your tracks
      </div>
      <PonytailInput
        name="artistName" focused={focused}
        onFocus={setFocused} onBlur={setFocused}
        placeholder="Your artist or band name"
        value={artistName}
        onChange={e => setArtistName(e.target.value)}
      />
      <div style={{ marginTop: "24px" }}>
        <NextButton
          onPress={onNext}
          label={loading ? "Creating account..." : "Finish"}
          disabled={!artistName.trim() || loading}
        />
      </div>
    </div>
  );
};

// ─── Root Musician Onboarding Component — email, password, artist name, done.
// Deliberately skips the listener flow's favorite-artists picker and marketing
// slides (intro/artist/pony mode/goat mode); those exist to warm up a listener's
// personalized feed, which isn't relevant to an account whose purpose is uploading. ──
export default function MusicianOnboardingScreen({ setScreen }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artistName, setArtistName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFinishSignup = async () => {
    setLoading(true);
    try {
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
      await register(email, username, password, true, artistName.trim()); // is_artist: true, display_name: artist name
      setScreen("home");
    } catch (err) {
      const message = err.response?.data?.error || 'Something went wrong.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Kanit', sans-serif; }
        body { background: #222222; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: #555; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #2c2c2c inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100%", backgroundColor: colors.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Kanit', sans-serif", padding: "20px",
      }}>
        <div style={{
          width: "375px",
          minHeight: "750px",
          backgroundColor: colors.bg,
          borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column",
          padding: "60px 32px 40px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            fontSize: "11px", fontWeight: "700", color: colors.gold,
            fontFamily: "'Kanit', sans-serif", letterSpacing: "1.5px",
            textTransform: "uppercase", marginBottom: "20px",
          }}>
            Musician Sign Up
          </div>

          {step === "email" && <EmailStep email={email} setEmail={setEmail} onNext={() => setStep("password")} />}
          {step === "password" && <PasswordStep password={password} setPassword={setPassword} onNext={() => setStep("artistName")} />}
          {step === "artistName" && (
            <ArtistNameStep
              artistName={artistName}
              setArtistName={setArtistName}
              onNext={handleFinishSignup}
              loading={loading}
            />
          )}
        </div>
      </div>
    </>
  );
}
