// The whole game loop: player, zombies, waves, co-op networking and the 3D renderer.
// Rendering: a DDA raycaster over a 24x24 tile map. Each of the 120 screen columns stamps one wall slice
// (a 1-texel-wide costume, picked from 5 aspect ratios so the stamp is ~4 px wide at any height),
// darkened by distance. Billboards (zombies, players, pickups, puffs) are stamped far-to-near, and after
// each one the wall columns that are nearer than it are stamped again, so walls hide sprites correctly.
import * as Net from "tts/net";
import * as Time from "tts/time";
import * as Draw from "tts/draw";
import * as MathX from "tts/math";
import { game, zcloud } from "./Stage";
import {
  C_WALKER_FA, C_SOLDIER_FRONT, C_SOLDIER_BACK, C_SOLDIER_LEFT, C_SOLDIER_RIGHT, C_SOLDIER_DOWN, C_PK_AMMO, C_FX_DUST, C_FX_GOO,
  C_D0, C_DSLASH, C_DINF, C_HUD_HP, C_HUD_AMMO, C_HUD_WAVE, C_HUD_SCORE, C_CROSSHAIR, C_BIG_WAVE, C_MSG_CLEARED, C_MSG_REPAIR,
  C_MSG_DOWN, C_MSG_GAMEOVER, C_VIGNETTE, C_MSG_WAIT, C_MSG_RELOAD, C_MSG_NOAMMO, C_HUD_PLAYERS, C_HUD_WEAPON_PISTOL,
  C_BUY_DOOR, C_BUY_SHOTGUN, C_AMMO_SHOTGUN, C_MSG_NOPOINTS, C_MENU_MAIN, C_MENU_CONNECTING, C_MENU_FOUND, C_MENU_NONE,
} from "./lib/ids";

const MW = 24;
const N = 120; // screen columns
const CW = 4; // column width in pixels
const PLANE = 0.66; // camera plane half-width (66 degree field of view)
const PROJ = 363.6; // 240 / PLANE: pixels per world unit at distance 1
const ZMAX = 30;
// 24 rows of 24 tiles: 0 open, 1 brick, 2 concrete, 3 metal, 4 barricade, 5 crate,
// 6/7/8 wall buys (shotgun/SMG/rifle chalk), 9 debris door. Zones: 0 start room (centre), 1 north, 2 south, 3 west, 4 east.
// prettier-ignore
const MAP = "111111111111111111111111100200000000000000000001100200000000000000000001124200000000000000000001100000550000000000500001100000000000222200000001100000000000200200000001100000000000200200000001122222222292242222222221100000002000000200002001600005002000000200302001100000009000000200002421124200002000000900000001100200007000000200000008100200002000000200000001122222222242922222222221100000002002000000000001100000002002000000000001100000002222000000500001100005000000000000000001100000000000300000002421100000000000000000002001100000000000000000002001111111111111111111111111";

// world
const map: number[] = [];
const bhp: number[] = []; // barricade health per cell
const flow: number[] = []; // steps to the nearest player (zombie flow field)
const queue: number[] = [];
const barCell: number[] = [];
// zombie spawn closets (behind barricades), with the zone each one belongs to
const spawnX: number[] = [13.5, 14.5, 9.5, 10.5, 1.5, 2.5, 21.5, 22.5, 1.5, 2.5, 21.5, 22.5];
const spawnY: number[] = [6.5, 7.5, 16.5, 17.5, 1.5, 2.5, 21.5, 22.5, 13.5, 14.5, 9.5, 10.5];
const spawnZ: number[] = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const pkX: number[] = [11.5, 12.5, 9.5, 17.5, 4.5, 19.5];
const pkY: number[] = [10.5, 13.5, 4.5, 19.5, 11.5, 13.5];
const pkZ: number[] = [0, 0, 1, 2, 3, 4];
// debris doors: north, south, west, east (opening door d unlocks zone d + 1)
const doorCell: number[] = [202, 372, 272, 303];
const doorOpen: number[] = [0, 0, 0, 0];
const DOOR_COST = 1000;
const pk: number[] = [];
// per-column render data (solid wall + optional barricade overlay)
const cDepth: number[] = [];
const cCost: number[] = [];
const cSize: number[] = [];
const cBr: number[] = [];
const oDepth: number[] = [];
const oCost: number[] = [];
const oSize: number[] = [];
const oBr: number[] = [];
// billboards to draw this frame, sorted far to near
const bD: number[] = [];
const bX: number[] = [];
const bY: number[] = [];
const bS: number[] = [];
const bC: number[] = [];
const bB: number[] = [];
const bG: number[] = [];
const bW: number[] = [];
// zombies
const zt: number[] = []; // 0 free, 1 walker, 2 runner, 3 brute
const zx: number[] = [];
const zy: number[] = [];
const zs: number[] = []; // 0 walk, 1 attack, 2 dying
const zhp: number[] = [];
const ztm: number[] = [];
const zhx: number[] = [];
const zhy: number[] = [];
const zox: number[] = [];
const zoy: number[] = [];
const zan: number[] = [];
const hitAcc: number[] = [];
const ZSPEED: number[] = [0.95, 1.9, 0.75];
const ZHP: number[] = [70, 45, 260];
const ZDPS: number[] = [14, 9, 30];
const ZPTS: number[] = [10, 15, 40];
const ZRAD: number[] = [0.3, 0.28, 0.42];
const ZH: number[] = [1.0, 0.98, 1.22];
// puffs
const fxX: number[] = [];
const fxY: number[] = [];
const fxZ: number[] = [];
const fxT: number[] = [];
const fxK: number[] = [];
// other players (index = slot - 1)
const rAct: number[] = [];
const rX: number[] = [];
const rY: number[] = [];
const rA: number[] = [];
const rAl: number[] = [];
const rShot: number[] = [];
const rLastD: number[] = [];
const evQ: number[] = [];
// weapons: pistol, shotgun, rifle
// weapons: 0 pistol, 1 shotgun, 2 rifle, 3 SMG
const W_DMG: number[] = [34, 14, 28, 20];
const W_RATE: number[] = [0.3, 0.85, 0.11, 0.075];
const W_MAG: number[] = [12, 6, 30, 32];
const W_PEL: number[] = [1, 8, 1, 1];
const W_SPR: number[] = [0.6, 7, 1.6, 2.6];
const W_RELOAD: number[] = [1.1, 1.9, 1.6, 1.4];
const W_PRICE: number[] = [0, 750, 1400, 1000];
const W_MAXRES: number[] = [999, 36, 180, 192];
const wsl: number[] = [0, -1]; // two weapon slots
const zPrev: number[] = [];
const zHitT: number[] = [];
const mag: number[] = [];
const res: number[] = [];

