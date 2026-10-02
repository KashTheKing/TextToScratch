// tts/3d: perspective projection and pen-drawn 3D (wireframes, filled triangles, billboard sprites).
// World axes: x right, y up, z forward. Angles in degrees; yaw > 0 turns right, pitch > 0 looks up.
// Draw with a sprite that has a tiny costume (the pen draws even while it is hidden).
//
//   ThreeD.setCamera(0, 50, -300, yaw, 0);
//   penClear();
//   ThreeD.cube(0, 0, 0, 100);

export const cam3d = { camX: 0, camY: 0, camZ: -300, yaw: 0, pitch: 0, fov: 300 };

/** Result of the last project(): screen position and camera-space depth. */
export let sx = 0;
export let sy = 0;
export let depth = 0;
/** Result of rotate(). */
export let rx = 0;
export let rz = 0;

let c0 = 0;
let c1 = 1;
let cull = false;

/** Skip triangles facing away from the camera (wind faces counter-clockwise as seen from outside). */
/** @warp */
export function setCulling(enabled: boolean) {
  cull = enabled;
}

/** @warp */
export function setCamera(x: number, y: number, z: number, yaw: number, pitch: number) {
  cam3d.camX = x;
  cam3d.camY = y;
  cam3d.camZ = z;
  cam3d.yaw = yaw;
  cam3d.pitch = pitch;
}

/** Field of view as a projection scale (300 is a good default; bigger = more zoomed in). */
/** @warp */
export function setFov(scale: number) {
  cam3d.fov = scale;
}

/** Move the camera along its facing direction (ignores pitch, like a first-person walk). */
/** @warp */
export function moveForward(distance: number) {
  cam3d.camX += sin(cam3d.yaw) * distance;
  cam3d.camZ += cos(cam3d.yaw) * distance;
}

/** @warp */
export function strafe(distance: number) {
  cam3d.camX += cos(cam3d.yaw) * distance;
  cam3d.camZ -= sin(cam3d.yaw) * distance;
}

/** Project a world point. Returns false if it's behind the camera; otherwise sets sx, sy, depth. */
/** @warp */
export function project(x: number, y: number, z: number): boolean {
  const dx = x - cam3d.camX;
  const dy = y - cam3d.camY;
  const dz = z - cam3d.camZ;
  const x1 = dx * cos(cam3d.yaw) - dz * sin(cam3d.yaw);
  const z1 = dx * sin(cam3d.yaw) + dz * cos(cam3d.yaw);
  const y1 = dy * cos(cam3d.pitch) - z1 * sin(cam3d.pitch);
  const z2 = dy * sin(cam3d.pitch) + z1 * cos(cam3d.pitch);
  depth = z2;
  if (z2 < 1) return false;
  sx = (x1 * cam3d.fov) / z2;
  sy = (y1 * cam3d.fov) / z2;
  return true;
}

/** Rotate (x, z) around the y axis by `angle` degrees. Sets rx, rz. */
/** @warp */
export function rotate(x: number, z: number, angle: number) {
  rx = x * cos(angle) - z * sin(angle);
  rz = x * sin(angle) + z * cos(angle);
}

/** @warp */
function clipTest(p: number, q: number): boolean {
  if (p === 0) return q >= 0;
  const r = q / p;
  if (p < 0) {
    if (r > c1) return false;
    if (r > c0) c0 = r;
  } else {
    if (r < c0) return false;
    if (r < c1) c1 = r;
  }
  return true;
}

/** Pen line in screen space, clipped to the stage (Scratch won't move sprites off stage). */
/** @warp */
export function line2d(x0: number, y0: number, x1: number, y1: number) {
  c0 = 0;
  c1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const a = clipTest(-dx, x0 + 240);
  if (!a) return;
  const b = clipTest(dx, 240 - x0);
  if (!b) return;
  const c = clipTest(-dy, y0 + 180);
  if (!c) return;
  const d = clipTest(dy, 180 - y0);
  if (!d) return;
  penUp();
  goTo(x0 + c0 * dx, y0 + c0 * dy);
  penDown();
  goTo(x0 + c1 * dx, y0 + c1 * dy);
  penUp();
}

