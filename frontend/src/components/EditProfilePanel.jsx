import { useState, useEffect } from "react";
import { getMe, updateProfile } from "../services/authService";
import { useUI } from "../context/UIContext";
import { GENRE_LIST, MOOD_LIST } from "../constants/musicTags";

// ─── Colors — matches SettingsPanel.jsx's palette ──────────────────────────────
const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  inputBg: "#2c2c2c",
  teal: "#5DEBD7",
  tealDark: "#3ecfba",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#888888",
  border: "rgba(255,255,255,0.07)",
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Reusable pieces ────────────────────────────────────────────────────────────
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

// ─── Genre / subgenre picker — search box + wrapped chip grid, capped height
// with its own scroll so a long list doesn't blow out the whole form. Tapping
// the already-selected chip deselects it, same as onboarding's version. ──
const GenrePicker = ({ options, selected, onSelect }) => {
  const [query, setQuery] = useState("");
  const filtered = options.filter(g => g.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div>
      <PonytailInput
        placeholder="Search genres"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "8px",
        maxHeight: "160px", overflowY: "auto",
        marginTop: "10px", paddingRight: "2px",
      }}>
        {filtered.map(genre => {
          const hue = (GENRE_LIST.indexOf(genre) * 37 + 160) % 360;
          const isSelected = selected === genre;
          return (
            <div
              key={genre}
              onClick={() => onSelect(isSelected ? null : genre)}
              style={{
                padding: "7px 14px", borderRadius: "20px",
                background: isSelected
                  ? colors.tealGlow
                  : `linear-gradient(135deg, hsl(${hue}, 35%, 28%), hsl(${hue + 30}, 30%, 22%))`,
                border: isSelected ? `2px solid ${colors.teal}` : "2px solid transparent",
                fontSize: "12px", fontWeight: "500",
                color: isSelected ? colors.teal : colors.text,
                fontFamily: "'Kanit', sans-serif", cursor: "pointer",
              }}
            >
              {genre}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", padding: "6px 0" }}>
            No genres match your search.
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Mood picker — search-only, same pattern as onboarding's MoodStep but
// compact (no background art, capped result height). Starts pre-filled with
// the current mood so the field isn't blank on open. ──
const MoodPicker = ({ mood, setMood }) => {
  const [query, setQuery] = useState(mood || "");

  useEffect(() => { setQuery(mood || ""); }, [mood]);

  const trimmedQuery = query.trim().toLowerCase();
  const showResults = trimmedQuery.length > 0 && query !== mood;
  const filtered = showResults
    ? MOOD_LIST.filter(m => m.toLowerCase().includes(trimmedQuery))
    : [];

  const handleSelect = (m) => {
    setMood(m);
    setQuery(m);
  };

  return (
    <div>
      <PonytailInput
        placeholder="Search moods"
        value={query}
        onChange={e => { setQuery(e.target.value); if (e.target.value !== mood) setMood(null); }}
      />
      {showResults && (
        <div style={{ maxHeight: "180px", overflowY: "auto", marginTop: "10px" }}>
          {filtered.length > 0 ? filtered.map(m => (
            <div
              key={m}
              onClick={() => handleSelect(m)}
              style={{
                padding: "10px 12px", borderRadius: "10px", marginBottom: "6px",
                backgroundColor: mood === m ? colors.tealGlow : colors.bgCard,
                border: mood === m ? `1.5px solid ${colors.teal}` : "1.5px solid transparent",
                color: mood === m ? colors.teal : colors.text,
                fontSize: "13px", fontFamily: "'Kanit', sans-serif",
                cursor: "pointer",
              }}
            >
              {m}
            </div>
          )) : (
            <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", padding: "6px 0" }}>
              No moods match your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Edit Profile Panel — slides in over SettingsPanel (which renders it).
// Loads the logged-in user's current values on open, lets a listener change
// their display name, and — if is_artist — also lets them revisit every answer
// from musician onboarding (artist name, location, genre, subgenre, mood,
// sound description) without deleting and recreating the account. ──
export default function EditProfilePanel({ isOpen, onClose }) {
  const { setUser } = useUI();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [username, setUsername] = useState("");
  const [isArtist, setIsArtist] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [genre, setGenre] = useState(null);
  const [subgenre, setSubgenre] = useState(null);
  const [mood, setMood] = useState(null);
  const [soundDescription, setSoundDescription] = useState("");

  // ── Load the current values fresh every time the panel opens ──
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSaved(false);
    const load = async () => {
      setLoading(true);
      try {
        const me = await getMe();
        setUsername(me.username || "");
        setIsArtist(!!me.is_artist);
        setDisplayName(me.display_name || "");
        setLocation(me.location || "");
        setGenre(me.genre || null);
        setSubgenre(me.subgenre || null);
        setMood(me.mood || null);
        setSoundDescription(me.sound_description || "");
      } catch (err) {
        console.log("Failed to load profile for editing:", err);
        setError("Could not load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  // ── Subgenre can't match genre — if the genre changes out from under an
  // already-picked subgenre, clear it rather than silently leaving a stale
  // duplicate selected. ──
  useEffect(() => {
    if (subgenre && subgenre === genre) setSubgenre(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("Please enter a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { display_name: displayName.trim() };
      if (isArtist) {
        payload.location = location.trim();
        payload.genre = genre;
        payload.subgenre = subgenre;
        payload.mood = mood;
        payload.sound_description = soundDescription.trim();
      }
      await updateProfile(payload);
      // ── Keep the shared UIContext user in sync so ProfilePanel reflects the
      // change immediately without needing its own refetch. ──
      setUser(prev => ({ ...(prev || {}), ...payload }));
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
          Edit Profile
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {loading ? (
          <div style={{ color: colors.muted, fontSize: "14px", fontFamily: "'Kanit', sans-serif", textAlign: "center", paddingTop: "40px" }}>
            Loading your profile...
          </div>
        ) : (
          <>
            {username && (
              <div style={{ fontSize: "12px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginBottom: "20px" }}>
                @{username}
              </div>
            )}

            <FieldLabel>{isArtist ? "Artist / Stage Name" : "Display Name"}</FieldLabel>
            <PonytailInput
              placeholder="Your name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />

            {isArtist && (
              <>
                <FieldLabel top>Location</FieldLabel>
                <PonytailInput
                  placeholder="Your city"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />

                <FieldLabel top>Genre</FieldLabel>
                <GenrePicker options={GENRE_LIST} selected={genre} onSelect={setGenre} />

                <FieldLabel top>Subgenre</FieldLabel>
                <GenrePicker options={GENRE_LIST.filter(g => g !== genre)} selected={subgenre} onSelect={setSubgenre} />

                <FieldLabel top>Mood</FieldLabel>
                <MoodPicker mood={mood} setMood={setMood} />

                <FieldLabel top>Sound Description</FieldLabel>
                <PonytailInput
                  placeholder="A few words about your sound"
                  value={soundDescription}
                  maxLength={30}
                  onChange={e => setSoundDescription(e.target.value.slice(0, 30))}
                />
                <div style={{ fontSize: "11px", color: colors.muted, fontFamily: "'Kanit', sans-serif", marginTop: "6px", textAlign: "right" }}>
                  {30 - soundDescription.length} characters left
                </div>
              </>
            )}

            {error && (
              <div style={{ color: "#ff6b6b", fontSize: "13px", fontFamily: "'Kanit', sans-serif", marginTop: "18px" }}>
                {error}
              </div>
            )}
            {saved && (
              <div style={{ color: colors.teal, fontSize: "13px", fontFamily: "'Kanit', sans-serif", marginTop: "18px" }}>
                Saved!
              </div>
            )}

            <div style={{ marginTop: "26px" }}>
              <button
                onClick={handleSave}
                disabled={saving || !displayName.trim()}
                style={{
                  width: "100%", padding: "13px", borderRadius: "50px", border: "none",
                  backgroundColor: (saving || !displayName.trim()) ? "rgba(93,235,215,0.3)" : colors.teal,
                  color: (saving || !displayName.trim()) ? "rgba(26,26,26,0.5)" : "#1a1a1a",
                  fontSize: "15px", fontWeight: "600",
                  cursor: (saving || !displayName.trim()) ? "not-allowed" : "pointer",
                  fontFamily: "'Kanit', sans-serif", transition: "all 0.2s ease",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
            <div style={{ height: "30px" }} />
          </>
        )}
      </div>
    </div>
  );
}