// player
let px = 8.5;
let py = 12;
let pa = 0;
let hp = 100;
let wpn = 0;
let wcur = 0;
let pts = 500;
let prevE = false;
let prev1 = false;
let prev2 = false;
let promptCost = 0;
let noPtsUntil = 0;
// lobby: 0 title card, 1 main menu, 2 connecting, 3 online lobby, 4 playing
let mode = 0;
let offline = false;
let wantJoin = false;
let wantRestart = false;
let othersInGame = 0;
let nextFire = 0;
let reloadEnd = 0;
let stepPhase = 0;
let hurtAt = -9;
let hurtSnd = 0;
let myShot = 0;
let repairAt = 0;
let nearBar = -1;
let msgCost = 0;
let msgUntil = 0;
let bannerUntil = 0;
let clearedUntil = 0;
let emptyAt = 0;
let prevQ = false;
let prevR = false;
let prevClick = false;
let groanAt = 0;
// camera
let dirX = 1;
let dirY = 0;
let plX = 0;
let plY = PLANE;
let horizon = 0;
// shared world state (host owns it, clients receive it)
let hWave = 0;
let hPhase = 0;
let hScore = 0;
let hGame = 0;
let hSeq = 10;
let lastWave = 0;
let lastPhase = 0;
let myGame = -1;
// host only
let toSpawn = 0;
let nextSpawn = 0;
let inInter = false;
let interEnd = 0;
let aliveCount = 0;
let flowAt = 0;
// network
let isHost = true;
let joinedAt = 0;
let nextTick = 0;
let tick = 0;
let evSign = 1;
let curEv = 0;
let lastSeq1 = -1;
let lastSeq2 = -1;
let players = 1;
// slice() results
let sCost = 0;
let sSize = 0;
let sBr = 0;
// nearest() results
let nX = 0;
let nY = 0;
let nD = 999;
// profiling
export const perf = { ms: 0, fps: 0 };
let fpsCount = 0;
let fpsAt = 0;

/** @warp */
function initWorld() {
  map.length = 0;
  bhp.length = 0;
  flow.length = 0;
  for (let i = 0; i < MW * MW; i++) {
    const t = Number(MAP[i]);
    map.push(t);
    bhp.push(t === 4 ? 100 : 0);
    flow.push(9999);
  }
  barCell.length = 0;
  for (let i = 0; i < MW * MW; i++) {
    if (map[i] === 4) barCell.push(i);
  }
  pk.length = 0;
  for (let i = 0; i < 6; i++) pk.push(0);
  for (let d = 0; d < 4; d++) doorOpen[d] = 0;
  cDepth.length = 0;
  cCost.length = 0;
  cSize.length = 0;
  cBr.length = 0;
  oDepth.length = 0;
  oCost.length = 0;
  oSize.length = 0;
  oBr.length = 0;
  for (let i = 0; i < N; i++) {
    cDepth.push(99);
    cCost.push(1);
    cSize.push(100);
    cBr.push(0);
    oDepth.push(999);
    oCost.push(1);
    oSize.push(100);
    oBr.push(0);
  }
  clearZombies();
  rAct.length = 0;
  rX.length = 0;
  rY.length = 0;
  rA.length = 0;
  rAl.length = 0;
  rShot.length = 0;
  rLastD.length = 0;
  for (let i = 0; i < 6; i++) {
    rAct.push(0);
    rX.push(0);
    rY.push(0);
    rA.push(0);
    rAl.push(0);
    rShot.push(0);
    rLastD.push(0);
  }
  fxX.length = 0;
  fxY.length = 0;
  fxZ.length = 0;
  fxT.length = 0;
  fxK.length = 0;
  evQ.length = 0;
}

/** @warp */
function clearZombies() {
  zt.length = 0;
  zx.length = 0;
  zy.length = 0;
  zs.length = 0;
  zhp.length = 0;
  ztm.length = 0;
  zhx.length = 0;
  zhy.length = 0;
  zox.length = 0;
  zoy.length = 0;
  zan.length = 0;
  hitAcc.length = 0;
  zPrev.length = 0;
  zHitT.length = 0;
  for (let i = 0; i < ZMAX; i++) {
    zt.push(0);
    zx.push(0);
    zy.push(0);
    zs.push(0);
    zhp.push(0);
    ztm.push(0);
    zhx.push(1);
    zhy.push(0);
    zox.push(0);
    zoy.push(0);
    zan.push(0);
    hitAcc.push(0);
    zPrev.push(0);
    zHitT.push(-9);
  }
}

/** Can a player stand here? (walls and intact barricades block) */
/** @warp */
function solidAt(x: number, y: number): boolean {
  const c = Math.floor(x) + Math.floor(y) * MW;
  const t = map[c];
  if (t === 0) return false;
  if (t === 4) return bhp[c] > 0;
  return true;
}

/** @warp */
function resetPlayer() {
  hp = 100;
  wpn = 0;
  game.weapon = 0;
  wsl[0] = 0;
  wsl[1] = -1;
  wcur = 0;
  pts = 500;
  mag.length = 0;
  res.length = 0;
  mag.push(12, 0, 0, 0);
  res.push(999, 0, 0, 0);
  game.down = false;
  game.reloading = false;
  const slot = Math.max(1, Net.session.slot);
  px = 10.5 + (slot % 3) * 1.2;
  py = 12.5;
  pa = -90;
  lastWave = hWave;
}

// ------------------------------------------------------------------ host: waves and spawning

/** @warp */
function restartGame() {
  clearZombies();
  hWave = 0;
  hScore = 0;
  for (let b = 0; b < barCell.length; b++) bhp[barCell[b]] = 100;
  for (let i = 0; i < 6; i++) pk[i] = 0;
  for (let d = 0; d < 4; d++) {
    doorOpen[d] = 0;
    map[doorCell[d]] = 9;
  }
  hGame = (hGame + 1) % 10;
  hPhase = 1;
  inInter = true;
  interEnd = timer() + 3;
  toSpawn = 0;
}

/** @warp */
function spawnPickups() {
  for (let s = 0; s < 6; s++) {
    const zone = pkZ[s];
    if (pk[s] === 0 && random(1, 100) <= 50 && (zone === 0 || doorOpen[zone - 1] === 1)) {
      pk[s] = random(1, 2);
    }
  }
}

/** @warp */
function spawnZombie() {
  let z = -1;
  for (let i = ZMAX - 1; i >= 0; i--) {
    if (zt[i] === 0) z = i;
  }
  if (z < 0) return;
  let p = random(0, 3);
  for (let tries = 0; tries < 12; tries++) {
    const q = random(0, 11);
    if (spawnZ[q] === 0 || doorOpen[spawnZ[q] - 1] === 1) p = q;
  }
  const r = random(1, 100);
  let t = 1;
  if (hWave >= 3 && r <= 35) t = 2;
  if (hWave >= 5 && r <= 6 + hWave) t = 3;
  zt[z] = t;
  zs[z] = 0;
  ztm[z] = 0;
  zx[z] = spawnX[p] + Math.random() * 0.4 - 0.2;
  zy[z] = spawnY[p] + Math.random() * 0.4 - 0.2;
  zox[z] = Math.random() * 0.4 - 0.2;
  zoy[z] = Math.random() * 0.4 - 0.2;
  zhp[z] = ZHP[t - 1] * (1 + 0.07 * (hWave - 1));
  zan[z] = Math.random() * 2;
}

