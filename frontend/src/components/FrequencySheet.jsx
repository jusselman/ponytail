import { useState, useEffect, useRef } from "react";

// ─── Choose a Frequency ───────────────────────────────────────────────────────
// A sheet that slides up over the Radio screen's Station Panel, opened by
// tapping the station's frequency. The listener drags the needle along the
// dial (or nudges it 0.1 at a time) to any spot that isn't already taken;
// a spot counts as taken when it sits within FREQUENCY_GAP of another station,
// so two stations can never land on top of each other.
//
// Props:
//   stations   the other stations on the dial: [{ id, name, position, hue }]
//   initial    the station's current frequency, or null for a new station
//   onSave     (position: number) => void | Promise  (throw to show an error)
//   onCancel   () => void, called once the sheet has slid back down, whether
//              it was dismissed or a frequency was saved
// ─────────────────────────────────────────────────────────────────────────────

export const FREQUENCY_MIN = 1;
export const FREQUENCY_MAX = 99.9;
export const FREQUENCY_GAP = 1;

const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  teal: "#5DEBD7",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  danger: "#ff6b6b",
  needle: "#ff3b30",
  border: "rgba(255,255,255,0.07)",
};
const kanit = "'Kanit', sans-serif";
const signFont = "'Knewave', 'Kanit', sans-serif";

const CLOSE_MS = 260;

const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n) => Math.min(FREQUENCY_MAX, Math.max(FREQUENCY_MIN, round1(n)));

// The station (if any) too close to `position` for another to sit there
export const stationBlocking = (position, stations) =>
  stations.find(s => Math.abs(s.position - position) < FREQUENCY_GAP - 0.05) || null;

// The free spot nearest to `position`, searching outward 0.1 at a time
export const nearestFreeFrequency = (position, stations) => {
  const start = clamp(position);
  for (let step = 0; step <= 1000; step += 1) {
    for (const candidate of [start + step / 10, start - step / 10]) {
      const spot = round1(candidate);
      if (spot >= FREQUENCY_MIN && spot <= FREQUENCY_MAX && !stationBlocking(spot, stations)) return spot;
    }
  }
  return start;
};

