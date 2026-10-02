// tts/draw: pen shapes for HUDs and effects (health bars, panels, circles). Colours are "#rrggbb".
// Use a sprite with a tiny costume; the pen draws even while it is hidden.

/** Filled rectangle centred on (x, y). */
/** @warp */
export function rect(x: number, y: number, w: number, h: number, color: string) {
  setPenColor(color);
  setPenSize(3); // strokes 2 apart, 3 thick: no gaps at high-DPI
  for (let yy = y - h / 2 + 1; yy <= y + h / 2 - 1; yy += 2) {
    penUp();
    goTo(x - w / 2 + 1, yy);
    penDown();
    goTo(x + w / 2 - 1, yy);
  }
  penUp();
  setPenSize(1);
}

/** Rectangle outline centred on (x, y). */
/** @warp */
export function outline(x: number, y: number, w: number, h: number, thickness: number, color: string) {
  setPenColor(color);
  setPenSize(thickness);
  penUp();
  goTo(x - w / 2, y - h / 2);
  penDown();
  goTo(x + w / 2, y - h / 2);
  goTo(x + w / 2, y + h / 2);
  goTo(x - w / 2, y + h / 2);
  goTo(x - w / 2, y - h / 2);
  penUp();
  setPenSize(1);
}

/** Filled circle (a single round pen dot). */
/** @warp */
export function circle(x: number, y: number, radius: number, color: string) {
  setPenColor(color);
  setPenSize(radius * 2);
  penUp();
  goTo(x, y);
  penDown();
  penUp();
  setPenSize(1);
}

/** Line between two points. */
/** @warp */
export function line(x1: number, y1: number, x2: number, y2: number, thickness: number, color: string) {
  setPenColor(color);
  setPenSize(thickness);
  penUp();
  goTo(x1, y1);
  penDown();
  goTo(x2, y2);
  penUp();
  setPenSize(1);
}

/** Progress / health bar: left-aligned at (x, y), `fraction` 0..1 filled. */
/** @warp */
export function bar(x: number, y: number, w: number, h: number, fraction: number, fill: string, back: string) {
  const f = Math.max(0, Math.min(1, fraction));
  rect(x + w / 2, y, w, h, back);
  if (f > 0) rect(x + (w * f) / 2, y, w * f, h, fill);
}