/** @warp */
function hostUpdate() {
  if (hPhase !== 1) return;
  if (inInter) {
    if (timer() > interEnd) {
      hWave++;
      toSpawn = 4 + hWave * 3;
      inInter = false;
      nextSpawn = timer() + 1.5;
      spawnPickups();
    }
  } else {
    if (toSpawn > 0 && timer() > nextSpawn && aliveCount < Math.min(ZMAX, 6 + hWave * 2)) {
      spawnZombie();
      toSpawn--;
      nextSpawn = timer() + Math.max(0.35, 1.8 - hWave * 0.12);
    }
    if (toSpawn === 0 && aliveCount === 0) {
      inInter = true;
      interEnd = timer() + 8;
      clearedUntil = timer() + 2.5;
      me.volume = 70;
      playSound("cleared");
    }
  }
  // everybody down: game over
  let anyAlive = !game.down;
  for (let r = 0; r < 6; r++) {
    if (rAct[r] === 1 && rAl[r] === 1) anyAlive = true;
  }
  if (!anyAlive) hPhase = 2;
}

/** @warp */
function applyDamage(z: number, dmg: number) {
  if (zt[z] === 0 || zs[z] === 2) return;
  zhp[z] = zhp[z] - dmg;
  if (zhp[z] <= 0) {
    zs[z] = 2;
    ztm[z] = 0;
    hScore += ZPTS[zt[z] - 1];
  }
}

/** @warp */
function openDoor(d: number) {
  doorOpen[d] = 1;
  map[doorCell[d]] = 0;
  flowAt = 0;
}

/** Host: apply an event code sent by another player. */
/** @warp */
function applyEvent(code: number) {
  if (code >= 100) {
    applyDamage(Math.floor(code / 100) - 1, code % 100);
  } else if (code >= 50 && code < 56) {
    pk[code - 50] = 0;
  } else if (code >= 20 && code < 24) {
    openDoor(code - 20);
  } else if (code === 98) {
    restartGame();
  } else if (code >= 10 && code < 18) {
    const c = barCell[code - 10];
    bhp[c] = Math.min(100, bhp[c] + 9);
    hScore += 2;
  } else if (code === 99) {
    if (hPhase === 2) restartGame();
  }
}

// ------------------------------------------------------------------ zombies

/** Flow field: breadth-first steps from every living player, through open cells and barricades. */
/** @warp */
function buildFlow() {
  for (let i = 0; i < MW * MW; i++) flow[i] = 9999;
  queue.length = 0;
  if (!game.down && game.started) {
    const c = Math.floor(px) + Math.floor(py) * MW;
    flow[c] = 0;
    queue.push(c);
  }
  for (let r = 0; r < 6; r++) {
    if (rAct[r] === 1 && rAl[r] === 1) {
      const c2 = Math.floor(rX[r]) + Math.floor(rY[r]) * MW;
      if (flow[c2] > 0) {
        flow[c2] = 0;
        queue.push(c2);
      }
    }
  }
  let head = 0;
  while (head < queue.length) {
    const q = queue[head];
    head++;
    const d = flow[q] + 1;
    visit(q - 1, d);
    visit(q + 1, d);
    visit(q - MW, d);
    visit(q + MW, d);
  }
}

/** @warp */
function visit(n: number, d: number) {
  if (flow[n] > d) {
    const t = map[n];
    if (t === 0 || t === 4) {
      flow[n] = d;
      queue.push(n);
    }
  }
}

/** Nearest living player to (x, y): sets nX, nY, nD. */
/** @warp */
function nearest(x: number, y: number) {
  nD = 999;
  if (!game.down && game.started) {
    nD = Math.sqrt((px - x) * (px - x) + (py - y) * (py - y));
    nX = px;
    nY = py;
  }
  for (let r = 0; r < 6; r++) {
    if (rAct[r] === 1 && rAl[r] === 1) {
      const d = Math.sqrt((rX[r] - x) * (rX[r] - x) + (rY[r] - y) * (rY[r] - y));
      if (d < nD) {
        nD = d;
        nX = rX[r];
        nY = rY[r];
      }
    }
  }
}

/** @warp */
function stepZombie(z: number, dt: number) {
  const x = zx[z];
  const y = zy[z];
  const t = zt[z] - 1;
  nearest(x, y);
  if (nD < 0.75) {
    zs[z] = 1;
    zhx[z] = (nX - x) / Math.max(0.01, nD);
    zhy[z] = (nY - y) / Math.max(0.01, nD);
    zan[z] = zan[z] + dt * 3;
    return;
  }
  let tx = x;
  let ty = y;
  let useFlow = true;
  if (nD < 1.6) {
    const blocked = solidAt(x + ((nX - x) / nD) * 0.35, y + ((nY - y) / nD) * 0.35);
    if (!blocked) {
      tx = nX;
      ty = nY;
      useFlow = false;
    }
  }
  if (useFlow) {
    const c = Math.floor(x) + Math.floor(y) * MW;
    let best = c;
    let bv = flow[c];
    if (flow[c - 1] < bv) {
      best = c - 1;
      bv = flow[best];
    }
    if (flow[c + 1] < bv) {
      best = c + 1;
      bv = flow[best];
    }
    if (flow[c - MW] < bv) {
      best = c - MW;
      bv = flow[best];
    }
    if (flow[c + MW] < bv) {
      best = c + MW;
      bv = flow[best];
    }
    if (best === c) {
      // no path (or already in the target cell): idle sway
      zs[z] = 0;
      zan[z] = zan[z] + dt;
      return;
    }
    if (map[best] === 4 && bhp[best] > 0) {
      // claw at the barricade
      zs[z] = 1;
      zhx[z] = (best % MW) + 0.5 - x;
      zhy[z] = Math.floor(best / MW) + 0.5 - y;
      zan[z] = zan[z] + dt * 3;
      if (isHost) {
        bhp[best] = bhp[best] - ZDPS[t] * 0.16 * dt;
        if (bhp[best] <= 0) {
          bhp[best] = 0;
          me.volume = 100;
          playSound("crack");
        }
      }
      return;
    }
    tx = (best % MW) + 0.5 + zox[z];
    ty = Math.floor(best / MW) + 0.5 + zoy[z];
  }
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.sqrt(dx * dx + dy * dy);
  zs[z] = 0;
  if (d > 0.01) {
    const step = Math.min(d, ZSPEED[t] * dt);
    zx[z] = x + (dx / d) * step;
    zy[z] = y + (dy / d) * step;
    zhx[z] = dx / d;
    zhy[z] = dy / d;
  }
  zan[z] = zan[z] + dt * ZSPEED[t] * 2.4;
}

/** @warp */
function updateZombies(dt: number) {
  aliveCount = 0;
  for (let z = 0; z < ZMAX; z++) {
    if (zt[z] > 0) {
      aliveCount++;
      if (zs[z] === 2 && zPrev[z] !== 2 && timer() - zHitT[z] < 1.5) pts += zt[z] === 3 ? 100 : 60;
      zPrev[z] = zs[z];
      if (zs[z] === 2) {
        ztm[z] = ztm[z] + dt;
        if (isHost && ztm[z] > 1.3) {
          zt[z] = 0;
          zPrev[z] = 0;
        }
      } else {
        stepZombie(z, dt);
      }
    }
  }
  // an occasional groan from a random zombie, louder when it's close
  if (timer() > groanAt && aliveCount > 0) {
    groanAt = timer() + 1 + Math.random() * 2.5;
    const z = random(0, ZMAX - 1);
    if (zt[z] > 0 && zs[z] !== 2) {
      const d = Math.sqrt((zx[z] - px) * (zx[z] - px) + (zy[z] - py) * (zy[z] - py));
      me.volume = Math.max(8, 100 - d * 9);
      if (zs[z] === 1) playSound("zattack");
      else playSound(random(1, 3) === 1 ? "groan1" : random(1, 2) === 1 ? "groan2" : "groan3");
    }
  }
}

