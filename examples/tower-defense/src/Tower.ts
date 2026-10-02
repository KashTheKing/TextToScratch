// Towers and their shots. The hidden original builds towers; a tower clone clones itself to fire,
// so each shot inherits the tower's local variables (role, type, damage, target).
import { game, SLOTS, eon, eid, ex, ey, ehp, eprog, eslow, grid } from "./Stage";

// Indexed (type - 1) * 3 + (level - 1). Types: 1 arrow, 2 cannon (splash), 3 frost (splash slow).
const DMG: number[] = [4, 7, 11, 10, 17, 28, 1, 2, 4];
const RANGE: number[] = [95, 110, 125, 85, 95, 110, 75, 90, 105];
const RELOAD: number[] = [14, 11, 8, 44, 38, 30, 34, 28, 22];

let role = 0; // 0 builder, 1 tower, 2 shot
let type = 1;
let level = 1;
let cell = 0;
let cd = 0;
let tgt = -1;
let tid = 0;
let dmg = 0;
let rng = 0;
let tx = 0;
let ty = 0;

/** Slot of the enemy furthest along the path within range, or -1. */
/** @warp */
function findTarget(): number {
  let best = -1;
  let bestProg = -1;
  for (let i = 0; i < SLOTS; i++) {
    if (eon[i] === 1 && eprog[i] > bestProg) {
      const dx = ex[i] - me.x;
      const dy = ey[i] - me.y;
      if (dx * dx + dy * dy <= rng * rng) {
        best = i;
        bestProg = eprog[i];
      }
    }
  }
  return best;
}

/** Damage (and for frost, chill) every enemy within radius of (tx, ty). */
/** @warp */
function splash(radius: number, chill: number) {
  for (let i = 0; i < SLOTS; i++) {
    if (eon[i] === 1) {
      const dx = ex[i] - tx;
      const dy = ey[i] - ty;
      if (dx * dx + dy * dy <= radius * radius) {
        ehp[i] -= dmg;
        if (chill > eslow[i]) eslow[i] = chill;
      }
    }
  }
}

whenFlag(() => {
  role = 0;
  me.visible = false;
});

onMessage("place", () => {
  if (role !== 0) return;
  type = game.placeType;
  cell = game.placeCell;
  level = 1;
  goTo(-220 + (cell % 12) * 40, 120 - Math.floor(cell / 12) * 40);
  role = 1;
  createClone();
  role = 0;
});

onClone(() => {
  if (role === 1) {
    if (type === 1) switchCostume("arrow");
    if (type === 2) switchCostume("cannon");
    if (type === 3) switchCostume("frost");
    me.size = 100;
    me.direction = 90;
    me.rotationStyle = "all around";
    grid[cell] = type * 10 + level;
    me.visible = true;
    playSound("place");
    cd = 0;
    while (game.over === 0) {
      const k = (type - 1) * 3 + level - 1;
      rng = RANGE[k];
      if (game.upgradeCell === cell) {
        game.upgradeCell = -1;
        level++;
        grid[cell] = type * 10 + level;
        me.size = 100 + (level - 1) * 10;
        playSound("upgrade");
      }
      if (cd > 0) {
        cd--;
      } else {
        tgt = findTarget();
        if (tgt >= 0) {
          tid = eid[tgt];
          dmg = DMG[k];
          tx = ex[tgt];
          ty = ey[tgt];
          pointInDirection(90 - atan2deg(ty - me.y, tx - me.x));
          cd = RELOAD[k];
          if (type === 1) playSound("arrow");
          if (type === 2) playSound("cannon");
          if (type === 3) playSound("frost");
          role = 2;
          createClone();
          role = 1;
        }
      }
    }
  }
  if (role === 2) shotFlight();
});

/** Scratch atan for a full circle, in degrees (mathematical). */
/** @warp */
function atan2deg(y: number, x: number): number {
  if (x === 0) return y > 0 ? 90 : -90;
  if (x > 0) return atan(y / x);
  return atan(y / x) + 180;
}

function shotFlight() {
  let speed = 11;
  if (type === 1) switchCostume("bolt");
  if (type === 2) { switchCostume("ball"); speed = 8; }
  if (type === 3) { switchCostume("ice"); speed = 8; }
  me.size = 100;
  goToFront();
  let flying = 1;
  while (flying === 1 && game.over === 0) {
    if (eon[tgt] === 1 && eid[tgt] === tid) {
      tx = ex[tgt];
      ty = ey[tgt];
    }
    const dx = tx - me.x;
    const dy = ty - me.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= speed) {
      goTo(tx, ty);
      flying = 0;
    } else {
      pointInDirection(90 - atan2deg(dy, dx));
      move(speed);
    }
  }
  if (type === 1) {
    if (eon[tgt] === 1 && eid[tgt] === tid) ehp[tgt] -= dmg;
    deleteClone();
  }
  if (type === 2) {
    splash(48, 0);
    switchCostume("boom");
    playSound("boom");
  } else {
    splash(42, 50 + level * 15);
    switchCostume("frostburst");
  }
  me.size = 40;
  me.direction = 90;
  repeat(8, () => {
    me.size += 10;
    changeEffect("ghost", 12);
  });
  wait(0.2);
  deleteClone();
}

onMessage("setup", () => {
  if (role !== 0) deleteClone();
});
