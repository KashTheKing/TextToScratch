import { game } from "./Stage";

// Tuning
const GRAVITY = 0.8;
const JUMP = 12;
const ACCEL = 1.2;
const FRICTION = 0.8;
const STEP_UP = 6; // how many pixels of slope/step we climb automatically

const SPAWN_X = -200;
const SPAWN_Y = -100;

let vx = 0;
let vy = 0;
let onGround = false;

/** Move sideways; climb small steps, otherwise push out of walls. */
/** @warp */
function moveX(dx: number) {
  me.x += dx;
  if (touching("Level")) {
    let lift = 0;
    while (touching("Level") && lift < STEP_UP) {
      me.y += 1;
      lift++;
    }
    if (touching("Level")) {
      me.y -= lift;
      const back = dx > 0 ? -1 : 1;
      while (touching("Level")) me.x += back;
      vx = 0;
    }
  }
}

/** Move vertically; land on floors and bump heads on ceilings. */
/** @warp */
function moveY(dy: number) {
  me.y += dy;
  onGround = false;
  if (touching("Level")) {
    const back = dy > 0 ? -1 : 1;
    while (touching("Level")) me.y += back;
    if (dy < 0) onGround = true;
    vy = 0;
  } else if (dy <= 0) {
    // pushing out in whole pixels can leave a sub-pixel gap: probe 1px down so idling never flickers to "jump"
    me.y -= 1;
    if (touching("Level")) onGround = true;
    me.y += 1;
  }
}

function respawn() {
  goTo(SPAWN_X, SPAWN_Y);
  vx = 0;
  vy = 0;
}

function animate() {
  if (vx > 0.5) pointInDirection(90);
  if (vx < -0.5) pointInDirection(-90);
  if (!onGround) {
    switchCostume("jump");
  } else if (Math.abs(vx) > 1) {
    switchCostume(Math.floor(timer() * 8) % 2 === 0 ? "walk1" : "walk2");
  } else {
    switchCostume("idle");
  }
}

whenFlag(() => {
  me.rotationStyle = "left-right";
  goToFront();
  respawn();
  while (!game.won) {
    if (keyPressed("right arrow") || keyPressed("d")) vx += ACCEL;
    if (keyPressed("left arrow") || keyPressed("a")) vx -= ACCEL;
    vx *= FRICTION;
    vy -= GRAVITY;
    if (onGround && (keyPressed("up arrow") || keyPressed("w") || keyPressed("space"))) vy = JUMP;

    // Collide using a fixed box so animation frames can't push us into walls.
    // (Costume changes aren't drawn until the loop finishes, so it never shows.)
    switchCostume("physics");
    moveX(vx);
    moveY(vy);
    animate();

    if (me.y < -170) respawn();
  }
  sayFor(`I got ${game.coins} coins!`, 3);
});
