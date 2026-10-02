// Practice bots: three clones that roam and blast at you while nobody else is online.
import * as M from "tts/math";
import { game, enemyShots, fx, CRATE } from "./Stage";

const SPEED = 2.2;
const MAX_HP = 3;

let idx = 0;
let hp = 0;
let alive = false;
let tx = 0;
let ty = 0;
let retarget = 0;
let nextShot = 0;
let hurtUntil = 0;
let respawnAt = 0;

/** @warp */
function blocked(): boolean {
  switchCostume("hitbox");
  const hit = touchingColor(CRATE);
  switchCostume("bot");
  return hit;
}

/** @warp */
function moveBy(dx: number, dy: number) {
  me.x += dx;
  const bx = blocked();
  if (bx || Math.abs(me.x) > 222) me.x -= dx;
  me.y += dy;
  const by = blocked();
  if (by || Math.abs(me.y) > 155) me.y -= dy;
}

/** @warp */
function badSpot(): boolean {
  if (M.distance(me.x, me.y, game.px, game.py) < 150) return true;
  return blocked();
}

/** @warp */
function spawnSpot() {
  goTo(random(-210, 210), random(-150, 150));
  let tries = 0;
  while (tries < 50 && badSpot()) {
    goTo(random(-210, 210), random(-150, 150));
    tries++;
  }
}

function spawn() {
  spawnSpot();
  hp = MAX_HP;
  alive = true;
  me.visible = true;
  nextShot = timer() + 1.5;
  retarget = 0;
}

function pickTarget() {
  // wander near the player, but keep some distance
  tx = M.clamp(game.px + random(-180, 180), -210, 210);
  ty = M.clamp(game.py + random(-140, 140), -150, 150);
  retarget = timer() + random(15, 35) / 10;
}

function act() {
  if (timer() > retarget || M.distance(me.x, me.y, tx, ty) < 8) pickTarget();
  const d = M.directionTo(me.x, me.y, tx, ty);
  const ox = me.x;
  const oy = me.y;
  moveBy(SPEED * sin(d), SPEED * cos(d));
  if (Math.abs(me.x - ox) + Math.abs(me.y - oy) < 0.5) {
    // stuck on a crate: head somewhere random instead
    tx = random(-210, 210);
    ty = random(-150, 150);
    retarget = timer() + 2;
  }
  me.direction = M.directionTo(me.x, me.y, game.px, game.py);
  const dist = M.distance(me.x, me.y, game.px, game.py);
  if (game.alive && timer() > nextShot && dist < 320) {
    nextShot = timer() + random(8, 15) / 10;
    const aim = me.direction + random(-10, 10);
    enemyShots.push(me.x + 26 * sin(aim));
    enemyShots.push(me.y + 26 * cos(aim));
    enemyShots.push(aim);
    enemyShots.push(10 + idx);
    playSound("zap");
  }
  if (touching("Bullet") && timer() > hurtUntil) {
    hp--;
    hurtUntil = timer() + 0.15;
    playSound("clank");
    if (hp <= 0) {
      alive = false;
      me.visible = false;
      respawnAt = timer() + 3;
      game.kills++;
      broadcast("kill");
      fx.push(me.x);
      fx.push(me.y);
      fx.push(18);
      playSound("boom");
    }
  }
  setEffect("brightness", timer() < hurtUntil ? 70 : 0);
}

whenFlag(() => {
  me.visible = false;
  me.rotationStyle = "all around";
  idx = 0;
});

onMessage("start", () => {
  if (idx > 0) return; // only the original spawns
  for (let i = 1; i <= 3; i++) {
    idx = i;
    createClone();
  }
  idx = 0;
});

onClone(() => {
  switchCostume("bot");
  alive = false;
  respawnAt = timer() + 0.5 + idx;
  while (game.playing) {
    if (!game.alone) {
      alive = false;
      me.visible = false;
      respawnAt = timer() + 2;
    } else if (alive) {
      act();
    } else if (timer() > respawnAt) {
      spawn();
    }
  }
  deleteClone();
});