// ------------------------------------------------------------------ player

/** @warp */
function addFx(x: number, y: number, z: number, k: number) {
  if (fxX.length > 14) {
    fxX.remove(0);
    fxY.remove(0);
    fxZ.remove(0);
    fxT.remove(0);
    fxK.remove(0);
  }
  fxX.push(x);
  fxY.push(y);
  fxZ.push(z);
  fxT.push(timer());
  fxK.push(k);
}

/** Hitscan one bullet at angle b. */
/** @warp */
function shootRay(b: number, dmg: number) {
  const cb = cos(b);
  const sb = sin(b);
  const rel = b - pa;
  const camX = tan(rel) / PLANE;
  const col = Math.max(0, Math.min(N - 1, Math.floor(((camX + 1) / 2) * N)));
  const wallD = cDepth[col] / cos(rel);
  let best = -1;
  let bd = wallD;
  for (let z = 0; z < ZMAX; z++) {
    if (zt[z] > 0 && zs[z] !== 2) {
      const dx = zx[z] - px;
      const dy = zy[z] - py;
      const along = dx * cb + dy * sb;
      if (along > 0.1 && along < bd) {
        const off = Math.abs(dy * cb - dx * sb);
        if (off < ZRAD[zt[z] - 1]) {
          best = z;
          bd = along;
        }
      }
    }
  }
  if (best >= 0) {
    hitAcc[best] = hitAcc[best] + dmg;
    addFx(px + cb * (bd - 0.2), py + sb * (bd - 0.2), 0.45 + Math.random() * 0.3, C_FX_GOO);
  } else {
    addFx(px + cb * (wallD - 0.08), py + sb * (wallD - 0.08), 0.25 + Math.random() * 0.5, C_FX_DUST);
  }
}

/** @warp */
function fire() {
  mag[wpn] = mag[wpn] - 1;
  game.shotSeq++;
  game.fireAt = timer();
  myShot = 1 - myShot;
  nextFire = timer() + W_RATE[wpn];
  for (let z = 0; z < ZMAX; z++) hitAcc[z] = 0;
  const pel = W_PEL[wpn];
  const spr = W_SPR[wpn];
  for (let p = 0; p < pel; p++) {
    let off = (Math.random() * 2 - 1) * spr;
    if (pel > 1) off = -spr + (2 * spr * p) / (pel - 1) + Math.random() - 0.5;
    shootRay(pa + off, W_DMG[wpn]);
  }
  let any = false;
  for (let z = 0; z < ZMAX; z++) {
    if (hitAcc[z] > 0) {
      any = true;
      pts += 10;
      zHitT[z] = timer();
      if (isHost) applyDamage(z, hitAcc[z]);
      else evQ.push((z + 1) * 100 + Math.min(99, hitAcc[z]));
    }
  }
  if (any) {
    me.volume = 80;
    playSound("hit");
  }
}

/** @warp */
function startReload() {
  if (game.reloading || mag[wpn] >= W_MAG[wpn] || res[wpn] <= 0) return;
  game.reloading = true;
  reloadEnd = timer() + W_RELOAD[wpn];
  game.reloadSeq++;
}

/** @warp */
function selectSlot(i: number) {
  if (wsl[i] < 0 || i === wcur) return;
  wcur = i;
  wpn = wsl[i];
  game.weapon = wpn;
  game.reloading = false;
  nextFire = timer() + 0.35;
  game.switchSeq++;
}

/** @warp */
function switchWeapon() {
  selectSlot(1 - wcur);
}

/** @warp */
function takePickup(s: number) {
  const k = pk[s];
  if (k === 1) {
    // ammo crate: top up every gun you carry
    let need = false;
    for (let i = 0; i < 2; i++) {
      const w = wsl[i];
      if (w > 0 && res[w] < W_MAXRES[w]) {
        need = true;
        res[w] = W_MAXRES[w];
      }
    }
    if (!need) return;
  }
  if (k === 2) {
    if (hp >= 100) return;
    hp = Math.min(100, hp + 50);
  }
  pk[s] = 0;
  if (!isHost) evQ.push(50 + s);
  me.volume = 90;
  playSound("pickup");
}

/** What the player faces: sets promptCost to the prompt costume (0 = nothing) and handles E. */
/** @warp */
function interact(ePressed: boolean) {
  promptCost = 0;
  const c = Math.floor(px + cos(pa) * 0.9) + Math.floor(py + sin(pa) * 0.9) * MW;
  const t = map[c];
  if (t === 9) {
    promptCost = C_BUY_DOOR;
    if (ePressed) {
      if (pts >= DOOR_COST) {
        let d = 0;
        for (let i = 0; i < 4; i++) {
          if (doorCell[i] === c) d = i;
        }
        pts -= DOOR_COST;
        me.volume = 100;
        playSound("crack");
        map[c] = 0; // clear it here right away; the host makes it official for everyone
        if (isHost) openDoor(d);
        else evQ.push(20 + d);
      } else noPtsUntil = timer() + 1.2;
    }
    return;
  }
  if (t < 6 || t > 8) return;
  let w = 1;
  if (t === 7) w = 3;
  if (t === 8) w = 2;
  const owned = wsl[0] === w || wsl[1] === w;
  let price = W_PRICE[w];
  let off = 2;
  if (w === 1) off = 0;
  if (w === 2) off = 1;
  if (owned) {
    price = price / 2;
    promptCost = C_AMMO_SHOTGUN + off;
  } else {
    promptCost = C_BUY_SHOTGUN + off;
  }
  if (!ePressed) return;
  if (pts < price) {
    noPtsUntil = timer() + 1.2;
    return;
  }
  pts -= price;
  if (!owned) {
    let slot = wcur;
    if (wsl[1] < 0) slot = 1;
    wsl[slot] = w;
    wcur = slot;
    wpn = w;
    game.weapon = w;
    game.reloading = false;
    game.switchSeq++;
  }
  mag[w] = W_MAG[w];
  res[w] = W_MAXRES[w];
  me.volume = 90;
  playSound("pickup");
}

