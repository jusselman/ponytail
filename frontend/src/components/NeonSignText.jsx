import { neonSign } from '../constants/stationFonts';

// ─── A station name as a neon sign that can wrap onto several lines ──────────
// A neon sign is three things: a glow, a dark outline (a text stroke) and the
// lit tube (the fill). Drawn as one block of text, the browser paints them
// line by line, so a lower line's glow and outline land on top of the lines
// above it, washing their outlines in haze and making every line but the
// last look dimmer.
//
// So the sign is drawn three times in the same spot, one layer per part:
// every line's glow, then every line's outline, then every line's fill.
// All three share the same font, size and width, so they wrap identically,
// and every line comes out equally crisp and bright.
//
// Props:
//   color     the sign's color (hex), as picked in Edit Station Name
//   stroke    outline width in px (see neonSign)
//   style     the text's font, size, line height, alignment, padding and
//             transform. A transform is applied once, around all layers.
// ─────────────────────────────────────────────────────────────────────────────

export default function NeonSignText({ color, stroke = 7, style = {}, children }) {
  const neon = neonSign(color, stroke);
  const { transform, ...text } = style;
  const over = { ...text, position: "absolute", inset: 0 };
  return (
    <div style={{ position: "relative", transform }}>
      {/* 1. Glow, every line (this layer also sets the sign's size) */}
      <div aria-hidden="true" style={{ ...text, ...neon }}>{children}</div>
      {/* 2. Dark outline, every line, over all the glow */}
      <div aria-hidden="true" style={{ ...over, color: neon.color, WebkitTextStroke: neon.WebkitTextStroke, paintOrder: "stroke fill", textShadow: "none" }}>
        {children}
      </div>
      {/* 3. Lit fill, every line, on top */}
      <div style={{ ...over, color: neon.color, WebkitTextStroke: "0", textShadow: "none" }}>
        {children}
      </div>
    </div>
  );
}
