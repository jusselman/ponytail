import { useState, useRef, useEffect } from "react";
import { register, updateProfile } from '../services/authService';
import MiniPlayer from '../components/MiniPlayer';
import FooterNav from '../components/FooterNav';

// ─── Colors ───────────────────────────────────────────────────────────────────
const colors = {
  bg: "#222222",
  teal: "#5DEBD7",
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  muted: "#888888",
  inputBg: "#2c2c2c",
};

// ─── Next Button ──────────────────────────────────────────────────────────────
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
        placeholder="j.lebowski@yahoo.com" type="email"
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
const PasswordStep = ({ password, setPassword, onNext, loading }) => {
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
        <NextButton onPress={handleNext} label={loading ? "Creating account..." : "Next"} disabled={!password || !confirm || loading} />
      </div>
    </div>
  );
};

// ─── Step 3: Favorite Artists ─────────────────────────────────────────────────
const FavoriteArtistsStep = ({ onNext, loading }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);

  const searchArtists = async (q) => {
  if (!q || q.length < 2) { setSuggestions([]); return; }
  setSearching(true);
  try {
    const res = await fetch(`http://localhost:5000/api/auth/artists/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSuggestions((data.artists || []).map(a => ({
      id: a.id,
      name: a.name,
      disambiguation: a.disambiguation || null,
    })));
  } catch (err) {
    console.log('Artist search error:', err);
  } finally {
    setSearching(false);
  }
};

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchArtists(val), 350);
  };

  const handleSelect = (artist) => {
    if (selected.length >= 3 || selected.find(a => a.id === artist.id)) return;
    setSelected([...selected, artist]);
    setQuery(""); setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab" && suggestions.length > 0) { e.preventDefault(); handleSelect(suggestions[0]); }
  };

  return (
    <div style={{ width: "100%", animation: "fadeSlideUp 0.4s ease forwards" }}>
      <div style={{ fontSize: "22px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif", marginBottom: "8px", letterSpacing: "-0.2px", lineHeight: 1.3 }}>
        Give us three of your favorite bands or artists:
      </div>
      <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "24px" }}>
        Type to search, tap a suggestion or press Tab to select.
      </div>

      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          {selected.map(artist => (
            <div key={artist.id} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: colors.tealGlow, border: `1px solid ${colors.teal}`, borderRadius: "6px", padding: "6px 12px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: colors.teal, fontFamily: "'Kanit', sans-serif" }}>{artist.name}</span>
              <button onClick={() => setSelected(selected.filter(a => a.id !== artist.id))} style={{ background: "none", border: "none", color: colors.teal, cursor: "pointer", fontSize: "14px", padding: "0 2px", lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {selected.length < 3 && (
        <div style={{ position: "relative" }}>
          <input
            style={{ width: "100%", padding: "14px 16px", borderRadius: "6px", backgroundColor: colors.inputBg, border: `1.5px solid #FFFFFF`, color: colors.text, fontSize: "15px", outline: "none", fontFamily: "'Kanit', sans-serif", boxSizing: "border-box", boxShadow: focused ? `0 0 0 3px rgba(93,235,215,0.15)` : "none", transition: "box-shadow 0.2s ease" }}
            placeholder={`Artist ${selected.length + 1} of 3...`}
            value={query} onChange={handleQueryChange} onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
          />
          {suggestions.length > 0 && focused && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#2c2c2c", border: `1px solid rgba(255,255,255,0.15)`, borderRadius: "6px", marginTop: "4px", zIndex: 100, overflow: "hidden" }}>
              {suggestions.map((artist, i) => (
                <div key={artist.id} onMouseDown={() => handleSelect(artist)}
                  style={{ padding: "12px 16px", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? `1px solid rgba(255,255,255,0.07)` : "none", transition: "background 0.15s ease" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#383838"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: "'Kanit', sans-serif" }}>{artist.name}</div>
                  {artist.disambiguation && <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "2px" }}>{artist.disambiguation}</div>}
                </div>
              ))}
            </div>
          )}
          {searching && (
            <div style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif" }}>searching...</div>
          )}
        </div>
      )}

      <div style={{ marginTop: "28px" }}>
        <NextButton onPress={() => onNext(selected)} label={loading ? "Saving..." : "Next"} disabled={selected.length < 3 || loading} />
      </div>
    </div>
  );
};

