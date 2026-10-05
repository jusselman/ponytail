import { useState, useEffect, useRef } from "react";
import { searchCities } from '../services/placesService';

// ─── Set Your City ────────────────────────────────────────────────────────────
// A sheet that slides up over the Radio screen's Station Panel, opened from
// its location button. The listener searches for their city and taps it;
// the choice is saved to their account (PUT /api/places/home), so it sticks
// across sessions and devices, and Hot in Here retunes to within 10 miles of
// it. Discovery's "Near me" uses the same saved city.
//
// Props:
//   currentCity  label of the city in use now, e.g. "San Francisco, CA"
//   isDefault    true when that city is the app's assumption, not their pick
//   onPick       (city: { id, label, sub }) => void | Promise
//   onCancel     () => void
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  gold: "#f5cf00",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
};
const kanit = "'Kanit', sans-serif";

const SearchIcon = ({ color = "#666" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <path d="M16.5 16.5L21 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const XIcon = ({ color = colors.textSecondary, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PinIcon = ({ color = colors.gold, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="2" />
  </svg>
);

export default function CityPickerSheet({ currentCity, isDefault = false, onPick, onCancel }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // ── Put the cursor in the search box once the sheet has finished sliding
  // up. preventScroll matters: focusing an input that is still off-screen
  // makes the browser scroll the phone frame itself to chase it, which drags
  // the panels parked below the frame into view. ──
  useEffect(() => {
    const t = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus({ preventScroll: true });
    }, 340);
    return () => clearTimeout(t);
  }, []);

  // ── Debounced city search ──
  const trimmed = query.trim();
  useEffect(() => {
    if (trimmed.length < 2) { setResults([]); setSearching(false); return undefined; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const cities = await searchCities(trimmed);
        if (!cancelled) { setResults(cities); setError(null); }
      } catch (err) {
        if (!cancelled) { setResults([]); setError("Couldn't search cities. Make sure the backend is running."); }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trimmed]);

  const handlePick = async (city) => {
    if (savingId) return;
    setSavingId(city.id);
    setError(null);
    try {
      await onPick(city);
    } catch (err) {
      setError("Couldn't save your city. Try again.");
      setSavingId(null);
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 260, backgroundColor: "rgba(0,0,0,0.55)", animation: "radioFade 0.2s ease" }}>
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, top: "44px",
        backgroundColor: colors.bg, borderRadius: "24px 24px 0 0",
        boxShadow: "0 -12px 40px rgba(0,0,0,0.6)", animation: "stationSheetUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`, flexShrink: 0,
        }}>
          <div style={{ width: "26px" }} />
          <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: kanit }}>Set Your City</div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", width: "26px", justifyContent: "flex-end" }}>
            <XIcon />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "16px 20px 0" }}>
          {/* Where the station is tuned now */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px",
            backgroundColor: colors.bgCard, flexShrink: 0,
          }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "rgba(245,207,0,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <PinIcon />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: "500", color: colors.text, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentCity || "No city set"}
              </div>
              <div style={{ fontSize: "11px", color: colors.textSecondary, fontFamily: kanit, fontWeight: "300" }}>
                {isDefault ? "Our starting guess. Pick your own below." : "Your city. Hot in Here plays artists within 10 miles."}
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginTop: "12px", flexShrink: 0 }}>
            <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
              <SearchIcon color={focused ? colors.teal : "#666"} />
            </div>
            <input
              ref={inputRef}
              style={{
                width: "100%", padding: "12px 38px 12px 40px", borderRadius: "12px", backgroundColor: colors.bgCard,
                border: `1.5px solid ${focused ? colors.teal : "transparent"}`,
                color: colors.text, fontSize: "14px", outline: "none", fontFamily: kanit, boxSizing: "border-box",
                boxShadow: focused ? "0 0 0 3px rgba(93,235,215,0.1)" : "none", transition: "all 0.2s ease",
              }}
              placeholder="Search for your city..."
              value={query}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {query.length > 0 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
              >
                <XIcon color="#666" size={14} />
              </button>
            )}
          </div>

          {error && (
            <div style={{ fontSize: "12px", color: "#ff6b6b", fontFamily: kanit, marginTop: "10px", flexShrink: 0 }}>{error}</div>
          )}

          {/* Results */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", paddingBottom: "12px" }}>
            {trimmed.length < 2 ? (
              <div style={{ padding: "18px 12px", textAlign: "center", fontSize: "12.5px", color: colors.muted, fontFamily: kanit, lineHeight: 1.5 }}>
                Type at least two letters to find your city. It's saved to your account, so you only do this once.
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: "18px 0", textAlign: "center", fontSize: "13px", color: colors.muted, fontFamily: kanit, backgroundColor: colors.bgCard, borderRadius: "10px" }}>
                {searching ? "Searching..." : `No cities match "${trimmed}"`}
              </div>
            ) : results.map((city) => {
              const saving = savingId === city.id;
              return (
                <div
                  key={city.id}
                  onClick={() => handlePick(city)}
                  style={{
                    display: "flex", alignItems: "center", gap: "11px", padding: "10px 12px", borderRadius: "10px", flexShrink: 0,
                    backgroundColor: saving ? colors.bgCardHover : colors.bgCard,
                    border: `1.5px solid ${saving ? colors.teal : "transparent"}`,
                    cursor: savingId ? "default" : "pointer", opacity: savingId && !saving ? 0.45 : 1,
                  }}
                  onMouseEnter={e => { if (!savingId) e.currentTarget.style.backgroundColor = colors.bgCardHover; }}
                  onMouseLeave={e => { if (!saving) e.currentTarget.style.backgroundColor = colors.bgCard; }}
                >
                  <div style={{ width: "30px", height: "30px", borderRadius: "8px", backgroundColor: "#353535", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <PinIcon size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: "500", color: colors.text, fontFamily: kanit, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{city.label}</div>
                    {city.sub && <div style={{ fontSize: "11px", fontWeight: "300", color: colors.textSecondary, fontFamily: kanit }}>{city.sub}</div>}
                  </div>
                  {saving && <span style={{ fontSize: "11px", fontWeight: "600", color: colors.teal, fontFamily: kanit }}>Saving...</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${colors.border}`, flexShrink: 0 }}>
          <div onClick={onCancel} style={{ textAlign: "center", fontSize: "13px", color: colors.textSecondary, fontFamily: kanit, cursor: "pointer", padding: "4px 0" }}>
            Cancel
          </div>
        </div>
      </div>
    </div>
  );
}