/** @warp */
function updatePlayer(dt: number) {
  game.bob = game.bob * 0.8;
  if (game.down) {
    let turnD = 0;
    if (keyPressed("right arrow") || keyPressed("d")) turnD++;
    if (keyPressed("left arrow") || keyPressed("a")) turnD--;
    pa += turnD * 120 * dt;
    return;
  }
  let turn = 0;
  if (keyPressed("right arrow")) turn++;
  if (keyPressed("left arrow")) turn--;
  pa += turn * 150 * dt;
  let fwd = 0;
  if (keyPressed("w") || keyPressed("up arrow")) fwd++;
  if (keyPressed("s") || keyPressed("down arrow")) fwd--;
  let str = 0;
  if (keyPressed("d")) str++;
  if (keyPressed("a")) str--;
  const ca = cos(pa);
  const sa = sin(pa);
  let mvx = ca * fwd - sa * str;
  let mvy = sa * fwd + ca * str;
  const ml = Math.sqrt(mvx * mvx + mvy * mvy);
  if (ml > 0) {
    const sp = (2.7 * dt) / ml;
    mvx = mvx * sp;
    mvy = mvy * sp;
    const nx = px + mvx;
    const ex = nx + (mvx > 0 ? 0.22 : -0.22);
    const b1 = solidAt(ex, py - 0.18);
    const b2 = solidAt(ex, py + 0.18);
    if (!b1 && !b2) px = nx;
    const ny = py + mvy;
    const ey = ny + (mvy > 0 ? 0.22 : -0.22);
    const b3 = solidAt(px - 0.18, ey);
    const b4 = solidAt(px + 0.18, ey);
    if (!b3 && !b4) py = ny;
    const before = Math.floor(stepPhase / 180);
    stepPhase += dt * 560;
    if (Math.floor(stepPhase / 180) !== before) {
      me.volume = 30;
      playSound("step");
    }
    game.bob = sin(stepPhase) * 5;
  }
  // weapons
  if (game.reloading && timer() > reloadEnd) {
    game.reloading = false;
    const take = Math.min(W_MAG[wpn] - mag[wpn], res[wpn]);
    mag[wpn] = mag[wpn] + take;
    if (wpn > 0) res[wpn] = res[wpn] - take;
  }
  const rNow = keyPressed("r");
  if (rNow && !prevR) startReload();
  prevR = rNow;
  const qNow = keyPressed("q");
  if (qNow && !prevQ) switchWeapon();
  prevQ = qNow;
  const k1 = keyPressed("1");
  if (k1 && !prev1) selectSlot(0);
  prev1 = k1;
  const k2 = keyPressed("2");
  if (k2 && !prev2) selectSlot(1);
  prev2 = k2;
  const eNow = keyPressed("e");
  interact(eNow && !prevE);
  prevE = eNow;
  if ((mouseDown() || keyPressed("space")) && timer() >= nextFire && !game.reloading) {
    if (mag[wpn] > 0) {
      fire();
    } else if (res[wpn] > 0) {
      startReload();
    } else if (timer() > emptyAt) {
      emptyAt = timer() + 0.4;
      game.emptySeq++;
    }
  }
  // pickups
  for (let s = 0; s < 6; s++) {
    if (pk[s] > 0 && Math.abs(pkX[s] - px) < 0.6 && Math.abs(pkY[s] - py) < 0.6) takePickup(s);
  }
  // barricade repair
  nearBar = -1;
  for (let b = 0; b < barCell.length; b++) {
    const c = barCell[b];
    const bx = (c % MW) + 0.5;
    const by = Math.floor(c / MW) + 0.5;
    if (bhp[c] < 95 && Math.abs(bx - px) < 1.6 && Math.abs(by - py) < 1.6) nearBar = b;
  }
  if (nearBar >= 0 && promptCost === 0 && keyPressed("e") && timer() > repairAt) {
    repairAt = timer() + 0.3;
    me.volume = 70;
    playSound("hammer");
    if (isHost) applyEvent(10 + nearBar);
    else evQ.push(10 + nearBar);
  }
  // zombie claws
  let dmg = 0;
  for (let z = 0; z < ZMAX; z++) {
    if (zt[z] > 0 && zs[z] === 1) {
      if (Math.abs(zx[z] - px) < 0.85 && Math.abs(zy[z] - py) < 0.85) dmg += ZDPS[zt[z] - 1] * dt;
    }
  }
  if (dmg > 0) {
    hp -= dmg;
    hurtAt = timer();
    if (timer() > hurtSnd) {
      hurtSnd = timer() + 0.6;
      me.volume = 90;
      playSound("hurt");
    }
    if (hp <= 0) {
      hp = 0;
      game.down = true;
      game.reloading = false;
      me.volume = 100;
      playSound("zdie");
    }
  }
}

// ------------------------------------------------------------------ networking

/** Read the other players; pick the host (lowest in-game slot); host applies their events. */
/** @warp */
function netRead() {
  othersInGame = 0;
  if (offline) {
    isHost = true;
    players = 1;
    return;
  }
  const mine = Net.session.slot;
  let hostSlot = 99;
  if (game.started && mine > 0) hostSlot = mine;
  players = game.started ? 1 : 0;
  for (let i = 1; i <= 6; i++) {
    const r = i - 1;
    let act = false;
    if (i !== mine && timer() > joinedAt + 3.5) act = Net.readPlayer(i);
    if (act && Net.pc >= 1152) {
      players++;
      othersInGame++;
      if (i < hostSlot) hostSlot = i;
      const c = Net.pc;
      const tx = Net.pa / 100;
      const ty = Net.pb / 100;
      if (rAct[r] === 0) {
        rX[r] = tx;
        rY[r] = ty;
        rLastD[r] = Net.pd;
        rShot[r] = Math.floor(c / 576) % 2;
      } else {
        rX[r] = rX[r] + (tx - rX[r]) * 0.3;
        rY[r] = rY[r] + (ty - rY[r]) * 0.3;
      }
      rA[r] = (c % 72) * 5;
      rAl[r] = Math.floor(c / 288) % 2;
      const shot = Math.floor(c / 576) % 2;
      if (shot !== rShot[r]) {
        rShot[r] = shot;
        const d = Math.sqrt((rX[r] - px) * (rX[r] - px) + (rY[r] - py) * (rY[r] - py));
        me.volume = Math.max(10, 90 - d * 6);
        playSound("distshot");
      }
      if (Net.pd !== rLastD[r]) {
        rLastD[r] = Net.pd;
        if (isHost && Net.pd !== 0) applyEvent(Math.abs(Net.pd));
      }
      rAct[r] = 1;
    } else {
      rAct[r] = 0;
    }
  }
  isHost = mine === 0 || hostSlot === mine || hostSlot === 99;
}

/** @warp */
function digit(v: string, i: number): number {
  return Number(v[i]);
}

/** @warp */
function num3(v: string, i: number): number {
  return Number(v[i]) * 100 + Number(v[i + 1]) * 10 + Number(v[i + 2]);
}

/** @warp */
function readZombie(z: number, v: string, o: number) {
  const t = Number(v[o]);
  if (t === 0) {
    zt[z] = 0;
    return;
  }
  const s = Number(v[o + 1]);
  const nx = num3(v, o + 2) / 40;
  const ny = num3(v, o + 5) / 40;
  if (zt[z] !== t) {
    zx[z] = nx;
    zy[z] = ny;
    ztm[z] = 0;
    zox[z] = Math.random() * 0.4 - 0.2;
    zoy[z] = Math.random() * 0.4 - 0.2;
  } else {
    zx[z] = zx[z] + (nx - zx[z]) * 0.5;
    zy[z] = zy[z] + (ny - zy[z]) * 0.5;
  }
  if (s === 2 && zs[z] !== 2) {
    ztm[z] = 0;
    me.volume = 70;
    playSound("zdie");
  }
  zs[z] = s;
  zt[z] = t;
}