// ─── Slide 4: Intro ───────────────────────────────────────────────────────────
const IntroSlide = ({ onNext, onSwipeUp }) => {
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (deltaY > 50) onSwipeUp();
    touchStartY.current = null;
  };
  const handleMouseDown = (e) => { mouseStartY.current = e.clientY; };
  const handleMouseUp = (e) => {
    if (mouseStartY.current === null) return;
    const deltaY = mouseStartY.current - e.clientY;
    if (deltaY > 50) onSwipeUp();
    mouseStartY.current = null;
  };

  return (
    <div
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", animation: "fadeSlideUp 0.5s ease forwards", userSelect: "none" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* ── Paragraphs at the top ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "40px" }}>
        <p style={{ fontSize: "16px", fontWeight: "400", color: colors.text, fontFamily: "'Kanit', sans-serif", lineHeight: 1.6, margin: 0 }}>
          {"     While we put together a starting collection for you, let's take a brief dive into what Ponytail is all about."}
        </p>
        <p style={{ fontSize: "16px", fontWeight: "400", color: colors.text, fontFamily: "'Kanit', sans-serif", lineHeight: 1.6, margin: 0 }}>
          {"     Ponytail is created by artists, for artists."}
        </p>
        <p style={{ fontSize: "16px", fontWeight: "400", color: colors.text, fontFamily: "'Kanit', sans-serif", lineHeight: 1.6, margin: 0 }}>
          {"     The way we music is a bit... "}
          <em>different</em>
          {". But we think you're gonna love it."}
        </p>
      </div>

      {/* ── Swipe instruction + Next button ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "14px", color: colors.muted, fontFamily: "'Kanit', sans-serif", fontStyle: "italic", lineHeight: 1.5 }}>
            Swipe up to learn more, or tap the Next button to jump straight into the app.
          </span>
        </div>

        {/* ── Chevrons ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", animation: "chevronPulse 1.5s ease-in-out infinite" }}>
          {[0, 1, 2].map(i => (
            <svg key={i} width="24" height="14" viewBox="0 0 24 14" fill="none" style={{ opacity: 1 - i * 0.25 }}>
              <path d="M2 12L12 2L22 12" stroke="#5DEBD7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ))}
          <span style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "4px", letterSpacing: "0.5px" }}>
            swipe up
          </span>
        </div>

        {/* ── Next button ── */}
        <NextButton onPress={onNext} label="Next" />
      </div>
    </div>
  );
};

