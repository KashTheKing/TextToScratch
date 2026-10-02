// tts/math: numeric helpers. Angles use Scratch conventions (degrees; direction 0 = up, 90 = right).

/** @warp */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Linear interpolation: a at t = 0, b at t = 1. */
/** @warp */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Move `current` toward `target` by at most `step`. */
/** @warp */
export function approach(current: number, target: number, step: number): number {
  if (current < target) return Math.min(current + step, target);
  return Math.max(current - step, target);
}

/** @warp */
export function sign(value: number): number {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

/** Wrap a value into [min, max). */
/** @warp */
export function wrap(value: number, min: number, max: number): number {
  return min + ((((value - min) % (max - min)) + (max - min)) % (max - min));
}

/** @warp */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

/** Mathematical atan2 in degrees (0 = right, counter-clockwise). */
/** @warp */
export function atan2(y: number, x: number): number {
  if (x > 0) return atan(y / x);
  if (x < 0) {
    if (y >= 0) return atan(y / x) + 180;
    return atan(y / x) - 180;
  }
  if (y > 0) return 90;
  if (y < 0) return -90;
  return 0;
}

/** Scratch direction (0 = up, 90 = right) from (x1, y1) toward (x2, y2). */
/** @warp */
export function directionTo(x1: number, y1: number, x2: number, y2: number): number {
  const a = atan2(y2 - y1, x2 - x1);
  return 90 - a;
}

/** Random decimal in [min, max). */
/** @warp */
export function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Smooth ease in/out for t in [0, 1]. */
/** @warp */
export function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

/** @warp */
export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Do two axis-aligned boxes (centre x/y, width, height) overlap? */
/** @warp */
export function boxesOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
}

/** Is a point inside a box (centre x/y, width, height)? */
/** @warp */
export function pointInBox(px: number, py: number, bx: number, by: number, bw: number, bh: number): boolean {
  return Math.abs(px - bx) * 2 < bw && Math.abs(py - by) * 2 < bh;
}
