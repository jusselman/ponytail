import { useState, useEffect, useRef, useMemo } from "react";
import {
  STARTER_FONTS, MORE_FONTS, ALL_FONTS, DEFAULT_STATION_STYLE,
  loadStationFonts, fontStack, fontWeightFor, fontScaleFor, neonSign, randomStationStyle,
  isHexColor, hexToRgb, rgbToHex, hsvToRgb, rgbToHsv,
} from '../constants/stationFonts';

// ─── Edit Station Name ────────────────────────────────────────────────────────
// A sheet that slides up over the Radio screen's Station Panel. The listener
// can rename the station (unless its name is locked — Hot in Here always
// keeps its name) and restyle its sign: pick a font from the list, pick any
// color, or hit "Surprise me" for a random pair. Nothing is applied until
// Save.
//
// Props:
//   stationName   current name
//   nameLocked    true → the name is shown but can't be edited
//   lockedHint    one line explaining why (shown under the locked name)
//   initialStyle  { font, color }
//   onSave        ({ name, font, color }) => void | Promise
//   onCancel      () => void
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  bg: "#222222",
  bgCard: "#2a2a2a",
  bgCardHover: "#303030",
  teal: "#5DEBD7",
  tealGlow: "rgba(93,235,215,0.15)",
  text: "#ffffff",
  textSecondary: "#aaaaaa",
  muted: "#666666",
  border: "rgba(255,255,255,0.07)",
};
const kanit = "'Kanit', sans-serif";

const PRESET_COLORS = ["#ffff4d", "#5debd7", "#44f729", "#ff5ad1", "#ff8a1f", "#ff3b30", "#4d6bff", "#b46bff", "#ffffff"];

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

const LockIcon = ({ color = colors.muted }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2" />
    <path d="M8 11V8a4 4 0 018 0v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const inputStyle = (focused) => ({
  width: "100%", padding: "12px 14px", borderRadius: "12px", backgroundColor: colors.bgCard,
  border: `1.5px solid ${focused ? colors.teal : "transparent"}`,
  color: colors.text, fontSize: "14px", outline: "none", fontFamily: kanit, boxSizing: "border-box",
  boxShadow: focused ? "0 0 0 3px rgba(93,235,215,0.1)" : "none", transition: "all 0.2s ease",
});

const pillStyle = (disabled) => ({
  padding: "8px 14px", borderRadius: "20px", border: `1px solid ${disabled ? colors.border : colors.teal}`,
  backgroundColor: disabled ? "transparent" : colors.tealGlow, color: disabled ? colors.muted : colors.teal,
  fontSize: "12px", fontWeight: "600", fontFamily: kanit, cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap",
});

// ─── Drag helper: calls onMove with the pointer's 0–1 position inside the
// element for as long as the mouse button / finger is down ──
function useDragArea(onMove) {
  const ref = useRef(null);
  const report = (clientX, clientY) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    onMove(
      Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    );
  };
  const start = (e) => {
    e.preventDefault();
    const point = (ev) => (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
    const first = point(e);
    report(first.clientX, first.clientY);
    const move = (ev) => { const p = point(ev); report(p.clientX, p.clientY); };
    const stop = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', stop);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', stop);
  };
  return { ref, onMouseDown: start, onTouchStart: start };
}