// ─── Slide 5: Artist Background ───────────────────────────────────────────────
const ArtistSlide = ({ artist, onSwipeUp, setAppScreen }) => {
  const [coverUrl, setCoverUrl] = useState(null);
  const [bgLoaded, setBgLoaded] = useState(false);
  const touchStartY = useRef(null);
  const mouseStartY = useRef(null);

  // ── Fetch cover art from Cover Art Archive via MusicBrainz ──
  useEffect(() => {
    if (!artist?.id) return;
    const fetchCover = async () => {
      try {
        const relRes = await fetch(
          `https://musicbrainz.org/ws/2/release?artist=${artist.id}&limit=5&fmt=json`,
          { headers: { 'User-Agent': 'Ponytail/1.0 (ponytailapp@example.com)' } }
        );
        const relData = await relRes.json();
        const releases = relData.releases || [];
        for (const release of releases) {
          try {
            const coverRes = await fetch(
              `https://coverartarchive.org/release/${release.id}/front`,
              { method: 'HEAD' }
            );
            if (coverRes.ok) {
              setCoverUrl(`https://coverartarchive.org/release/${release.id}/front`);
              return;
            }
          } catch { continue; }
        }
      } catch (err) {
        console.log('Cover art fetch error:', err);
      }
    };
    fetchCover();
  }, [artist]);

  const hue = artist ? artist.name.charCodeAt(0) * 37 % 360 : 200;
  const gradientBg = `linear-gradient(160deg, hsl(${hue}, 40%, 20%) 0%, hsl(${hue + 40}, 30%, 12%) 100%)`;

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (deltaY > 50) onSwipeUp();
    touchStartY.current = null;
  };
  const handleMouseDown = (e) => { mouseStartY.current = e.clientY; };
  const handleMouseUp = (e) => {
    if (mouseStartY.current === null) return;
    const deltaY = mouseStartY.current - e.clientY;
    if (deltaY > 50) onSwipeUp();
    mouseStartY.current = null;
  };

  return (
    <div
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", animation: "fadeSlideUp 0.5s ease forwards", userSelect: "none" }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
    >
      {/* ── Background ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: coverUrl ? "none" : gradientBg,
        zIndex: 0,
      }}>
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            onLoad={() => setBgLoaded(true)}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity: bgLoaded ? 0.35 : 0,
              transition: "opacity 0.8s ease",
            }}
          />
        )}
        {/* Dark overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(34,34,34,0.5) 0%, rgba(34,34,34,0.85) 100%)" }} />
      </div>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px" }}>
        <div style={{ fontSize: "13px", color: colors.muted, fontFamily: "'Kanit', sans-serif", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>
          Based on your love of
        </div>
        <div style={{ fontSize: "32px", fontWeight: "700", color: colors.text, fontFamily: "'Kanit', sans-serif", textAlign: "center", letterSpacing: "-0.5px" }}>
          {artist?.name}
        </div>
        <div style={{ fontSize: "14px", color: colors.teal, fontFamily: "'Kanit', sans-serif", marginTop: "8px" }}>
          we've put together something special for you.
        </div>
      </div>

      {/* ── Swipe up chevrons ── */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", paddingBottom: "16px", animation: "chevronPulse 1.5s ease-in-out infinite" }}>
        {[0, 1, 2].map(i => (
          <svg key={i} width="24" height="14" viewBox="0 0 24 14" fill="none" style={{ opacity: 1 - i * 0.25 }}>
            <path d="M2 12L12 2L22 12" stroke="#5DEBD7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
        <span style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "4px", letterSpacing: "0.5px" }}>
          swipe up
        </span>
      </div>
    </div>
  );
};

// ─── Slide 6: Placeholder (next screen to be built) ──────────────────────────
const PlaceholderSlide = ({ setAppScreen }) => (
  <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeSlideUp 0.5s ease forwards" }}>
    <div style={{ fontSize: "18px", fontWeight: "600", color: colors.muted, fontFamily: "'Kanit', sans-serif", textAlign: "center", lineHeight: 1.5 }}>
      More onboarding content coming soon...
    </div>
    <div style={{ marginTop: "32px" }}>
      <NextButton onPress={() => setAppScreen("home")} label="Enter Ponytail" />
    </div>
  </div>
);

// ─── Root Onboarding Component ────────────────────────────────────────────────
export default function OnboardingScreen({ setScreen }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);

 const handleFinishSignup = async (selectedArtists) => {
  setLoading(true);
  try {
    const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    console.log('Attempting register with:', email, username);
    await register(email, username, password);
    console.log('Register succeeded');
    await updateProfile({ favorite_artists: selectedArtists });
    console.log('Profile updated, going to intro');
    setArtists(selectedArtists);
    setStep("intro");
  } catch (err) {
    console.log('Error caught:', err);
    const message = err.response?.data?.error || 'Something went wrong.';
    alert(message);
  } finally {
    setLoading(false);
  }
};

  // Slides that use the full phone frame height (no padding)
  const isFullHeightSlide = ["intro", "artist", "placeholder"].includes(step);

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
        @keyframes chevronPulse {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-6px); opacity: 0.6; }
        }
        input::placeholder { color: #555; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #2c2c2c inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      {/* ── Full viewport wrapper ── */}
      <div style={{
        minHeight: "100vh", width: "100%", backgroundColor: colors.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Kanit', sans-serif", padding: "20px",
      }}>

        {/* ── Phone frame ── */}
        <div style={{
          width: "375px",
          minHeight: "750px",
          height: isFullHeightSlide ? "750px" : "auto",
          backgroundColor: colors.bg,
          borderRadius: "40px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          justifyContent: isFullHeightSlide ? "flex-start" : "flex-start",
          padding: isFullHeightSlide ? "0" : "60px 32px 40px",
          position: "relative",
          overflow: "hidden",
        }}>

          {/* ── Form steps (with padding) ── */}
          {step === "email" && (
            <EmailStep email={email} setEmail={setEmail} onNext={() => setStep("password")} />
          )}
          {step === "password" && (
            <PasswordStep password={password} setPassword={setPassword} onNext={() => setStep("artists")} loading={loading} />
          )}
          {step === "artists" && (
            <FavoriteArtistsStep onNext={handleFinishSignup} loading={loading} />
          )}

          {/* ── Full height slides (no padding, include MiniPlayer + FooterNav) ── */}
          {step === "intro" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "60px 32px 0" }}>
              <IntroSlide
                onNext={() => setScreen("home")}
                onSwipeUp={() => setStep("artist")}
              />
            </div>
          )}

          {step === "artist" && (
            <>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <ArtistSlide
                  artist={artists[0]}
                  onSwipeUp={() => setStep("placeholder")}
                  setAppScreen={setScreen}
                />
              </div>
              <MiniPlayer track={{ title: "Your collection is loading...", artist: artists[0]?.name || "", album: "", coverUrl: null }} />
              <FooterNav activeTab="home" onTabPress={() => {}} />
            </>
          )}

          {step === "placeholder" && (
            <>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "60px 32px 20px" }}>
                <PlaceholderSlide setAppScreen={setScreen} />
              </div>
              <MiniPlayer track={{ title: "Your collection is loading...", artist: artists[0]?.name || "", album: "", coverUrl: null }} />
              <FooterNav activeTab="home" onTabPress={() => {}} />
            </>
          )}

        </div>
      </div>
    </>
  );
}