const XIcon = ({ color = colors.textSecondary, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const StepButton = ({ label, title, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: "38px", height: "38px", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.28)",
      backgroundColor: "rgba(255,255,255,0.06)", color: colors.text, fontSize: "20px", lineHeight: 1,
      fontFamily: kanit, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}
  >{label}</button>
);

export default function FrequencySheet({ stations = [], initial = null, onSave, onCancel }) {
  const [position, setPosition] = useState(() => (
    initial !== null && initial !== undefined ? clamp(initial) : nearestFreeFrequency(50, stations)
  ));
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const trackRef = useRef(null);
  // Closing plays the slide-down first, then tells the screen to remove it
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onCancel, CLOSE_MS);
  };

  const blocker = stationBlocking(position, stations);
  const unchanged = initial !== null && initial !== undefined && round1(initial) === position;
  const canSave = !blocker && !saving;

  const positionFromClientX = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return position;
    return clamp(((clientX - rect.left) / rect.width) * 100);
  };

  const move = (next) => { setError(null); setPosition(clamp(next)); };

  useEffect(() => {
    if (!dragging) return undefined;
    const pointX = (e) => (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
    const handleMove = (e) => move(positionFromClientX(pointX(e)));
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  // Arrow keys nudge the needle too
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') setPosition(p => clamp(p - 0.1));
      if (e.key === 'ArrowRight') setPosition(p => clamp(p + 0.1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const startDrag = (clientX) => { setDragging(true); move(positionFromClientX(clientX)); };

  const handleSave = async () => {
    if (!canSave) return;
    if (unchanged) { close(); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(position);
      close();
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't save that frequency. Try again.");
      setSaving(false);
    }
  };

  const readoutColor = blocker ? colors.danger : "#eef0ff";

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 260, backgroundColor: "rgba(0,0,0,0.55)",
      animation: closing ? `frequencyFadeOut ${CLOSE_MS}ms ease forwards` : "radioFade 0.2s ease",
    }}>
      <style>{`
        @keyframes frequencySheetDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes frequencyFadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
      <div onClick={close} style={{ position: "absolute", inset: 0 }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        backgroundColor: colors.bg, borderRadius: "24px 24px 0 0",
        boxShadow: "0 -12px 40px rgba(0,0,0,0.6)",
        animation: closing
          ? `frequencySheetDown ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`
          : "stationSheetUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${colors.border}`, flexShrink: 0,
        }}>
          <div style={{ width: "26px" }} />
          <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: kanit }}>Choose a Frequency</div>
          <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", width: "26px", justifyContent: "flex-end" }}>
            <XIcon />
          </button>
        </div>

        <div style={{ padding: "22px 20px 22px" }}>
          {/* Dial */}
          <div style={{ backgroundColor: colors.bgCard, borderRadius: "14px", padding: "16px 18px 10px" }}>
            <div
              ref={trackRef}
              onMouseDown={(e) => startDrag(e.clientX)}
              onTouchStart={(e) => startDrag(e.touches[0].clientX)}
              style={{ position: "relative", width: "100%", height: "56px", cursor: dragging ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }}
            >
              {[...Array(10)].map((_, i) => (
                <div key={i} style={{
                  position: "absolute", left: `${i * 10}%`, top: 0, transform: "translateX(-50%)",
                  fontSize: "9.5px", color: "rgba(255,255,255,0.75)", fontFamily: kanit, pointerEvents: "none",
                }}>
                  {i * 10}
                </div>
              ))}
              {[...Array(50)].map((_, i) => {
                const value = i * 2;
                const h = value % 10 === 0 ? 11 : 7;
                return (
                  <div key={i} style={{
                    position: "absolute", left: `${value}%`, top: `${29 - h}px`,
                    width: "1px", height: `${h}px`, backgroundColor: "rgba(255,255,255,0.6)", pointerEvents: "none",
                  }} />
                );
              })}
              <div style={{ position: "absolute", left: 0, right: 0, top: "43px", height: "1px", backgroundColor: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
              {/* The stations already on the dial */}
              {stations.map((s) => (
                <div
                  key={s.id}
                  title={`${s.name} · ${s.position.toFixed(1)} μHz`}
                  style={{
                    position: "absolute", left: `${s.position}%`, top: "43px", transform: "translate(-50%, -50%)",
                    width: 7, height: 7, borderRadius: "50%", pointerEvents: "none",
                    backgroundColor: `hsl(${s.hue}, 100%, 62%)`,
                    boxShadow: `0 0 6px hsl(${s.hue}, 100%, 60%), 0 0 12px hsl(${s.hue}, 100%, 55%)`,
                    opacity: blocker && blocker.id === s.id ? 1 : 0.85,
                  }}
                />
              ))}
              {/* Needle */}
              <div style={{
                position: "absolute", left: `${position}%`, top: 0, transform: "translateX(-50%)", pointerEvents: "none",
                transition: dragging ? "none" : "left 0.12s ease", display: "flex", flexDirection: "column", alignItems: "center",
              }}>
                <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${colors.needle}` }} />
                <div style={{ width: "2px", height: "45px", backgroundColor: colors.needle, marginTop: "-1px", boxShadow: "0 0 6px rgba(255,59,48,0.7)" }} />
              </div>
            </div>
          </div>

          {/* Readout + fine tuning */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", marginTop: "20px" }}>
            <StepButton label="−" title="Down 0.1" onClick={() => move(position - 0.1)} />
            <div style={{
              minWidth: "150px", textAlign: "center", fontFamily: signFont, fontSize: "30px", lineHeight: 1, color: readoutColor,
              WebkitTextStroke: `6px ${blocker ? "#7a1414" : "#1616c4"}`, paintOrder: "stroke fill",
              textShadow: blocker ? "0 0 12px rgba(255,80,80,0.8)" : "0 0 12px rgba(60,60,255,0.95), 0 0 26px rgba(60,60,255,0.6)",
            }}>
              {position.toFixed(1)} <span style={{ fontSize: "17px" }}>μHz</span>
            </div>
            <StepButton label="+" title="Up 0.1" onClick={() => move(position + 0.1)} />
          </div>

          {/* Is the spot free? */}
          <div style={{ marginTop: "12px", minHeight: "32px", textAlign: "center", fontSize: "12px", fontFamily: kanit, lineHeight: 1.35, color: error || blocker ? colors.danger : colors.textSecondary }}>
            {error
              || (blocker
                ? `Taken. ${blocker.name} sits at ${blocker.position.toFixed(1)} μHz, so pick a spot at least ${FREQUENCY_GAP} μHz away.`
                : "This spot is free. Drag the needle or use the buttons to fine tune.")}
          </div>

          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              width: "100%", marginTop: "10px", padding: "13px", borderRadius: "12px", border: "none",
              backgroundColor: canSave ? colors.teal : "#3a3a3a", color: canSave ? "#102a26" : colors.muted,
              fontSize: "15px", fontWeight: "600", fontFamily: kanit, cursor: canSave ? "pointer" : "default",
            }}
          >
            {saving ? "Saving..." : "Set Frequency"}
          </button>
          <button
            onClick={close}
            style={{ width: "100%", marginTop: "6px", padding: "10px", background: "none", border: "none", color: colors.textSecondary, fontSize: "13px", fontFamily: kanit, cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