/** Client: unpack the host's world packets when they change. */
/** @warp */
function readPackets() {
  const v1 = String(zcloud.z1);
  if (v1.length >= 149) {
    const sq = Number(v1[1]) * 10 + Number(v1[2]);
    if (sq !== lastSeq1) {
      lastSeq1 = sq;
      hWave = Number(v1[3]) * 10 + Number(v1[4]);
      hPhase = Number(v1[5]);
      hGame = Number(v1[6]);
      let sc = 0;
      for (let k = 7; k < 13; k++) sc = sc * 10 + Number(v1[k]);
      hScore = sc;
      for (let b = 0; b < barCell.length; b++) bhp[barCell[b]] = Math.min(100, Number(v1[13 + b]) * 11.2);
      for (let s = 0; s < 6; s++) pk[s] = Number(v1[21 + s]);
      const mask = Number(v1[27]) * 10 + Number(v1[28]);
      let bit = 1;
      for (let d = 0; d < 4; d++) {
        doorOpen[d] = Math.floor(mask / bit) % 2;
        if (doorOpen[d] === 1) map[doorCell[d]] = 0;
        else map[doorCell[d]] = 9;
        bit = bit * 2;
      }
      for (let z = 0; z < 15; z++) readZombie(z, v1, 29 + z * 8);
    }
  }
  const v2 = String(zcloud.z2);
  if (v2.length >= 123) {
    const sq2 = Number(v2[1]) * 10 + Number(v2[2]);
    if (sq2 !== lastSeq2) {
      lastSeq2 = sq2;
      for (let z = 15; z < 30; z++) readZombie(z, v2, 3 + (z - 15) * 8);
    }
  }
}

/** @warp */
function packZombies(from: number, to: number): string {
  let s = "";
  for (let z = from; z < to; z++) {
    if (zt[z] > 0) {
      const a = Net.pad(Math.round(Math.max(0, zx[z]) * 40), 3);
      const b = Net.pad(Math.round(Math.max(0, zy[z]) * 40), 3);
      s = s + zt[z] + zs[z] + a + b;
    } else {
      s = s + "00000000";
    }
  }
  return s;
}

/** @warp */
function netSend() {
  if (Net.session.slot === 0 || timer() < nextTick) return;
  nextTick = timer() + 0.105;
  tick++;
  if (isHost && game.started && tick % 2 === 1) {
    hSeq++;
    if (hSeq > 99) hSeq = 10;
    if (tick % 4 === 1) {
      let s = "1" + hSeq + Net.pad(hWave % 100, 2) + hPhase + hGame;
      const sc = Net.pad(Math.min(999999, hScore), 6);
      s = s + sc;
      for (let b = 0; b < 8; b++) {
        if (b < barCell.length) s = s + Math.ceil(bhp[barCell[b]] / 11.2);
        else s = s + "0";
      }
      for (let k = 0; k < 6; k++) s = s + pk[k];
      const dm = Net.pad(doorOpen[0] + doorOpen[1] * 2 + doorOpen[2] * 4 + doorOpen[3] * 8, 2);
      s = s + dm;
      const zs1 = packZombies(0, 15);
      zcloud.z1 = (s + zs1) as unknown as number;
    } else {
      const zs2 = packZombies(15, 30);
      zcloud.z2 = ("1" + hSeq + zs2) as unknown as number;
    }
    return;
  }
  if (evQ.length > 0) {
    evSign = -evSign;
    curEv = evQ[0] * evSign;
    evQ.remove(0);
  }
  let c = Math.floor((((pa % 360) + 360) % 360) / 5) + 72 * wpn + 576 * myShot;
  if (!game.down) c += 288;
  if (game.started) c += 1152;
  Net.sendState(px * 100, py * 100, c, curEv);
}

// ------------------------------------------------------------------ rendering

/** Texture slice for a wall hit: sets sCost, sSize, sBr. */
/** @warp */
function slice(tex: number, perp: number, side: number, rdx: number, rdy: number) {
  let wx = 0;
  if (side === 0) wx = py + perp * rdy;
  else wx = px + perp * rdx;
  wx = wx - Math.floor(wx);
  let tx = Math.floor(wx * 32);
  if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = 31 - tx;
  const h = PROJ / Math.max(perp, 0.05);
  const q = h / CW;
  let ri = 4;
  if (q < 4) ri = 0;
  else if (q < 8) ri = 1;
  else if (q < 16) ri = 2;
  else if (q < 32) ri = 3;
  sCost = (tex - 1) * 160 + ri * 32 + tx + 1;
  sSize = h * 1.5625;
  sBr = -Math.min(90, perp * 5.6 + side * 14);
}

/** Cast all columns and stamp the walls (and barricade overlays). */
/** @warp */
function castWalls() {
  for (let i = 0; i < N; i++) {
    const camX = (2 * (i + 0.5)) / N - 1;
    let rdx = dirX + plX * camX;
    let rdy = dirY + plY * camX;
    if (Math.abs(rdx) < 0.00001) rdx = 0.00001;
    if (Math.abs(rdy) < 0.00001) rdy = 0.00001;
    let mx = Math.floor(px);
    let my = Math.floor(py);
    const ddx = Math.abs(1 / rdx);
    const ddy = Math.abs(1 / rdy);
    let stx = 1;
    let sty = 1;
    let sdx = (mx + 1 - px) * ddx;
    let sdy = (my + 1 - py) * ddy;
    if (rdx < 0) {
      stx = -1;
      sdx = (px - mx) * ddx;
    }
    if (rdy < 0) {
      sty = -1;
      sdy = (py - my) * ddy;
    }
    let hit = 0;
    let side = 0;
    let t = 0;
    oDepth[i] = 999;
    while (hit === 0) {
      if (sdx < sdy) {
        sdx += ddx;
        mx += stx;
        side = 0;
      } else {
        sdy += ddy;
        my += sty;
        side = 1;
      }
      const c = mx + my * MW;
      t = map[c];
      if (t > 0) {
        if (t === 4) {
          if (bhp[c] > 0 && oDepth[i] > 900) {
            let od = sdy - ddy;
            if (side === 0) od = sdx - ddx;
            slice(bhp[c] < 50 ? 10 : 4, od, side, rdx, rdy);
            oDepth[i] = od;
            oCost[i] = sCost;
            oSize[i] = sSize;
            oBr[i] = sBr;
          }
        } else {
          hit = 1;
        }
      }
    }
    let perp = sdy - ddy;
    if (side === 0) perp = sdx - ddx;
    slice(t, perp, side, rdx, rdy);
    cDepth[i] = perp;
    cCost[i] = sCost;
    cSize[i] = sSize;
    cBr[i] = sBr;
    switchCostume(sCost);
    me.size = sSize;
    setEffect("brightness", sBr);
    goTo(i * CW - 238, horizon);
    stamp();
  }
  // barricades (they have gaps) go over the walls behind them
  for (let i = 0; i < N; i++) {
    if (oDepth[i] < 900) {
      switchCostume(oCost[i]);
      me.size = oSize[i];
      setEffect("brightness", oBr[i]);
      goTo(i * CW - 238, horizon);
      stamp();
    }
  }
}

