import { useState, useLayoutEffect, useEffect, useRef } from 'react';
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

// ─── A neon sign that always fits its box ────────────────────────────────────
// The Radio screen gives the station name a box of fixed height, so a long
// name can never push the frequency, dial or cover down. The text starts at
// maxSize and steps down one pixel at a time until it fits (never below
// minSize). It's measured with an invisible copy of the text in the same
// spot, and measured again once web fonts finish loading, since a font
// arriving late changes how much room the name takes.
//
// Props: as NeonSignText, plus
//   maxSize    largest font size to try, px
//   minSize    smallest font size allowed, px
//   maxHeight  the height the text has to fit in, px
export function FittedNeonSignText({ color, stroke, style = {}, maxSize, minSize = 14, maxHeight, children }) {
  const measureRef = useRef(null);
  const [size, setSize] = useState(maxSize);
  const [fontsTick, setFontsTick] = useState(0);

  useEffect(() => {
    const fonts = typeof document !== 'undefined' ? document.fonts : null;
    if (!fonts || !fonts.addEventListener) return undefined;
    const bump = () => setFontsTick(t => t + 1);
    fonts.addEventListener('loadingdone', bump);
    return () => fonts.removeEventListener('loadingdone', bump);
  }, []);

  const { transform, ...text } = style;
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    let next = maxSize;
    el.style.fontSize = `${next}px`;
    while (next > minSize && el.scrollHeight > maxHeight) {
      next -= 1;
      el.style.fontSize = `${next}px`;
    }
    setSize(next);
  }, [children, maxSize, minSize, maxHeight, text.fontFamily, text.fontWeight, text.lineHeight, fontsTick]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <NeonSignText color={color} stroke={stroke} style={{ ...style, fontSize: `${size}px` }}>{children}</NeonSignText>
      {/* Invisible copy used only for measuring */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{ ...text, position: "absolute", top: 0, left: 0, right: 0, visibility: "hidden", pointerEvents: "none" }}
      >
        {children}
      </div>
    </div>
  );
}
