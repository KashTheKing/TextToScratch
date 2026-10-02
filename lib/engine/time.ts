// tts/time: cooldowns, named countdowns and frame delta time (per sprite).

const names: string[] = [];
const ends: number[] = [];
let lastFrame = 0;

/** @warp */
function slot(name: string): number {
  const i = names.indexOf(name);
  if (i >= 0) return i;
  names.push(name);
  ends.push(0);
  return names.length - 1;
}

/** Returns true (and restarts the cooldown) if `name` is ready, e.g. if (Time.cooldown("shoot", 0.25)) fire(). */
/** @warp */
export function cooldown(name: string, seconds: number): boolean {
  const i = slot(name);
  if (timer() < ends[i]) return false;
  ends[i] = timer() + seconds;
  return true;
}

/** Start (or restart) a named countdown. */
/** @warp */
export function start(name: string, seconds: number) {
  const i = slot(name);
  ends[i] = timer() + seconds;
}

/** Has the countdown finished? (Never-started countdowns count as done.) */
/** @warp */
export function done(name: string): boolean {
  const i = slot(name);
  return timer() >= ends[i];
}

/** Seconds left on a countdown (0 when done). */
/** @warp */
export function remaining(name: string): number {
  const i = slot(name);
  return Math.max(0, ends[i] - timer());
}

/** Seconds since the previous call (call once per frame); use it for frame-rate independent motion. */
/** @warp */
export function delta(): number {
  const now = timer();
  let d = now - lastFrame;
  lastFrame = now;
  if (d > 0.25) d = 1 / 30; // first frame or after a pause
  return d;
}