/** Queue a billboard at world (wx, wy). hWorld: world height of the costume; cpx: costume height in pixels;
 * lift: height of its bottom above the floor; halfW: half width as a fraction of its height. */
/** @warp */
function addObj(wx: number, wy: number, cost: number, hWorld: number, cpx: number, lift: number, halfW: number, ghost: number) {
  const dx = wx - px;
  const dy = wy - py;
  const depth = dx * dirX + dy * dirY;
  if (depth < 0.2) return;
  const sx = ((dy * dirX - dx * dirY) / depth) * PROJ;
  const hs = (PROJ * hWorld) / depth;
  if (Math.abs(sx) > 240 + hs * halfW) return;
  let k = 0;
  while (k < bD.length && bD[k] > depth) k++;
  bD.insert(k, depth);
  bX.insert(k, sx);
  bY.insert(k, horizon + (PROJ * (lift - 0.5)) / depth + hs / 2);
  bS.insert(k, (hs / cpx) * 100);
  bC.insert(k, cost);
  bB.insert(k, -Math.min(88, depth * 5.6));
  bG.insert(k, ghost);
  bW.insert(k, hs * halfW);
}

/** @warp */
function zombieCostume(z: number): number {
  const base = C_WALKER_FA + (zt[z] - 1) * 7;
  if (zs[z] === 2) {
    if (ztm[z] < 0.25) return base + 5;
    return base + 6;
  }
  const frame = Math.floor(zan[z]) % 2;
  if (zs[z] === 1) {
    if (frame === 0) return base + 4;
    return base;
  }
  // facing the viewer? (heading . toViewer > 0)
  if (zhx[z] * (px - zx[z]) + zhy[z] * (py - zy[z]) >= 0) return base + frame;
  return base + 2 + frame;
}

/** @warp */
function collectObjects() {
  bD.length = 0;
  bX.length = 0;
  bY.length = 0;
  bS.length = 0;
  bC.length = 0;
  bB.length = 0;
  bG.length = 0;
  bW.length = 0;
  for (let z = 0; z < ZMAX; z++) {
    if (zt[z] > 0) {
      const cost = zombieCostume(z);
      let ghost = 0;
      if (zs[z] === 2) ghost = Math.max(0, Math.min(100, (ztm[z] - 0.6) * 150));
      addObj(zx[z], zy[z], cost, ZH[zt[z] - 1], 160, 0, zs[z] === 2 ? 0.45 : 0.2, ghost);
    }
  }
  for (let s = 0; s < 6; s++) {
    if (pk[s] > 0) addObj(pkX[s], pkY[s], C_PK_AMMO + pk[s] - 1, 0.42, 64, 0, 0.5, 0);
  }
  for (let r = 0; r < 6; r++) {
    if (rAct[r] === 1) {
      let cost = C_SOLDIER_DOWN;
      if (rAl[r] === 1) {
        // which side of them do we see?
        const toMe = MathX.atan2(py - rY[r], px - rX[r]);
        const diff = (((rA[r] - toMe) % 360) + 360) % 360;
        cost = C_SOLDIER_BACK;
        if (diff < 45 || diff > 315) cost = C_SOLDIER_FRONT;
        else if (diff < 135) cost = C_SOLDIER_LEFT;
        else if (diff > 225) cost = C_SOLDIER_RIGHT;
      }
      addObj(rX[r], rY[r], cost, 1.0, 160, 0, 0.2, 0);
    }
  }
  for (let f = fxX.length - 1; f >= 0; f--) {
    const age = timer() - fxT[f];
    if (age > 0.4) {
      fxX.remove(f);
      fxY.remove(f);
      fxZ.remove(f);
      fxT.remove(f);
      fxK.remove(f);
    } else {
      const g = 0.18 + age * 0.6;
      addObj(fxX[f], fxY[f], fxK[f], g, 64, fxZ[f] - g / 2, 0.5, age * 220);
    }
  }
}

/** @warp */
function restampCol(c: number, d: number) {
  if (cDepth[c] < d) {
    switchCostume(cCost[c]);
    me.size = cSize[c];
    setEffect("brightness", cBr[c]);
    goTo(c * CW - 238, horizon);
    stamp();
  }
  if (oDepth[c] < d) {
    switchCostume(oCost[c]);
    me.size = oSize[c];
    setEffect("brightness", oBr[c]);
    goTo(c * CW - 238, horizon);
    stamp();
  }
}

/** @warp */
function drawObjects() {
  for (let k = 0; k < bD.length; k++) {
    const d = bD[k];
    const c0 = Math.max(0, Math.floor((bX[k] - bW[k] + 240) / CW));
    const c1 = Math.min(N - 1, Math.floor((bX[k] + bW[k] + 240) / CW));
    const cm = Math.max(0, Math.min(N - 1, Math.floor((bX[k] + 240) / CW)));
    // skip it when walls cover it completely
    if (!(cDepth[c0] < d && cDepth[c1] < d && cDepth[cm] < d)) {
      switchCostume(bC[k]);
      me.size = bS[k];
      setEffect("brightness", bB[k]);
      setEffect("ghost", bG[k]);
      goTo(bX[k], bY[k]);
      stamp();
      setEffect("ghost", 0);
      for (let c = c0; c <= c1; c++) restampCol(c, d);
    }
  }
}

/** Stamp a number with the digit costumes. align: 0 left, 0.5 centre, 1 right. */
/** @warp */
function drawNum(n: number, x: number, y: number, sc: number, align: number) {
  const s = String(Math.max(0, Math.floor(n)));
  const w = (15 * sc) / 100;
  me.size = sc;
  const x0 = x - align * w * s.length;
  for (let k = 0; k < s.length; k++) {
    switchCostume(C_D0 + Number(s[k]));
    goTo(x0 + w * k + w / 2, y);
    stamp();
  }
}

/** @warp */
function stampAt(cost: number, x: number, y: number) {
  switchCostume(cost);
  goTo(x, y);
  stamp();
}

