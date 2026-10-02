// Track layout shared by every car: centre-line waypoints (world coords, loop), boost pads.
// Must match scripts/art.mjs.
export const WX: number[] = [0, 380, 570, 590, 450, 220, 150, 280, 80, -280, -540, -600, -430, -560, -580, -380];
export const WY: number[] = [-420, -420, -320, -120, 0, 30, 190, 360, 450, 450, 370, 170, 40, -130, -320, -420];
export const PADX: number[] = [190, -100, -570];
export const PADY: number[] = [-420, 450, -225];
export const HALF_WIDTH = 66;

/** Distance from (px, py) to the nearest point of the track centre line. */
/** @warp */
export function trackDist(px: number, py: number): number {
  let best = 99999;
  const n = WX.length;
  for (let i = 0; i < n; i++) {
    const ax = WX[i];
    const ay = WY[i];
    const j = (i + 1) % n;
    const dx = WX[j] - ax;
    const dy = WY[j] - ay;
    let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    const ex = px - ax - dx * t;
    const ey = py - ay - dy * t;
    const d = Math.sqrt(ex * ex + ey * ey);
    if (d < best) best = d;
  }
  return best;
}

/** Is (px, py) on a boost pad? */
/** @warp */
export function onPad(px: number, py: number): boolean {
  let hit = false;
  for (let i = 0; i < PADX.length; i++) {
    if (Math.abs(px - PADX[i]) < 32 && Math.abs(py - PADY[i]) < 32) hit = true;
  }
  return hit;
}
