// stationFonts.js
// Everything the Radio screen needs to style a station's neon sign: the
// fonts a listener can pick from, loading them from Google Fonts on demand,
// and turning one picked color into the three colors a neon sign uses.

// ─── Fonts shown in the "Edit Station Name" sheet straight away ──
export const STARTER_FONTS = [
  "Permanent Marker", "Kalam", "Press Start 2P", "Ribeye Marrow", "Sriracha", "Passion One",
  "Chewy", "Bevan", "Titan One", "Wallpoet", "Mystery Quest", "Creepster", "Rubik Glitch",
  "Abril Fatface", "Pacifico", "Bungee Shade", "Courgette", "Sancreek", "Berkshire Swash",
  "Rubik Wet Paint", "Fredoka", "Kranky", "Vast Shadow", "Amatic SC", "Frijole", "Lobster",
  "Lobster Two", "Dancing Script", "Nosifer", "Fjalla One", "Rubik Beastly", "Alfa Slab One",
  "Special Elite", "Rye", "Satisfy", "Sacramento", "Sedgwick Ave Display", "Rock Salt",
  "Shrikhand", "Yellowtail", "Bangers", "Great Vibes", "Caveat", "Bungee Inline",
  "Shadows Into Light", "Cherry Swash", "Ewert", "Righteous", "Merienda", "Ultra", "Monoton",
];

// ─── Added to the list by "More Fonts" (the ones not already above) ──
export const MORE_FONTS = [
  "Faster One", "Boogaloo", "Fascinate", "Sigmar One", "Kaushan Script",
  "Fredericka the Great", "Bungee", "Patrick Hand", "Luckiest Guy", "Griffy",
];

export const ALL_FONTS = [...STARTER_FONTS, ...MORE_FONTS];

export const DEFAULT_STATION_STYLE = { font: "Permanent Marker", color: "#ffff4d" };

// ─── Fonts that ship a bold cut, which reads better as a sign. Everything
// else only has (or looks right at) its regular weight. ──
const BOLD_FONTS = new Set(["Kalam", "Amatic SC", "Caveat", "Dancing Script", "Fredoka", "Lobster Two", "Merienda", "Passion One"]);
export const fontWeightFor = (font) => (BOLD_FONTS.has(font) ? 700 : 400);

// ─── Very wide fonts get shrunk so a station name still fits the sign ──
const FONT_SCALE = {
  "Press Start 2P": 0.5, "Nosifer": 0.55, "Bungee Shade": 0.62, "Monoton": 0.66, "Vast Shadow": 0.66,
  "Frijole": 0.66, "Rock Salt": 0.66, "Ewert": 0.7, "Wallpoet": 0.72, "Faster One": 0.7,
  "Bungee": 0.7, "Bungee Inline": 0.7, "Rubik Glitch": 0.78, "Rubik Wet Paint": 0.78, "Rubik Beastly": 0.78,
  "Alfa Slab One": 0.78, "Ultra": 0.76, "Sigmar One": 0.76, "Bevan": 0.8, "Rye": 0.8, "Sancreek": 0.8,
  "Fredericka the Great": 0.8, "Special Elite": 0.8, "Titan One": 0.84, "Luckiest Guy": 0.84,
  "Shrikhand": 0.84, "Abril Fatface": 0.88, "Fascinate": 0.85, "Cherry Swash": 0.88, "Ribeye Marrow": 0.85,
  // Thin/condensed scripts can afford to be a little bigger
  "Amatic SC": 1.2, "Sacramento": 1.15, "Great Vibes": 1.1,
};
export const fontScaleFor = (font) => FONT_SCALE[font] || 1;

export const fontStack = (font) => `'${font}', 'Permanent Marker', 'Kanit', sans-serif`;

// ─── Load fonts from Google Fonts the first time they're needed. One <link>
// per family, so a single family failing can never take the others down
// with it; the browser only downloads a font file once text actually uses it. ──
const requested = new Set();
export function loadStationFonts(fonts) {
  if (typeof document === "undefined") return;
  (fonts || []).forEach((font) => {
    if (!font || requested.has(font) || !ALL_FONTS.includes(font)) return;
    requested.add(font);
    const weight = fontWeightFor(font);
    const family = font.replace(/ /g, "+") + (weight !== 400 ? `:wght@${weight}` : "");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    document.head.appendChild(link);
  });
}

// ─── Color helpers ────────────────────────────────────────────────────────────
export const isHexColor = (s) => typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// h 0–360, s and v 0–1
export function hsvToRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
}

export function rgbToHsv({ r, g, b }) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });

// ─── One picked color → a neon sign: a pale version for the lit tube, a dark
// version for the outline behind it (paint-order draws the outline first),
// and the color itself for the glow. `stroke` is the outline width in px. ──
export function neonSign(color, stroke = 7) {
  const base = hexToRgb(isHexColor(color) ? color : DEFAULT_STATION_STYLE.color);
  const fill = rgbToHex(mix(base, { r: 255, g: 255, b: 255 }, 0.5));
  const outline = rgbToHex(mix(base, { r: 0, g: 0, b: 0 }, 0.62));
  const glow = (a) => `rgba(${base.r},${base.g},${base.b},${a})`;
  return {
    color: fill,
    WebkitTextStroke: `${stroke}px ${outline}`,
    paintOrder: "stroke fill",
    textShadow: `0 0 ${stroke * 2}px ${glow(0.95)}, 0 0 ${stroke * 5}px ${glow(0.65)}`,
  };
}

// ─── "Surprise me": any font on offer + a bright color from anywhere on the wheel ──
export function randomStationStyle(fonts) {
  const pool = fonts && fonts.length ? fonts : ALL_FONTS;
  const font = pool[Math.floor(Math.random() * pool.length)];
  const color = rgbToHex(hsvToRgb(Math.random() * 360, 0.75 + Math.random() * 0.25, 1));
  return { font, color };
}