/** @warp */
function drawHud() {
  clearEffects();
  me.size = 100;
  if (hPhase === 1 && !game.down) stampAt(C_CROSSHAIR, 0, 0);
  // wave + score
  stampAt(C_HUD_WAVE, -178, 157);
  drawNum(hWave, -149, 157, 100, 0);
  me.size = 100;
  stampAt(C_HUD_SCORE, 163, 157);
  drawNum(pts, 228, 157, 100, 1);
  if (players > 1) {
    me.size = 100;
    stampAt(C_HUD_PLAYERS, -195, 127);
    drawNum(players, -180, 127, 80, 0);
  }
  // health
  me.size = 100;
  stampAt(C_HUD_HP, -153, -158);
  Draw.line(-204, -158, -134, -158, 12, "#2A1C1A");
  if (hp > 0) Draw.line(-204, -158, -204 + hp * 0.7, -158, 10, hp < 35 ? "#E04A3C" : "#7CC444");
  drawNum(hp, -124, -158, 100, 0);
  // ammo
  me.size = 100;
  stampAt(C_HUD_AMMO, 163, -158);
  stampAt(C_HUD_WEAPON_PISTOL + wpn, 163, -130);
  drawNum(mag[wpn], 128, -158, 100, 0);
  const mx = 128 + 15 * String(mag[wpn]).length;
  me.size = 100;
  stampAt(C_DSLASH, mx + 7, -158);
  if (wpn === 0) stampAt(C_DINF, mx + 23, -158);
  else drawNum(res[wpn], mx + 15, -158, 100, 0);
  me.size = 100;
  // messages
  if (game.reloading) stampAt(C_MSG_RELOAD, 0, 104);
  else if (mag[wpn] === 0 && res[wpn] === 0) stampAt(C_MSG_NOAMMO, 0, 104);
  if (timer() < noPtsUntil) stampAt(C_MSG_NOPOINTS, 0, 128);
  else if (promptCost > 0 && !game.down) stampAt(promptCost, 0, 128);
  else if (nearBar >= 0 && !game.down) stampAt(C_MSG_REPAIR, 0, 128);
  if (timer() < msgUntil) stampAt(msgCost, 0, 40);
  if (timer() < clearedUntil) stampAt(C_MSG_CLEARED, 0, 70);
  if (timer() < bannerUntil) {
    stampAt(C_BIG_WAVE, -30, 70);
    drawNum(hWave, 72, 70, 200, 0.5);
    me.size = 100;
  }
  if (timer() - hurtAt < 0.35 || (hp < 35 && hPhase === 1)) {
    setEffect("ghost", timer() - hurtAt < 0.35 ? 20 : 65);
    stampAt(C_VIGNETTE, 0, 0);
    setEffect("ghost", 0);
  }
  if (game.down && hPhase === 1) stampAt(C_MSG_DOWN, 0, 40);
  if (hPhase === 0) stampAt(C_MSG_WAIT, 0, 40);
  if (hPhase === 2) {
    stampAt(C_MSG_GAMEOVER, 0, 0);
    drawNum(hWave, -70, -45, 150, 0.5);
    drawNum(pts, 70, -45, 150, 0.5);
  }
}

/** @warp */
function startGame() {
  mode = 4;
  game.started = true;
  prevClick = true;
}

/** @warp */
function inBtn(top: number): boolean {
  // buttons are 240 x 44 at svg y = top (menu costumes are 480 x 360, centred)
  return Math.abs(mouseX()) < 120 && mouseY() < 180 - top && mouseY() > 136 - top;
}

/** Title card, main menu and online lobby (the world slowly pans behind it). */
/** @warp */
function lobby(dt: number) {
  pa += 6 * dt;
  const click = mouseDown();
  const edge = click && !prevClick;
  prevClick = click;
  let menu = 0;
  if (mode === 0) {
    if (game.titleDone) {
      mode = 1;
      prevClick = true;
    }
  } else if (mode === 1) {
    menu = C_MENU_MAIN;
    if (edge) {
      const b1 = inBtn(140);
      const b2 = inBtn(204);
      if (b1) {
        offline = true;
        startGame();
      } else if (b2) {
        mode = 2;
        wantJoin = true;
      }
    }
  } else if (mode === 2) {
    menu = C_MENU_CONNECTING;
  } else if (mode === 3) {
    netRead();
    if (!isHost) readPackets();
    netSend();
    menu = C_MENU_CONNECTING;
    if (timer() > joinedAt + 3.8) {
      if (othersInGame > 0) {
        menu = C_MENU_FOUND;
        if (edge) {
          const j = inBtn(204);
          const n = inBtn(262);
          if (j) startGame();
          if (n) {
            wantRestart = true;
            startGame();
          }
        }
      } else {
        menu = C_MENU_NONE;
        if (edge) {
          const n2 = inBtn(204);
          if (n2) startGame();
        }
      }
    }
  }
  dirX = cos(pa);
  dirY = sin(pa);
  plX = -dirY * PLANE;
  plY = dirX * PLANE;
  horizon = 0;
  penClear();
  castWalls();
  collectObjects();
  drawObjects();
  if (menu > 0) {
    clearEffects();
    me.size = 100;
    stampAt(menu, 0, 0);
    if (menu === C_MENU_FOUND) {
      drawNum(hWave, -50, -6, 100, 0.5);
      drawNum(othersInGame, 60, -6, 100, 0.5);
    }
  }
}

/** @warp */
function frame() {
  const t0 = timer();
  const rawDt = Time.delta();
  const dt = Math.min(0.1, rawDt);
  if (mode < 4) {
    lobby(dt);
    return;
  }
  netRead();
  if (!isHost) readPackets();
  if (wantRestart) {
    wantRestart = false;
    if (isHost) restartGame();
    else evQ.push(98);
  }
  if (isHost && hPhase === 0) restartGame();
  if (hGame !== myGame) {
    myGame = hGame;
    resetPlayer();
  }
  if (hWave !== lastWave) {
    lastWave = hWave;
    if (hWave > 0) {
      bannerUntil = timer() + 2.5;
      me.volume = 60;
      playSound("siren");
      if (game.down) {
        hp = 60;
        game.down = false;
      }
    }
  }
  if (hPhase === 2 && lastPhase !== 2) {
    stopAllSounds();
    me.volume = 100;
    playSound("gameover");
    prevClick = true;
  }
  lastPhase = hPhase;
  game.phase = hPhase;
  if (hPhase === 1) {
    if (timer() > flowAt) {
      flowAt = timer() + 0.35;
      buildFlow();
    }
    updatePlayer(dt);
    updateZombies(dt);
    if (isHost) hostUpdate();
  } else if (hPhase === 2) {
    const click = mouseDown() || keyPressed("space");
    if (click && !prevClick) {
      if (isHost) restartGame();
      else evQ.push(99);
    }
    prevClick = click;
  }
  netSend();
  // camera
  dirX = cos(pa);
  dirY = sin(pa);
  plX = -dirY * PLANE;
  plY = dirX * PLANE;
  horizon = game.bob * 0.6 - (game.down ? 40 : 0);
  penClear();
  castWalls();
  collectObjects();
  drawObjects();
  drawHud();
  perf.ms = Math.round((timer() - t0) * 1000);
  fpsCount++;
  if (timer() > fpsAt + 1) {
    perf.fps = fpsCount;
    fpsCount = 0;
    fpsAt = timer();
  }
}

whenFlag(() => {
  me.visible = false;
  penClear();
  clearEffects();
  initWorld();
  Net.session.slot = 0;
  hWave = 0;
  hPhase = 0;
  hScore = 0;
  hGame = 0;
  myGame = -1;
  lastWave = 0;
  lastPhase = 0;
  lastSeq1 = -1;
  lastSeq2 = -1;
  inInter = false;
  isHost = true;
  mode = 0;
  offline = false;
  wantJoin = false;
  wantRestart = false;
  joinedAt = timer();
  resetPlayer();
  forever(() => {
    if (wantJoin) {
      wantJoin = false;
      Net.join(); // ~2 s: watches the cloud slots and claims a free one
      joinedAt = timer();
      if (Net.session.slot === 0) offline = true; // session full: play solo
      mode = 3;
    }
    frame();
  });
});
