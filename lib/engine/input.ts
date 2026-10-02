// tts/input: keyboard and mouse helpers. Edge detection ("pressed this frame") is per sprite:
// call the *Pressed functions once per frame from the same loop.

const held: string[] = []; // keys that were down last time pressedOnce() checked them
let prevJump = false;
let prevMouse = false;

/** -1 (left / A), 0, or 1 (right / D). */
/** @warp */
export function axisX(): number {
  let v = 0;
  if (keyPressed("right arrow") || keyPressed("d")) v++;
  if (keyPressed("left arrow") || keyPressed("a")) v--;
  return v;
}

/** -1 (down / S), 0, or 1 (up / W). */
/** @warp */
export function axisY(): number {
  let v = 0;
  if (keyPressed("up arrow") || keyPressed("w")) v++;
  if (keyPressed("down arrow") || keyPressed("s")) v--;
  return v;
}

/** Is a jump key (space, up arrow or W) held? */
/** @warp */
export function jumpHeld(): boolean {
  return keyPressed("space") || keyPressed("up arrow") || keyPressed("w");
}

/** True only on the frame a jump key goes down. */
/** @warp */
export function jumpPressed(): boolean {
  const now = keyPressed("space") || keyPressed("up arrow") || keyPressed("w");
  const edge = now && !prevJump;
  prevJump = now;
  return edge;
}

/** True only on the frame the mouse button goes down. */
/** @warp */
export function mouseClicked(): boolean {
  const now = mouseDown();
  const edge = now && !prevMouse;
  prevMouse = now;
  return edge;
}

/** True only on the frame `key` goes down. */
/** @warp */
export function pressedOnce(key: Key): boolean {
  const now = keyPressed(key);
  const was = held.includes(key);
  if (now && !was) held.push(key);
  if (!now && was) held.remove(held.indexOf(key));
  return now && !was;
}
