import { useState } from "react";
import { register, login } from '../services/authService';
import logo from '../assets/images/ponyLogo.png';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
    <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.84l6.08-6.08C34.36 3.09 29.44 1 24 1 14.82 1 7.01 6.48 3.58 14.22l7.09 5.51C12.3 13.59 17.67 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.68c-.55 2.97-2.2 5.48-4.68 7.17l7.18 5.57C43.36 37.36 46.52 31.36 46.52 24.5z"/>
    <path fill="#FBBC05" d="M10.67 28.27A14.6 14.6 0 0 1 9.5 24c0-1.48.25-2.91.67-4.27L3.08 14.22A23.93 23.93 0 0 0 1 24c0 3.86.92 7.51 2.58 10.72l7.09-6.45z"/>
    <path fill="#34A853" d="M24 47c5.44 0 10.01-1.8 13.35-4.88l-7.18-5.57C28.38 38.1 26.3 38.5 24 38.5c-6.33 0-11.7-4.09-13.33-9.73l-7.09 5.51C7.01 41.52 14.82 47 24 47z"/>
  </svg>
);

export default function PonytailLogin() {
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [screen, setScreen] = useState("landing");
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [focused, setFocused] = useState(null);

  const colors = {
    bg: "#222222",
    bgDeep: "#1a1a1a",
    teal: "#5DEBD7",
    tealDark: "#3ecfba",
    text: "#ffffff",
    muted: "#888888",
    border: "#444444",
    inputBg: "#2c2c2c",
  };

  const styles = {
    wrapper: {
      minHeight: "100vh",
      backgroundColor: colors.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: "20px",
    },
    phone: {
      width: "375px",
      minHeight: "750px",
      backgroundColor: colors.bg,
      borderRadius: "40px",
      boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 32px",
      position: "relative",
      overflow: "hidden",
    },
    gradientOrb: {
      position: "absolute",
      width: "300px",
      height: "300px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(93,235,215,0.06) 0%, transparent 70%)",
      top: "-60px",
      left: "50%",
      transform: "translateX(-50%)",
      pointerEvents: "none",
    },
    logoContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginBottom: "48px",
      animation: "fadeSlideDown 0.6s ease forwards",
    },
    logoImage: {
      width: "130px",
      height: "130px",
      objectFit: "contain",
      marginBottom: "16px",
      filter: "drop-shadow(0 8px 24px rgba(93,235,215,0.2))",
    },
    logoText: {
      fontSize: "28px",
      fontWeight: "700",
      color: colors.text,
      letterSpacing: "-0.5px",
      fontFamily: "'DM Sans', sans-serif",
      marginBottom: "6px",
    },
    tagline: {
      fontSize: "15px",
      color: colors.text,
      opacity: 0.85,
      fontWeight: "300",
      letterSpacing: "0.2px",
    },
    buttonsContainer: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      animation: "fadeSlideUp 0.6s ease 0.2s forwards",
      opacity: 0,
    },
    signupBtn: {
      width: "100%",
      padding: "16px",
      borderRadius: "50px",
      backgroundColor: hoveredBtn === "signup" ? colors.tealDark : colors.teal,
      border: "none",
      color: "#1a1a1a",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s ease",
      transform: hoveredBtn === "signup" ? "translateY(-1px)" : "translateY(0)",
      boxShadow: hoveredBtn === "signup" ? "0 8px 24px rgba(93,235,215,0.35)" : "0 4px 12px rgba(93,235,215,0.2)",
      fontFamily: "'DM Sans', sans-serif",
      letterSpacing: "0.2px",
    },
    googleBtn: {
      width: "100%",
      padding: "14px 16px",
      borderRadius: "50px",
      border: `1.5px solid ${hoveredBtn === "google" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)"}`,
      color: colors.text,
      fontSize: "15px",
      fontWeight: "500",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
      transform: hoveredBtn === "google" ? "translateY(-1px)" : "translateY(0)",
      backgroundColor: hoveredBtn === "google" ? "rgba(255,255,255,0.05)" : "transparent",
      fontFamily: "'DM Sans', sans-serif",
    },
    loginLink: {
      marginTop: "8px",
      color: hoveredBtn === "login" ? colors.text : colors.muted,
      fontSize: "15px",
      fontWeight: "400",
      cursor: "pointer",
      transition: "color 0.2s ease",
      background: "none",
      border: "none",
      fontFamily: "'DM Sans', sans-serif",
      padding: "8px",
    },
    formContainer: {
      width: "100%",
      animation: "fadeSlideUp 0.4s ease forwards",
    },
    backBtn: {
      position: "absolute",
      top: "28px",
      left: "28px",
      background: "none",
      border: "none",
      color: colors.muted,
      cursor: "pointer",
      fontSize: "22px",
      padding: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      transition: "all 0.2s",
    },
    formTitle: {
      fontSize: "24px",
      fontWeight: "700",
      color: colors.text,
      marginBottom: "8px",
      fontFamily: "'DM Sans', sans-serif",
      letterSpacing: "-0.3px",
    },
    formSubtitle: {
      fontSize: "14px",
      color: colors.muted,
      marginBottom: "32px",
      fontFamily: "'DM Sans', sans-serif",
    },
    inputGroup: {
      marginBottom: "16px",
    },
    inputLabel: {
      display: "block",
      fontSize: "12px",
      fontWeight: "600",
      color: colors.muted,
      marginBottom: "8px",
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      fontFamily: "'DM Sans', sans-serif",
    },
    input: (name) => ({
      width: "100%",
      padding: "14px 16px",
      borderRadius: "14px",
      backgroundColor: colors.inputBg,
      border: `1.5px solid ${focused === name ? colors.teal : "transparent"}`,
      color: colors.text,
      fontSize: "15px",
      outline: "none",
      transition: "all 0.2s ease",
      fontFamily: "'DM Sans', sans-serif",
      boxSizing: "border-box",
      boxShadow: focused === name ? `0 0 0 4px rgba(93,235,215,0.1)` : "none",
    }),
    submitBtn: (hov) => ({
      width: "100%",
      padding: "16px",
      borderRadius: "50px",
      backgroundColor: hov ? colors.tealDark : colors.teal,
      border: "none",
      color: "#1a1a1a",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s ease",
      marginTop: "8px",
      transform: hov ? "translateY(-1px)" : "translateY(0)",
      boxShadow: hov ? "0 8px 24px rgba(93,235,215,0.35)" : "0 4px 12px rgba(93,235,215,0.2)",
      fontFamily: "'DM Sans', sans-serif",
    }),
    divider: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      margin: "20px 0",
    },
    dividerLine: {
      flex: 1,
      height: "1px",
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    dividerText: {
      color: colors.muted,
      fontSize: "12px",
      fontFamily: "'DM Sans', sans-serif",
    },
    switchText: {
      textAlign: "center",
      color: colors.muted,
      fontSize: "14px",
      marginTop: "20px",
      fontFamily: "'DM Sans', sans-serif",
    },
    switchLink: {
      color: colors.teal,
      cursor: "pointer",
      fontWeight: "600",
      background: "none",
      border: "none",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "14px",
      padding: 0,
    },
  };

  // ─── Landing Screen ───────────────────────────────────────────────────────────
  const LandingScreen = () => (
    <>
      <div style={styles.gradientOrb} />
      <div style={styles.logoContainer}>
        <img src={logo} alt="Ponytail" style={styles.logoImage} />
        <div style={styles.logoText}>ponytail</div>
        <div style={styles.tagline}>the social music platform.</div>
      </div>

      <div style={styles.buttonsContainer}>
        <button
          style={styles.signupBtn}
          onMouseEnter={() => setHoveredBtn("signup")}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => setScreen("signup")}
        >
          Sign up
        </button>

        <button
          style={styles.googleBtn}
          onMouseEnter={() => setHoveredBtn("google")}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <button
          style={styles.loginLink}
          onMouseEnter={() => setHoveredBtn("login")}
          onMouseLeave={() => setHoveredBtn(null)}
          onClick={() => setScreen("login")}
        >
          Log in
        </button>
      </div>
    </>
  );

  // ─── Signup Screen ────────────────────────────────────────────────────────────
  const SignupScreen = () => {
    const handleSignup = async () => {
      try {
        const data = await register(form.email, form.username, form.password);
        console.log('Registered successfully:', data.user);
        alert('Account created! Welcome to Ponytail.');
      } catch (err) {
        const message = err.response?.data?.error || 'Something went wrong.';
        alert(message);
      }
    };

    return (
      <div style={styles.formContainer}>
        <button style={styles.backBtn} onClick={() => setScreen("landing")}>←</button>
        <div style={{ marginTop: "20px" }}>
          <div style={styles.formTitle}>Create account</div>
          <div style={styles.formSubtitle}>Join the social music platform</div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Username</label>
            <input
              style={styles.input("username")}
              placeholder="@yourname"
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              onFocus={() => setFocused("username")}
              onBlur={() => setFocused(null)}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Email</label>
            <input
              style={styles.input("email")}
              placeholder="you@example.com"
              type="email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Password</label>
            <input
              style={styles.input("password")}
              placeholder="Min. 8 characters"
              type="password"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
            />
          </div>

          <button
            style={styles.submitBtn(hoveredBtn === "submit")}
            onMouseEnter={() => setHoveredBtn("submit")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={handleSignup}
          >
            Create account
          </button>

          <div style={styles.divider}>
            <div style={styles.dividerLine}/>
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine}/>
          </div>

          <button
            style={{...styles.googleBtn, justifyContent: "center"}}
            onMouseEnter={() => setHoveredBtn("google2")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div style={styles.switchText}>
            Already have an account?{" "}
            <button style={styles.switchLink} onClick={() => setScreen("login")}>Log in</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Login Screen ─────────────────────────────────────────────────────────────
  const LoginScreen = () => {
    const handleLogin = async () => {
      try {
        const data = await login(form.email, form.password);
        console.log('Logged in successfully:', data.user);
        alert('Welcome back!');
      } catch (err) {
        const message = err.response?.data?.error || 'Invalid email or password.';
        alert(message);
      }
    };

    return (
      <div style={styles.formContainer}>
        <button style={styles.backBtn} onClick={() => setScreen("landing")}>←</button>
        <div style={{ marginTop: "20px" }}>
          <div style={styles.formTitle}>Welcome back</div>
          <div style={styles.formSubtitle}>Log in to your account</div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Email</label>
            <input
              style={styles.input("email")}
              placeholder="you@example.com"
              type="email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Password</label>
            <input
              style={styles.input("password")}
              placeholder="Your password"
              type="password"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
            />
          </div>

          <div style={{ textAlign: "right", marginBottom: "20px", marginTop: "-8px" }}>
            <button style={{ background: "none", border: "none", color: colors.teal, fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Forgot password?
            </button>
          </div>

          <button
            style={styles.submitBtn(hoveredBtn === "submit")}
            onMouseEnter={() => setHoveredBtn("submit")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={handleLogin}
          >
            Log in
          </button>

          <div style={styles.divider}>
            <div style={styles.dividerLine}/>
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine}/>
          </div>

          <button
            style={{...styles.googleBtn, justifyContent: "center"}}
            onMouseEnter={() => setHoveredBtn("google2")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div style={styles.switchText}>
            Don't have an account?{" "}
            <button style={styles.switchLink} onClick={() => setScreen("signup")}>Sign up</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Root Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #111; }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
      <div style={styles.wrapper}>
        <div style={styles.phone}>
          {screen === "landing" && <LandingScreen />}
          {screen === "signup" && <SignupScreen />}
          {screen === "login" && <LoginScreen />}
        </div>
      </div>
    </>
  );
}