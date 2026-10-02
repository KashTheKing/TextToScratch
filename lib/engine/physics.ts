// tts/physics: a per-sprite physics body with gravity, friction and pixel-perfect collision
// against a "solid" sprite (draw your walls and floors on one sprite's costume).
//
//   Physics.configure(0.8, 0.8, 15);   // gravity, friction, max fall speed
//   forever(() => {
//     Physics.push(Input.axisX() * 1.2, 0);
//     if (Input.jumpPressed()) Physics.jump(12);
//     Physics.step("Level");
//   });

/** Velocity, in pixels per frame. Read with Physics.vx / Physics.vy. */
export let vx = 0;
export let vy = 0;
/** True after step() if the body is standing on the solid sprite. */
export let onGround = false;
/** True after step() if the body hit a wall / ceiling this frame. */
export let hitWall = false;
export let hitCeiling = false;

let gravity = 0.8;
let friction = 0.8;
let maxFall = 15;
let stepUp = 6;
let hitbox = "";

/** @warp */
export function configure(gravityPerFrame: number, frictionFactor: number, maxFallSpeed: number) {
  gravity = gravityPerFrame;
  friction = frictionFactor;
  maxFall = maxFallSpeed;
}

/** How many pixels of step or slope the body climbs automatically (default 6). */
/** @warp */
export function setStepUp(pixels: number) {
  stepUp = pixels;
}

/** Collide using this costume instead of the current one (a plain rectangle avoids animation glitches). */
/** @warp */
export function setHitbox(costume: CostumeName) {
  hitbox = costume;
}

/** @warp */
export function setVelocity(x: number, y: number) {
  vx = x;
  vy = y;
}

/** Add to the velocity (e.g. input acceleration, knockback). */
/** @warp */
export function push(dx: number, dy: number) {
  vx += dx;
  vy += dy;
}

/** Jump if standing on the ground. */
/** @warp */
export function jump(power: number) {
  if (onGround) {
    vy = power;
    onGround = false;
  }
}

/** Platformer step: gravity, friction, then move with collision against `solid`. */
/** @warp */
export function step(solid: SpriteName) {
  vy -= gravity;
  if (vy < -maxFall) vy = -maxFall;
  vx *= friction;
  const costume = me.costumeName;
  if (hitbox !== "") switchCostume(hitbox as CostumeName);
  moveX(vx, solid);
  moveY(vy, solid);
  switchCostume(costume as CostumeName);
}

/** Top-down step (no gravity): friction, then move with collision against `solid`. */
/** @warp */
export function stepTopDown(solid: SpriteName) {
  vx *= friction;
  vy *= friction;
  const costume = me.costumeName;
  if (hitbox !== "") switchCostume(hitbox as CostumeName);
  moveX(vx, solid);
  moveY(vy, solid);
  switchCostume(costume as CostumeName);
}

/** Move sideways, climbing small steps; stops at walls. */
/** @warp */
export function moveX(dx: number, solid: SpriteName) {
  hitWall = false;
  me.x += dx;
  if (touching(solid)) {
    let lift = 0;
    while (touching(solid) && lift < stepUp) {
      me.y += 1;
      lift++;
    }
    if (touching(solid)) {
      me.y -= lift;
      const back = dx > 0 ? -1 : 1;
      let guard = 0;
      while (touching(solid) && guard < 64) {
        me.x += back;
        guard++;
      }
      vx = 0;
      hitWall = true;
    }
  }
}

/** Move vertically; lands on floors and bumps into ceilings. */
/** @warp */
export function moveY(dy: number, solid: SpriteName) {
  onGround = false;
  hitCeiling = false;
  me.y += dy;
  if (touching(solid)) {
    const back = dy > 0 ? -1 : 1;
    let guard = 0;
    while (touching(solid) && guard < 64) {
      me.y += back;
      guard++;
    }
    if (dy <= 0) onGround = true;
    else hitCeiling = true;
    vy = 0;
  } else if (dy <= 0) {
    // Pushing out of the floor in whole pixels can leave a sub-pixel gap, so a small fall may not
    // touch the floor this frame. Probe 1px down so standing still never flickers into "airborne".
    me.y -= 1;
    if (touching(solid)) onGround = true;
    me.y += 1;
  }
}

/** Is there solid ground just below the sprite? */
/** @warp */
export function groundBelow(solid: SpriteName): boolean {
  me.y -= 1;
  const hit = touching(solid);
  me.y += 1;
  return hit;
}

/** Bounce off the stage edges, reversing velocity (for balls and top-down games). */
/** @warp */
export function bounceInStage(halfWidth: number, halfHeight: number) {
  if (me.x > 240 - halfWidth && vx > 0) vx = -vx;
  if (me.x < -240 + halfWidth && vx < 0) vx = -vx;
  if (me.y > 180 - halfHeight && vy > 0) vy = -vy;
  if (me.y < -180 + halfHeight && vy < 0) vy = -vy;
}
