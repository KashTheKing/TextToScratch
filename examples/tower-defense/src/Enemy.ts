// Enemies: the hidden original spawns each wave; clones walk the path.
import { game, SLOTS, eon, eid, ex, ey, ehp, emax, eprog, eslow, etall, wx, wy } from "./Stage";

let isClone = 0;
let slot = 0;
let kind = 1;
let px = 0;
let py = 0;
let wp = 1;
let spd = 1;
let reward = 0;
let lastHp = 0;
let flash = 0;
let running = 0;

/** Claim a free slot, fill in its stats and make a clone that walks it. */
/** @warp */
function spawn(k: number) {
  slot = eon.indexOf(0);
  if (slot < 0) return;
  kind = k;
  const w = game.wave;
  if (k === 1) { ehp[slot] = 10 + w * 5; spd = 2; reward = 4; etall[slot] = 18; }
  if (k === 2) { ehp[slot] = 6 + w * 3; spd = 3.6; reward = 4; etall[slot] = 15; }
  if (k === 3) { ehp[slot] = 30 + w * 13; spd = 1.3; reward = 8; etall[slot] = 22; }
  if (k === 4) { ehp[slot] = 150 + w * 50; spd = 0.9; reward = 60; etall[slot] = 36; }
  ehp[slot] = Math.round(ehp[slot] * (1 + w * w * 0.025));
  game.nextId++;
  eid[slot] = game.nextId;
  emax[slot] = ehp[slot];
  eprog[slot] = 0;
  eslow[slot] = 0;
  ex[slot] = wx[0];
  ey[slot] = wy[0];
  eon[slot] = 1;
  game.alive++;
  createClone();
}

whenFlag(() => {
  isClone = 0;
  me.visible = false;
});

onMessage("start wave", () => {
  if (isClone === 1) return;
  const w = game.wave;
  const n = Math.min(32, 5 + w * 2);
  for (let i = 0; i < n && game.over === 0; i++) {
    let k = 1;
    if (w >= 2 && random(1, 4) === 1) k = 2;
    if (w >= 4 && random(1, 5) === 1) k = 3;
    if (w >= 8 && random(1, 4) === 1) k = 3;
    spawn(k);
    wait(Math.max(0.3, 0.9 - w * 0.04));
  }
  if (w % 5 === 0 && game.over === 0) {
    wait(1);
    spawn(4);
    if (w === 15) {
      wait(2);
      spawn(4);
    }
  }
  game.spawning = 0;
});

onClone(() => {
  isClone = 1;
  if (kind === 1) switchCostume("blob");
  if (kind === 2) switchCostume("fast");
  if (kind === 3) switchCostume("robot");
  if (kind === 4) switchCostume("boss");
  me.rotationStyle = "left-right";
  me.direction = 90;
  me.size = 100;
  clearEffects();
  px = wx[0];
  py = wy[0];
  wp = 1;
  lastHp = ehp[slot];
  goTo(px, py);
  goToBack();
  me.visible = true;
  running = 1;
  while (running === 1) {
    if (ehp[slot] <= 0) {
      running = 2;
    } else {
      let speed = spd;
      if (eslow[slot] > 0) {
        speed = spd * 0.45;
        eslow[slot]--;
        setEffect("color", 55);
      } else {
        setEffect("color", 0);
      }
      const dx = wx[wp] - px;
      const dy = wy[wp] - py;
      const d = Math.abs(dx) + Math.abs(dy); // ponytail: path segments are axis-aligned
      if (d <= speed) {
        px = wx[wp];
        py = wy[wp];
        wp++;
        if (wp > 5) running = 3;
      } else {
        px += (dx / d) * speed;
        py += (dy / d) * speed;
        if (dx > 0) me.direction = 90;
        if (dx < 0) me.direction = -90;
      }
      eprog[slot] += speed;
      ex[slot] = px;
      ey[slot] = py;
      goTo(px, py + Math.abs(sin(eprog[slot] * 12)) * 3);
      if (ehp[slot] < lastHp) {
        lastHp = ehp[slot];
        flash = 3;
      }
      if (flash > 0) {
        flash--;
        setEffect("brightness", 45);
      } else {
        setEffect("brightness", 0);
      }
    }
  }
  eon[slot] = 0;
  game.alive--;
  if (running === 3) {
    game.lives -= kind === 4 ? 5 : 1;
    playSound("leak");
    repeat(6, () => {
      changeEffect("ghost", 16);
      me.x += 3;
    });
  } else {
    game.money += reward;
    playSound(kind === 4 ? "bossdie" : "pop");
    playSound("coin");
    setEffect("brightness", 60);
    repeat(6, () => {
      me.size += 12;
      changeEffect("ghost", 16);
    });
  }
  wait(0.3);
  deleteClone();
});

onMessage("setup", () => {
  if (isClone === 1) deleteClone();
});
onMessage("lose", () => {
  if (isClone === 1) deleteClone();
});