// ─── Color picker — a shade square, a hue strip, a hex box and a few presets ──
const ColorPicker = ({ color, onChange }) => {
  // Hue and saturation are kept separately from the hex: greys and black
  // have no hue of their own, and the sliders shouldn't jump when you pass
  // through them.
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(color)));
  const [hexText, setHexText] = useState(color);

  // Follow the color when it changes from outside (Surprise me, presets)
  useEffect(() => {
    if (rgbToHex(hsvToRgb(hsv.h, hsv.s, hsv.v)) !== color.toLowerCase()) setHsv(rgbToHsv(hexToRgb(color)));
    setHexText(color);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  const apply = (next) => {
    setHsv(next);
    onChange(rgbToHex(hsvToRgb(next.h, next.s, next.v)));
  };

  const shade = useDragArea((x, y) => apply({ h: hsv.h, s: x, v: 1 - y }));
  const hue = useDragArea((x) => apply({ h: x * 360, s: hsv.s, v: hsv.v }));
  const pureHue = rgbToHex(hsvToRgb(hsv.h, 1, 1));

  return (
    <div style={{ backgroundColor: colors.bgCard, borderRadius: "14px", padding: "12px", marginTop: "10px", flexShrink: 0 }}>
      {/* Shade square: saturation left→right, brightness top→bottom */}
      <div
        {...shade}
        style={{
          position: "relative", height: "112px", borderRadius: "10px", cursor: "crosshair", touchAction: "none",
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHue})`,
        }}
      >
        <div style={{
          position: "absolute", left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, transform: "translate(-50%, -50%)",
          width: "16px", height: "16px", borderRadius: "50%", border: "2.5px solid #fff", boxShadow: "0 0 0 1.5px rgba(0,0,0,0.6)",
          backgroundColor: color, pointerEvents: "none",
        }} />
      </div>

      {/* Hue strip */}
      <div
        {...hue}
        style={{
          position: "relative", height: "14px", borderRadius: "7px", marginTop: "12px", cursor: "pointer", touchAction: "none",
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        <div style={{
          position: "absolute", left: `${(hsv.h / 360) * 100}%`, top: "50%", transform: "translate(-50%, -50%)",
          width: "18px", height: "18px", borderRadius: "50%", border: "2.5px solid #fff", boxShadow: "0 0 0 1.5px rgba(0,0,0,0.6)",
          backgroundColor: pureHue, pointerEvents: "none",
        }} />
      </div>

      {/* Hex + presets */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
        <input
          value={hexText}
          onChange={(e) => {
            const v = e.target.value.trim();
            setHexText(v);
            const withHash = v.startsWith("#") ? v : `#${v}`;
            if (isHexColor(withHash)) onChange(withHash.toLowerCase());
          }}
          onBlur={() => setHexText(color)}
          maxLength={7}
          spellCheck={false}
          style={{
            width: "70px", padding: "7px 8px", borderRadius: "8px", backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
            color: colors.text, fontSize: "12px", fontFamily: kanit, outline: "none", textTransform: "uppercase", flexShrink: 0,
          }}
        />
        <div style={{ display: "flex", gap: "5px", flex: 1, justifyContent: "flex-end" }}>
          {PRESET_COLORS.map((c) => (
            <div
              key={c}
              onClick={() => onChange(c)}
              title={c}
              style={{
                width: "18px", height: "18px", borderRadius: "50%", backgroundColor: c, cursor: "pointer", boxSizing: "border-box", flexShrink: 0,
                border: color.toLowerCase() === c ? "2px solid #fff" : "2px solid transparent",
                boxShadow: color.toLowerCase() === c ? `0 0 8px ${c}` : "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default function StationNameEditor({ stationName, nameLocked = false, lockedHint, initialStyle, onSave, onCancel }) {
  const start = initialStyle || DEFAULT_STATION_STYLE;
  const [name, setName] = useState(stationName || "");
  const [font, setFont] = useState(ALL_FONTS.includes(start.font) ? start.font : DEFAULT_STATION_STYLE.font);
  const [color, setColor] = useState(isHexColor(start.color) ? start.color.toLowerCase() : DEFAULT_STATION_STYLE.color);
  const [query, setQuery] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  // "More Fonts" has been tapped — or the station already uses one of them
  const [showMore, setShowMore] = useState(MORE_FONTS.includes(start.font));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const rowRefs = useRef({});
  const listRef = useRef(null);

  const trimmedQuery = query.trim().toLowerCase();
  const available = useMemo(() => (showMore ? ALL_FONTS : STARTER_FONTS), [showMore]);
  // Searching looks through every font, including the ones behind "More Fonts"
  const visibleFonts = useMemo(
    () => (trimmedQuery ? ALL_FONTS.filter(f => f.toLowerCase().includes(trimmedQuery)) : available),
    [trimmedQuery, available]
  );

  useEffect(() => { loadStationFonts(visibleFonts); }, [visibleFonts]);
  useEffect(() => { loadStationFonts([font]); }, [font]);

  // ── Scroll the font list (and only the list) to a font's row. Not
  // scrollIntoView: that also scrolls the phone frame itself, which drags
  // the off-screen panels parked below it into view. ──
  const scrollToFont = (target, { smooth = true, align = "center" } = {}) => {
    const list = listRef.current;
    const el = rowRefs.current[target];
    if (!list || !el) return;
    const top = align === "start" ? el.offsetTop : el.offsetTop - (list.clientHeight - el.offsetHeight) / 2;
    if (list.scrollTo) list.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
    else list.scrollTop = Math.max(0, top);
  };

  // Bring the chosen font into view when the sheet opens
  useEffect(() => {
    scrollToFont(font, { smooth: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewText = (name.trim() || "Station name").toUpperCase();
  const canSave = !!name.trim() && !saving;

  const handleSurprise = () => {
    const next = randomStationStyle(available);
    setFont(next.font);
    setColor(next.color);
    setQuery("");
    // wait for the (possibly unfiltered) list to render, then scroll to it
    setTimeout(() => scrollToFont(next.font), 60);
  };

  const handleMore = () => {
    if (showMore) return;
    setShowMore(true);
    setQuery("");
    setTimeout(() => scrollToFont(MORE_FONTS[0], { align: "start" }), 60);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), font, color });
    } finally {
      setSaving(false);
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
          <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, fontFamily: kanit }}>Edit Station Name</div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", width: "26px", justifyContent: "flex-end" }}>
            <XIcon />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "14px 20px 0" }}>
          {/* Live preview of the sign */}
          <div style={{
            flexShrink: 0, height: "62px", borderRadius: "14px", backgroundColor: "#161616", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 14px", marginBottom: "10px",
          }}>
            <div style={{
              ...neonSign(color, 5), fontFamily: fontStack(font), fontWeight: fontWeightFor(font),
              fontSize: `${Math.round(27 * fontScaleFor(font))}px`, lineHeight: 1.1, whiteSpace: "nowrap", textAlign: "center",
            }}>
              {previewText}
            </div>
          </div>

          {/* Name */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <input
              style={{ ...inputStyle(nameFocused && !nameLocked), paddingRight: nameLocked ? "38px" : "14px", color: nameLocked ? colors.textSecondary : colors.text }}
              placeholder="Station name"
              value={name}
              readOnly={nameLocked}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
            {nameLocked && (
              <div style={{ position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}>
                <LockIcon />
              </div>
            )}
          </div>
          {nameLocked && lockedHint && (
            <div style={{ fontSize: "11px", color: colors.muted, fontFamily: kanit, margin: "6px 2px 0", flexShrink: 0 }}>{lockedHint}</div>
          )}

          {/* Font search */}
          <div style={{ position: "relative", marginTop: "10px", flexShrink: 0 }}>
            <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
              <SearchIcon color={searchFocused ? colors.teal : "#666"} />
            </div>
            <input
              style={{ ...inputStyle(searchFocused), padding: "12px 38px 12px 40px" }}
              placeholder="Search fonts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
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

          {/* Color · Surprise me · More Fonts */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", flexShrink: 0 }}>
            <button
              onClick={() => setPickerOpen(v => !v)}
              title="Pick a color"
              style={{
                width: "44px", height: "34px", borderRadius: "10px", backgroundColor: color, cursor: "pointer", flexShrink: 0,
                border: `2px solid ${pickerOpen ? colors.teal : "rgba(255,255,255,0.85)"}`,
                boxShadow: pickerOpen ? "0 0 0 3px rgba(93,235,215,0.15)" : `0 0 10px ${color}66`,
              }}
            />
            <div onClick={handleSurprise} style={pillStyle(false)}>Surprise me</div>
            <div onClick={handleMore} style={pillStyle(showMore)}>{showMore ? "All fonts shown" : "More Fonts"}</div>
          </div>

          {pickerOpen && <ColorPicker color={color} onChange={setColor} />}

          {/* Font list */}
          <div ref={listRef} style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", paddingBottom: "8px" }}>
            {visibleFonts.length === 0 && (
              <div style={{ padding: "18px 0", textAlign: "center", fontSize: "13px", color: colors.muted, fontFamily: kanit, backgroundColor: colors.bgCard, borderRadius: "10px" }}>
                No fonts match "{query.trim()}"
              </div>
            )}
            {visibleFonts.map((f) => {
              const selected = f === font;
              return (
                <div
                  key={f}
                  ref={(el) => { rowRefs.current[f] = el; }}
                  onClick={() => setFont(f)}
                  style={{
                    padding: "9px 12px 11px", borderRadius: "10px", cursor: "pointer", flexShrink: 0, overflow: "hidden",
                    backgroundColor: selected ? colors.bgCardHover : colors.bgCard,
                    border: `1.5px solid ${selected ? colors.teal : "transparent"}`,
                    transition: "background-color 0.15s ease, border-color 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "11px", color: selected ? colors.teal : colors.textSecondary, fontFamily: kanit }}>{f}</span>
                    {selected && <span style={{ fontSize: "10px", fontWeight: "600", color: colors.teal, fontFamily: kanit }}>Selected</span>}
                  </div>
                  <div style={{
                    ...neonSign(color, 4), fontFamily: fontStack(f), fontWeight: fontWeightFor(f),
                    fontSize: `${Math.round(21 * fontScaleFor(f))}px`, lineHeight: 1.25, whiteSpace: "nowrap", padding: "2px 4px",
                  }}>
                    {previewText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save / Cancel */}
        <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${colors.border}`, flexShrink: 0 }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              width: "100%", padding: "13px", borderRadius: "12px", border: "none",
              backgroundColor: canSave ? colors.teal : "#3a3a3a", color: canSave ? "#102a26" : colors.muted,
              fontSize: "15px", fontWeight: "600", fontFamily: kanit, cursor: canSave ? "pointer" : "default",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <div onClick={onCancel} style={{ textAlign: "center", fontSize: "13px", color: colors.textSecondary, fontFamily: kanit, marginTop: "10px", cursor: "pointer" }}>
            Cancel
          </div>
        </div>
      </div>
    </div>
  );
}