/** Pen line between two world points (skipped if either end is behind the camera). */
/** @warp */
export function line3d(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
  const a = project(x1, y1, z1);
  const ax = sx;
  const ay = sy;
  const b = project(x2, y2, z2);
  if (a && b) line2d(ax, ay, sx, sy);
}

/** Wireframe box centred on (x, y, z). */
/** @warp */
export function box(x: number, y: number, z: number, w: number, h: number, d: number) {
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const y0 = y - h / 2;
  const y1 = y + h / 2;
  const z0 = z - d / 2;
  const z1 = z + d / 2;
  line3d(x0, y0, z0, x1, y0, z0);
  line3d(x1, y0, z0, x1, y0, z1);
  line3d(x1, y0, z1, x0, y0, z1);
  line3d(x0, y0, z1, x0, y0, z0);
  line3d(x0, y1, z0, x1, y1, z0);
  line3d(x1, y1, z0, x1, y1, z1);
  line3d(x1, y1, z1, x0, y1, z1);
  line3d(x0, y1, z1, x0, y1, z0);
  line3d(x0, y0, z0, x0, y1, z0);
  line3d(x1, y0, z0, x1, y1, z0);
  line3d(x1, y0, z1, x1, y1, z1);
  line3d(x0, y0, z1, x0, y1, z1);
}

/** @warp */
export function cube(x: number, y: number, z: number, size: number) {
  box(x, y, z, size, size, size);
}

/** A square grid on the plane y = height, `count` cells each `cell` units wide, centred on (0, 0). */
/** @warp */
export function grid(height: number, cell: number, count: number) {
  const half = (cell * count) / 2;
  for (let i = 0; i <= count; i++) {
    line3d(-half + i * cell, height, -half, -half + i * cell, height, half);
    line3d(-half, height, -half + i * cell, half, height, -half + i * cell);
  }
}

/** Filled triangle in screen space, drawn with horizontal pen strokes. */
/** @warp */
export function fillTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  // sort so that (x0, y0) is the top and (x2, y2) the bottom
  let x0 = ax;
  let y0 = ay;
  let x1 = bx;
  let y1 = by;
  let x2 = cx;
  let y2 = cy;
  let t = 0;
  if (y1 > y0) { t = x0; x0 = x1; x1 = t; t = y0; y0 = y1; y1 = t; }
  if (y2 > y0) { t = x0; x0 = x2; x2 = t; t = y0; y0 = y2; y2 = t; }
  if (y2 > y1) { t = x1; x1 = x2; x2 = t; t = y1; y1 = y2; y2 = t; }
  if (y0 - y2 < 0.5) return;
  setPenSize(3); // strokes 2 apart, 3 thick: no gaps at high-DPI
  for (let y = y2; y <= y0; y += 2) {
    const xa = x2 + ((x0 - x2) * (y - y2)) / (y0 - y2);
    let xb = x1;
    if (y < y1) xb = x2 + ((x1 - x2) * (y - y2)) / (y1 - y2);
    else if (y0 - y1 > 0) xb = x1 + ((x0 - x1) * (y - y1)) / (y0 - y1);
    line2d(xa, y, xb, y);
  }
  setPenSize(1);
}

/** Filled triangle between three world points, in the current pen colour. */
/** @warp */
export function triangle3d(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number) {
  const a = project(x1, y1, z1);
  const ax = sx;
  const ay = sy;
  const b = project(x2, y2, z2);
  const bx = sx;
  const by = sy;
  const c = project(x3, y3, z3);
  if (!(a && b && c)) return;
  if (cull && (bx - ax) * (sy - ay) - (by - ay) * (sx - ax) < 0) return; // clockwise on screen = back face
  fillTriangle(ax, ay, bx, by, sx, sy);
}

/** Show this sprite at a world point, scaled by distance (billboard); hides it when behind the camera. */
/** @warp */
export function placeSprite(x: number, y: number, z: number, baseSize: number) {
  const ok = project(x, y, z);
  if (ok) {
    me.visible = true;
    me.size = (baseSize * cam3d.fov) / depth;
    goTo(sx, sy);
  } else {
    me.visible = false;
  }
}
