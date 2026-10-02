// tts/camera: a scrolling 2D camera. Keep each sprite's position in world coordinates and
// call Camera.place(worldX, worldY) every frame; the camera is shared by all sprites.
//
//   Camera.follow(playerX, playerY, 0.15);   // in the player's loop
//   Camera.place(myWorldX, myWorldY);         // in every world sprite's loop
//
// With Physics: place the player from its world position, step the physics (which works on the
// screen), then read the world position back with toWorldX(me.x) / toWorldY(me.y). Let the player's
// script be the only one that moves the camera, and run world sprites as clones so they update
// after it each frame.

export const view = { cameraX: 0, cameraY: 0, zoom: 100, shake: 0 };

/** Set by place() / placeTile(): is this sprite currently on screen (and shown)? */
export let onScreen = false;

/** Snap the camera to a world position. */
/** @warp */
export function lookAt(x: number, y: number) {
  view.cameraX = x;
  view.cameraY = y;
}

/** Ease the camera toward a world position (smoothing: 0..1, e.g. 0.15). */
/** @warp */
export function follow(x: number, y: number, smoothing: number) {
  view.cameraX += (x - view.cameraX) * smoothing;
  view.cameraY += (y - view.cameraY) * smoothing;
  if (view.shake > 0) {
    view.cameraX += random(-view.shake, view.shake);
    view.cameraY += random(-view.shake, view.shake);
    view.shake = Math.max(0, view.shake - 1);
  }
}

/** Keep the camera inside a rectangle of the world. */
/** @warp */
export function clampTo(minX: number, minY: number, maxX: number, maxY: number) {
  view.cameraX = Math.max(minX, Math.min(maxX, view.cameraX));
  view.cameraY = Math.max(minY, Math.min(maxY, view.cameraY));
}

/** Shake the screen; strength in pixels, decays by 1 per frame. */
/** @warp */
export function shake(strength: number) {
  view.shake = strength;
}

/** @warp */
export function setZoom(percent: number) {
  view.zoom = percent;
}

/** Position this sprite on screen from world coordinates; hides it when it's off screen. */
/** @warp */
export function place(worldX: number, worldY: number) {
  const sx = ((worldX - view.cameraX) * view.zoom) / 100;
  const sy = ((worldY - view.cameraY) * view.zoom) / 100;
  onScreen = Math.abs(sx) <= 300 && Math.abs(sy) <= 240;
  if (onScreen) {
    me.visible = true;
    goTo(sx, sy);
  } else {
    me.visible = false;
  }
}

/**
 * Place a large sprite (a level tile) whose costume is `halfWidth` x `halfHeight` from its centre.
 * Scratch won't move a sprite fully off stage, so tiles are hidden once they leave the screen.
 * Build big levels from screen-sized tiles (e.g. clones, one per 480x360 costume).
 */
/** @warp */
export function placeTile(worldX: number, worldY: number, halfWidth: number, halfHeight: number) {
  const sx = ((worldX - view.cameraX) * view.zoom) / 100;
  const sy = ((worldY - view.cameraY) * view.zoom) / 100;
  onScreen = Math.abs(sx) <= 240 + halfWidth - 16 && Math.abs(sy) <= 180 + halfHeight - 16;
  if (onScreen) {
    me.visible = true;
    goTo(sx, sy);
  } else {
    me.visible = false;
  }
}

/** World position of a screen point (e.g. after Physics moved the sprite on screen). */
/** @warp */
export function toWorldX(screenX: number): number {
  return view.cameraX + (screenX * 100) / view.zoom;
}

/** @warp */
export function toWorldY(screenY: number): number {
  return view.cameraY + (screenY * 100) / view.zoom;
}

/** Like place(), and also scales the sprite with the camera zoom. */
/** @warp */
export function placeScaled(worldX: number, worldY: number, baseSize: number) {
  me.size = (baseSize * view.zoom) / 100;
  place(worldX, worldY);
}

/** Mouse position in world coordinates. */
/** @warp */
export function mouseWorldX(): number {
  return view.cameraX + (mouseX() * 100) / view.zoom;
}

/** @warp */
export function mouseWorldY(): number {
  return view.cameraY + (mouseY() * 100) / view.zoom;
}

/** Screen position of a world point (for stamping or say bubbles). */
/** @warp */
export function toScreenX(worldX: number): number {
  return ((worldX - view.cameraX) * view.zoom) / 100;
}

/** @warp */
export function toScreenY(worldY: number): number {
  return ((worldY - view.cameraY) * view.zoom) / 100;
}
