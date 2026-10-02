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
  C_PU_MAXAMMO, C_ANN_0, C_MACH_PERK0, C_MACH_PAP, C_MACH_BOX, C_PERKICON0, C_WI_0, C_WI_TEDDY, C_PR_PERK0, C_PR_PAP, C_PR_BOX,
  C_PR_BOX_SALE, C_PR_TAKE, C_PR_REVIVE, C_MSG_BLEED, C_MSG_SELFREV, C_MSG_DEAD, C_MSG_SPECTATE, C_MSG_TEDDY, C_MSG_REVIVED, C_WN_0,
  C_FX_RAY, C_PR_OWNED, C_TC_UP, C_TC_DOWN, C_TC_LEFT, C_TC_RIGHT, C_TC_FIRE, C_TC_USE, C_TC_RELOAD, C_TC_SWAP, C_TC_AUTO_OFF,
  C_TC_CHAT, C_TC_PH0, C_MENU_TOUCH_OFF,
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
// weapons: 0 pistol, 1 shotgun, 2 rifle, 3 SMG, 4 LMG, 5 sniper, 6 burst rifle, 7 magnum, 8 ray gun (4-8: Mystery Box only)
const W_DMG: number[] = [34, 14, 28, 20, 30, 240, 40, 110, 140];
const W_RATE: number[] = [0.3, 0.85, 0.11, 0.075, 0.09, 1.1, 0.4, 0.45, 0.35];
const W_MAG: number[] = [12, 6, 30, 32, 100, 5, 30, 6, 20];
const W_PEL: number[] = [1, 8, 1, 1, 1, 1, 1, 1, 1];
const W_SPR: number[] = [0.6, 7, 1.6, 2.6, 2.2, 0, 1.2, 0.5, 0.3];
const W_RELOAD: number[] = [1.1, 1.9, 1.6, 1.4, 3.2, 2.5, 1.8, 1.6, 2.0];
const W_PRICE: number[] = [0, 750, 1400, 1000, 0, 0, 0, 0, 0];
const W_MAXRES: number[] = [999, 36, 180, 192, 400, 30, 180, 48, 160];
const papd: number[] = []; // Pack-a-Punched? per weapon
// perks: 0 Juggernog, 1 Quick Revive, 2 Speed Cola, 3 Double Tap, 4 Stamin-Up
const perk: number[] = [0, 0, 0, 0, 0];
const PERK_COST: number[] = [2500, 1500, 3000, 2000, 2000];
// machines: 5 perks then Pack-a-Punch (east zone)
const machX: number[] = [19.5, 9.5, 6.5, 5.5, 19.5, 17.5];
const machY: number[] = [2.5, 9.5, 13.5, 21.5, 9.5, 13.5];
// Mystery Box spots (start room, north, south, west)
const boxX: number[] = [14.5, 4.5, 16.5, 3.5];
const boxY: number[] = [14.5, 5.5, 19.5, 10.5];
const reach: number[] = []; // 1 = a player may stand in this cell (open and connected to the start room)
const rSt: number[] = []; // other players: 0 alive, 1 down, 2 dead
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
let myState = 0; // 0 alive, 1 down (bleeding out), 2 dead until next wave
let maxHp = 100;
let bleedEnd = 0;
let selfRevAt = 0;
let selfRevs = 0;
let reviveProg = 0;
let reviveTarget = -1;
let specR = -1;
let spectating = false;
let prevSpec = false;
let burstLeft = 0;
let objFull = false;
// touch controls (one pointer: Scratch only tracks a single touch as the mouse)
let tFwd = 0;
let tStr = 0;
let tTurn = 0;
let tFire = false;
let tE = false;
let tR = false;
let tQ = false;
let tBtn = 0;
let prevTBtn = 0;
let autoFire = false;
let chatOpen = false;
// mystery box (local roll): 0 idle, 1 rolling, 2 offering bxW, 3 teddy bear
let bxState = 0;
let bxEnd = 0;
let bxW = 0;
let bxIcon = 0;
let bxIconAt = 0;
let bxUses = 0;
let bxPaid = 0;
// power-ups (host owns them, synced in the header)
let puT = 0;
let puX = 0;
let puY = 0;
let puEnd = 0;
let puActSeq = 0;
let puActType = 0;
let lastActSeq = 0;
let puHiddenUntil = 0;
let instaEnd = 0;
let dblEnd = 0;
let saleEnd = 0;
let boxLoc = 0;
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
  reach.length = 0;
  for (let i = 0; i < MW * MW; i++) reach.push(0);
  computeReach();
  papd.length = 0;
  for (let i = 0; i < 9; i++) papd.push(0);
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
  rSt.length = 0;
  for (let i = 0; i < 6; i++) {
    rSt.push(2);
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

/** Which cells can players stand in: open tiles connected to the start room (locked zones and spawn closets excluded). */
/** @warp */
function computeReach() {
  for (let i = 0; i < MW * MW; i++) reach[i] = 0;
  queue.length = 0;
  const start = 11 + 11 * MW;
  reach[start] = 1;
  queue.push(start);
  let head = 0;
  while (head < queue.length) {
    const q = queue[head];
    head++;
    reachVisit(q - 1);
    reachVisit(q + 1);
    reachVisit(q - MW);
    reachVisit(q + MW);
  }
}

/** @warp */
function reachVisit(n: number) {
  if (reach[n] === 0 && map[n] === 0) {
    reach[n] = 1;
    queue.push(n);
  }
}

/** Is this point blocked for a player? */
/** @warp */
function playerSolid(x: number, y: number): boolean {
  const c = Math.floor(x) + Math.floor(y) * MW;
  if (reach[c] !== 1) return true;
  for (let m = 0; m < 6; m++) {
    if (Math.abs(x - machX[m]) < 0.42 && Math.abs(y - machY[m]) < 0.42) return true;
  }
  if (Math.abs(x - boxX[boxLoc]) < 0.5 && Math.abs(y - boxY[boxLoc]) < 0.5) return true;
  return false;
}

/** Safety net: if a player ever ends up in a cell they can't be in, put them on the nearest allowed tile. */
/** @warp */
function unstick() {
  const c = Math.floor(px) + Math.floor(py) * MW;
  if (reach[c] === 1) return;
  let best = -1;
  let bd = 9999;
  for (let i = 0; i < MW * MW; i++) {
    if (reach[i] === 1) {
      const dx = (i % MW) + 0.5 - px;
      const dy = Math.floor(i / MW) + 0.5 - py;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
  }
  if (best >= 0) {
    px = (best % MW) + 0.5;
    py = Math.floor(best / MW) + 0.5;
  }
}

/** @warp */
function wMag(w: number): number {
  if (papd[w] === 1) return Math.ceil(W_MAG[w] * 1.5);
  return W_MAG[w];
}

/** @warp */
function wMax(w: number): number {
  if (w === 0) return 999;
  if (papd[w] === 1) return Math.ceil(W_MAXRES[w] * 1.5);
  return W_MAXRES[w];
}

/** @warp */
function addPts(n: number) {
  if (timer() < dblEnd) pts += n * 2;
  else pts += n;
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
  mag.push(12, 0, 0, 0, 0, 0, 0, 0, 0);
  res.push(999, 0, 0, 0, 0, 0, 0, 0, 0);
  for (let i = 0; i < 9; i++) papd[i] = 0;
  for (let i = 0; i < 5; i++) perk[i] = 0;
  maxHp = 100;
  myState = 0;
  selfRevAt = 0;
  selfRevs = 0;
  bxState = 0;
  bxUses = 0;
  burstLeft = 0;
  game.dead = false;
  game.pap = 0;
  lastActSeq = puActSeq;
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
  computeReach();
  puT = 0;
  instaEnd = 0;
  dblEnd = 0;
  saleEnd = 0;
  boxLoc = 0;
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
  if (puT > 0 && timer() > puEnd) puT = 0;
  // everybody down or dead: game over (a solo Quick Revive self-revive keeps you in)
  let anyAlive = myState === 0 || (myState === 1 && selfRevAt > 0);
  for (let r = 0; r < 6; r++) {
    if (rAct[r] === 1 && rSt[r] === 0) anyAlive = true;
  }
  if (!anyAlive) hPhase = 2;
}

/** @warp */
function applyDamage(z: number, dmg: number) {
  if (zt[z] === 0 || zs[z] === 2) return;
  let d = dmg;
  if (timer() < instaEnd) d = 99999;
  zhp[z] = zhp[z] - d;
  if (zhp[z] <= 0) {
    zs[z] = 2;
    ztm[z] = 0;
    hScore += ZPTS[zt[z] - 1];
    if (puT === 0 && random(1, 100) <= 5) dropPowerUp(zx[z], zy[z]);
  }
}

/** Host: a power-up appears where a zombie died. */
/** @warp */
function dropPowerUp(x: number, y: number) {
  puT = random(1, 6);
  puX = x;
  puY = y;
  puEnd = timer() + 30;
  me.volume = 80;
  playSound("powerdrop");
}

/** Host: somebody grabbed the power-up. Everyone sees puActSeq change and applies their part (onPowerUp). */
/** @warp */
function activatePowerUp(t: number) {
  puT = 0;
  puActSeq = (puActSeq + 1) % 10;
  puActType = t;
  if (t === 2) instaEnd = timer() + 30;
  if (t === 3) dblEnd = timer() + 30;
  if (t === 6) saleEnd = timer() + 30;
  if (t === 4) {
    for (let z = 0; z < ZMAX; z++) {
      if (zt[z] > 0 && zs[z] !== 2) {
        zs[z] = 2;
        ztm[z] = 0;
      }
    }
  }
  if (t === 5) {
    for (let b = 0; b < barCell.length; b++) bhp[barCell[b]] = 100;
  }
}

/** Every player: local part of a power-up (announcer, ammo, points). */
/** @warp */
function onPowerUp(t: number) {
  msgCost = C_ANN_0 + t - 1;
  msgUntil = timer() + 2.5;
  me.volume = 100;
  playSound("announce");
  if (t === 1) {
    for (let i = 0; i < 2; i++) {
      const w = wsl[i];
      if (w >= 0) {
        const mx = wMax(w);
        res[w] = mx;
      }
    }
  }
  if (t === 4) pts += 400;
  if (t === 5) pts += 200;
}

/** @warp */
function moveBox() {
  boxLoc = (boxLoc + random(1, 3)) % 4;
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
    applyDamage(Math.floor(code / 100) - 1, (code % 100) * 5);
  } else if (code === 70) {
    if (puT > 0) activatePowerUp(puT);
  } else if (code === 80) {
    moveBox();
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
      if (zs[z] === 2 && zPrev[z] !== 2 && timer() - zHitT[z] < 1.5) addPts(zt[z] === 3 ? 100 : 60);
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
function shootRay(b: number, dmg: number, splash: boolean) {
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
  if (splash) {
    // ray gun: a green bolt that bursts where it lands and hurts everything near it
    const ix = px + cb * (bd - 0.15);
    const iy = py + sb * (bd - 0.15);
    for (let z = 0; z < ZMAX; z++) {
      if (zt[z] > 0 && zs[z] !== 2) {
        const sd = Math.sqrt((zx[z] - ix) * (zx[z] - ix) + (zy[z] - iy) * (zy[z] - iy));
        if (sd < 0.8) hitAcc[z] = hitAcc[z] + dmg;
        else if (sd < 1.5) hitAcc[z] = hitAcc[z] + dmg / 2;
      }
    }
    addFx(px + cb * bd * 0.35, py + sb * bd * 0.35, 0.42, C_FX_RAY);
    addFx(px + cb * bd * 0.7, py + sb * bd * 0.7, 0.45, C_FX_RAY);
    addFx(ix, iy, 0.5, C_FX_RAY);
    return;
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
  let rate = W_RATE[wpn];
  if (perk[3] === 1) rate = rate * 0.67;
  nextFire = timer() + rate;
  if (wpn === 6) {
    // burst rifle: three quick rounds per pull
    if (burstLeft > 0) burstLeft--;
    else burstLeft = 2;
    if (burstLeft > 0) nextFire = timer() + 0.07;
  }
  for (let z = 0; z < ZMAX; z++) hitAcc[z] = 0;
  const pel = W_PEL[wpn];
  const spr = W_SPR[wpn];
  let dmg = W_DMG[wpn];
  if (papd[wpn] === 1) dmg = dmg * 2;
  for (let p = 0; p < pel; p++) {
    let off = (Math.random() * 2 - 1) * spr;
    if (pel > 1) off = -spr + (2 * spr * p) / (pel - 1) + Math.random() - 0.5;
    shootRay(pa + off, dmg, wpn === 8);
  }
  let any = false;
  for (let z = 0; z < ZMAX; z++) {
    if (hitAcc[z] > 0) {
      any = true;
      addPts(10);
      zHitT[z] = timer();
      if (isHost) applyDamage(z, hitAcc[z]);
      else evQ.push((z + 1) * 100 + Math.min(99, Math.ceil(hitAcc[z] / 5)));
    }
  }
  if (any) {
    me.volume = 80;
    playSound("hit");
  }
}

/** @warp */
function startReload() {
  const full = wMag(wpn);
  if (game.reloading || mag[wpn] >= full || res[wpn] <= 0) return;
  game.reloading = true;
  burstLeft = 0;
  reloadEnd = timer() + W_RELOAD[wpn] * (perk[2] === 1 ? 0.5 : 1);
  game.reloadSeq++;
}

/** @warp */
function selectSlot(i: number) {
  if (wsl[i] < 0 || i === wcur) return;
  wcur = i;
  wpn = wsl[i];
  game.weapon = wpn;
  game.pap = papd[wpn];
  game.reloading = false;
  burstLeft = 0;
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
      const mx = wMax(w);
      if (w > 0 && res[w] < mx) {
        need = true;
        res[w] = mx;
      }
    }
    if (!need) return;
  }
  if (k === 2) {
    if (hp >= maxHp) return;
    hp = Math.min(maxHp, hp + 50);
  }
  pk[s] = 0;
  if (!isHost) evQ.push(50 + s);
  me.volume = 90;
  playSound("pickup");
}

/** What the player faces: sets promptCost to the prompt costume (0 = nothing) and handles E. */
/** @warp */
function interact(ePressed: boolean) {
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
  if (t < 6 || t > 8) {
    interactObjects(ePressed);
    return;
  }
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
  equip(w);
}

/** Put weapon w in hand (into the empty slot, else replacing the current one) with full ammo. */
/** @warp */
function equip(w: number) {
  const owned = wsl[0] === w || wsl[1] === w;
  if (!owned) {
    let slot = wcur;
    if (wsl[1] < 0) slot = 1;
    wsl[slot] = w;
    wcur = slot;
    wpn = w;
    game.weapon = w;
    game.pap = papd[w];
    game.reloading = false;
    burstLeft = 0;
    game.switchSeq++;
  }
  const mm = wMag(w);
  mag[w] = mm;
  const mx = wMax(w);
  res[w] = mx;
  me.volume = 90;
  playSound("pickup");
}

/** Is (x, y) within range and roughly in front of the player? */
/** @warp */
function facing(x: number, y: number, range: number): boolean {
  const dx = x - px;
  const dy = y - py;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > range) return false;
  return (dx * cos(pa) + dy * sin(pa)) / Math.max(0.01, d) > 0.55;
}

/** Mystery Box, perk machines and Pack-a-Punch. */
/** @warp */
function interactObjects(ePressed: boolean) {
  const atBox = facing(boxX[boxLoc], boxY[boxLoc], 1.45);
  if (atBox) {
    if (bxState === 0) {
      let price = 950;
      promptCost = C_PR_BOX;
      if (timer() < saleEnd) {
        price = 10;
        promptCost = C_PR_BOX_SALE;
      }
      if (ePressed) {
        if (pts >= price) {
          pts -= price;
          bxPaid = price;
          bxState = 1;
          bxEnd = timer() + 3.6;
          bxUses++;
          me.volume = 90;
          playSound("boxspin");
        } else noPtsUntil = timer() + 1.2;
      }
    } else if (bxState === 2) {
      promptCost = C_PR_TAKE;
      if (ePressed) {
        bxState = 0;
        equip(bxW);
      }
    }
    return;
  }
  for (let m = 0; m < 6; m++) {
    const at = facing(machX[m], machY[m], 1.45);
    if (at) {
      if (m < 5) {
        if (perk[m] === 0) {
          promptCost = C_PR_PERK0 + m;
          if (ePressed) {
            if (pts >= PERK_COST[m]) {
              pts -= PERK_COST[m];
              perk[m] = 1;
              if (m === 0) {
                maxHp = 250;
                hp = 250;
              }
              me.volume = 90;
              playSound("jingle");
            } else noPtsUntil = timer() + 1.2;
          }
        }
      } else if (papd[wpn] === 1) {
        promptCost = C_PR_OWNED;
      } else {
        promptCost = C_PR_PAP;
        if (ePressed) {
          if (pts >= 5000) {
            pts -= 5000;
            papd[wpn] = 1;
            game.pap = 1;
            const mm = wMag(wpn);
            mag[wpn] = mm;
            const mx = wMax(wpn);
            res[wpn] = mx;
            me.volume = 100;
            playSound("pap");
            game.switchSeq++;
          } else noPtsUntil = timer() + 1.2;
        }
      }
      return;
    }
  }
}

/** Local Mystery Box roll: spin, then offer a weapon (or the teddy bear moves the box). */
/** @warp */
function updateBox() {
  if (bxState === 1) {
    if (timer() > bxIconAt) {
      bxIconAt = timer() + 0.1;
      bxIcon = random(1, 8);
    }
    if (timer() > bxEnd) {
      if (bxUses >= 3 && random(1, 100) <= 30) {
        bxState = 3;
        bxEnd = timer() + 2.5;
        bxIcon = 9;
        pts += bxPaid;
        msgCost = C_MSG_TEDDY;
        msgUntil = timer() + 2.5;
        me.volume = 100;
        playSound("teddy");
      } else {
        let w = random(1, 7);
        if (random(1, 100) <= 12) w = 8;
        for (let tries = 0; tries < 8; tries++) {
          if (wsl[0] === w || wsl[1] === w) w = (w % 8) + 1;
        }
        bxW = w;
        bxIcon = w;
        bxState = 2;
        bxEnd = timer() + 8;
      }
    }
  } else if (bxState === 2) {
    if (timer() > bxEnd) bxState = 0;
  } else if (bxState === 3) {
    if (timer() > bxEnd) {
      bxState = 0;
      bxUses = 0;
      if (isHost) moveBox();
      else evQ.push(80);
    }
  }
}

/** @warp */
function goDown() {
  hp = 0;
  myState = 1;
  game.down = true;
  game.reloading = false;
  burstLeft = 0;
  bxState = 0;
  selfRevAt = 0;
  if ((offline || players <= 1) && perk[1] === 1 && selfRevs < 3) {
    selfRevs++;
    selfRevAt = timer() + 4;
  }
  for (let i = 0; i < 5; i++) perk[i] = 0;
  maxHp = 100;
  wpn = 0; // pistol only while down
  game.weapon = 0;
  game.pap = papd[0];
  bleedEnd = timer() + 30;
  me.volume = 100;
  playSound("downed");
}

/** @warp */
function revive() {
  myState = 0;
  game.down = false;
  game.dead = false;
  hp = maxHp;
  selfRevAt = 0;
  wpn = wsl[wcur];
  game.weapon = wpn;
  game.pap = papd[wpn];
  msgCost = C_MSG_REVIVED;
  msgUntil = timer() + 2;
  me.volume = 90;
  playSound("revive");
}

/** Bled out: dead until the next wave, and you lose your guns. */
/** @warp */
function die() {
  myState = 2;
  game.down = true;
  game.dead = true;
  wsl[0] = 0;
  wsl[1] = -1;
  wcur = 0;
  wpn = 0;
  game.weapon = 0;
  for (let i = 0; i < 9; i++) papd[i] = 0;
  game.pap = 0;
  mag[0] = 12;
  specR = -1;
}

/** Pick the next living teammate to watch (dir: +1 / -1). */
/** @warp */
function nextSpec(dir: number) {
  let r = specR;
  for (let k = 0; k < 6; k++) {
    r = (r + dir + 6) % 6;
    if (rAct[r] === 1 && rSt[r] === 0) {
      specR = r;
      return;
    }
  }
  specR = -1;
}

/** Is (x, y) inside the w x h button centred at (bx, by)? */
/** @warp */
function inRect(x: number, y: number, bx: number, by: number, w: number, h: number): boolean {
  return Math.abs(x - bx) < w / 2 && Math.abs(y - by) < h / 2;
}

/** Touch layout: d-pad bottom-left, FIRE / USE / RLD / SWAP / AUTO bottom-right, CHAT top-left;
 * holding anywhere else on the upper screen turns toward the finger. Sets tFwd, tStr, tTurn, tFire, tE, tR, tQ. */
/** @warp */
function readTouch() {
  tFwd = 0;
  tStr = 0;
  tTurn = 0;
  tFire = false;
  tE = false;
  tR = false;
  tQ = false;
  const keys = keyPressed("w") || keyPressed("a") || keyPressed("s") || keyPressed("d") || keyPressed("up arrow") || keyPressed("left arrow") || keyPressed("right arrow");
  if (keys) game.touch = false; // keyboard player: hide the touch buttons
  if (!game.touch) return;
  tBtn = 0;
  if (mouseDown()) {
    const x = mouseX();
    const y = mouseY();
    tBtn = 99;
    if (inRect(x, y, -185, -45, 40, 40)) tBtn = 1;
    else if (inRect(x, y, -185, -115, 40, 40)) tBtn = 2;
    else if (inRect(x, y, -222, -80, 40, 40)) tBtn = 3;
    else if (inRect(x, y, -148, -80, 40, 40)) tBtn = 4;
    else if (Math.abs(x - 190) < 36 && Math.abs(y + 75) < 36) tBtn = 5;
    else if (inRect(x, y, 122, -110, 52, 36)) tBtn = 6;
    else if (inRect(x, y, 122, -50, 52, 36)) tBtn = 7;
    else if (inRect(x, y, 190, -10, 52, 36)) tBtn = 8;
    else if (inRect(x, y, 190, 34, 64, 30)) tBtn = 9;
    else if (inRect(x, y, -215, 95, 44, 30)) tBtn = 10;
    else if (chatOpen && Math.abs(x) < 85 && y < 95 && y > -85) tBtn = 20 + Math.floor((95 - y) / 30);
    if (tBtn === 1) tFwd = 1;
    if (tBtn === 2) tFwd = -1;
    if (tBtn === 3) tStr = -1;
    if (tBtn === 4) tStr = 1;
    if (tBtn === 5) tFire = true;
    if (tBtn === 6) tE = true;
    if (tBtn === 99) tTurn = Math.max(-1, Math.min(1, x / 150));
    const edge = tBtn !== prevTBtn;
    if (edge && tBtn === 7) tR = true;
    if (edge && tBtn === 8) tQ = true;
    if (edge && tBtn === 9) autoFire = !autoFire;
    if (edge && tBtn === 10) chatOpen = !chatOpen;
    if (edge && tBtn >= 20 && tBtn < 26) {
      game.chatSend = tBtn - 19;
      chatOpen = false;
    }
  }
  prevTBtn = tBtn;
}

/** Is the crosshair on a zombie (for the touch AUTO fire toggle)? */
/** @warp */
function aimOnZombie(): boolean {
  const wallD = cDepth[N / 2];
  const cb = cos(pa);
  const sb = sin(pa);
  for (let z = 0; z < ZMAX; z++) {
    if (zt[z] > 0 && zs[z] !== 2) {
      const dx = zx[z] - px;
      const dy = zy[z] - py;
      const along = dx * cb + dy * sb;
      if (along > 0.1 && along < wallD && Math.abs(dy * cb - dx * sb) < ZRAD[zt[z] - 1]) return true;
    }
  }
  return false;
}

/** @warp */
function drawTouch() {
  if (!game.touch || hPhase !== 1) return;
  setEffect("ghost", 25);
  me.size = 100;
  stampAt(C_TC_UP, -185, -45);
  stampAt(C_TC_DOWN, -185, -115);
  stampAt(C_TC_LEFT, -222, -80);
  stampAt(C_TC_RIGHT, -148, -80);
  stampAt(C_TC_FIRE, 190, -75);
  stampAt(C_TC_USE, 122, -110);
  stampAt(C_TC_RELOAD, 122, -50);
  stampAt(C_TC_SWAP, 190, -10);
  stampAt(C_TC_AUTO_OFF + (autoFire ? 1 : 0), 190, 34);
  stampAt(C_TC_CHAT, -215, 95);
  if (chatOpen) {
    setEffect("ghost", 0);
    for (let i = 0; i < 6; i++) stampAt(C_TC_PH0 + i, 0, 80 - i * 30);
  }
  setEffect("ghost", 0);
}

/** @warp */
function updatePlayer(dt: number) {
  readTouch();
  game.bob = game.bob * 0.8;
  if (myState === 2) {
    // dead: spectate a living teammate (Q / E / arrows to switch)
    const sNow = keyPressed("q") || keyPressed("e") || keyPressed("left arrow") || keyPressed("right arrow") || tQ || tE;
    if (sNow && !prevSpec) nextSpec(keyPressed("left arrow") ? -1 : 1);
    prevSpec = sNow;
    if (specR < 0 || rAct[specR] !== 1 || rSt[specR] !== 0) nextSpec(1);
    return;
  }
  if (myState === 1) {
    if (selfRevAt > 0 && timer() > selfRevAt) revive();
    else if (selfRevAt === 0 && timer() > bleedEnd) die();
    if (myState !== 1) return;
  }
  let turn = 0;
  if (keyPressed("right arrow")) turn++;
  if (keyPressed("left arrow")) turn--;
  pa += (turn + tTurn) * 150 * dt;
  let fwd = tFwd;
  if (keyPressed("w") || keyPressed("up arrow")) fwd++;
  if (keyPressed("s") || keyPressed("down arrow")) fwd--;
  let str = tStr;
  if (keyPressed("d")) str++;
  if (keyPressed("a")) str--;
  const ca = cos(pa);
  const sa = sin(pa);
  let mvx = ca * fwd - sa * str;
  let mvy = sa * fwd + ca * str;
  const ml = Math.sqrt(mvx * mvx + mvy * mvy);
  if (ml > 0) {
    let speed = 2.7;
    if (perk[4] === 1) speed = 3.5;
    if (myState === 1) speed = 0.7; // crawling
    const sp = (speed * dt) / ml;
    mvx = mvx * sp;
    mvy = mvy * sp;
    // the player is a 0.44 x 0.44 box; test both corners of the leading edge on each axis
    const nx = px + mvx;
    const ex = nx + (mvx > 0 ? 0.22 : -0.22);
    const b1 = playerSolid(ex, py - 0.215);
    const b2 = playerSolid(ex, py + 0.215);
    if (!b1 && !b2) px = nx;
    const ny = py + mvy;
    const ey = ny + (mvy > 0 ? 0.22 : -0.22);
    const b3 = playerSolid(px - 0.215, ey);
    const b4 = playerSolid(px + 0.215, ey);
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
  unstick();
  if (game.reloading && timer() > reloadEnd) {
    game.reloading = false;
    const full = wMag(wpn);
    const take = Math.min(full - mag[wpn], res[wpn]);
    mag[wpn] = mag[wpn] + take;
    if (wpn > 0) res[wpn] = res[wpn] - take;
  }
  const rNow = keyPressed("r") || tR;
  if (rNow && !prevR) startReload();
  prevR = rNow;
  const alive = myState === 0;
  const qNow = keyPressed("q") || tQ;
  if (qNow && !prevQ && alive) switchWeapon();
  prevQ = qNow;
  const k1 = keyPressed("1");
  if (k1 && !prev1 && alive) selectSlot(0);
  prev1 = k1;
  const k2 = keyPressed("2");
  if (k2 && !prev2 && alive) selectSlot(1);
  prev2 = k2;
  const eNow = keyPressed("e") || tE;
  promptCost = 0;
  // revive a downed teammate: hold E next to them
  reviveTarget = -1;
  if (alive) {
    for (let r = 0; r < 6; r++) {
      if (rAct[r] === 1 && rSt[r] === 1 && Math.abs(rX[r] - px) < 1.3 && Math.abs(rY[r] - py) < 1.3) reviveTarget = r;
    }
  }
  if (reviveTarget >= 0) {
    promptCost = C_PR_REVIVE;
    if (eNow) {
      reviveProg += dt;
      if (reviveProg >= (perk[1] === 1 ? 1.5 : 3)) {
        reviveProg = 0;
        evQ.push(61 + reviveTarget);
        addPts(50);
        me.volume = 90;
        playSound("revive");
      }
    } else reviveProg = 0;
  } else {
    reviveProg = 0;
    if (alive) interact(eNow && !prevE);
  }
  prevE = eNow;
  updateBox();
  let trigger = keyPressed("space") || burstLeft > 0;
  if (game.touch) {
    if (tFire) trigger = true;
    else if (autoFire) {
      const onZ = aimOnZombie();
      if (onZ) trigger = true;
    }
  } else if (mouseDown()) trigger = true;
  if (trigger && timer() >= nextFire && !game.reloading) {
    if (mag[wpn] > 0) {
      fire();
    } else if (res[wpn] > 0) {
      startReload();
    } else if (timer() > emptyAt) {
      emptyAt = timer() + 0.4;
      game.emptySeq++;
    }
  }
  if (!alive) return;
  // health regenerates after 3 s without damage
  if (timer() - hurtAt > 3 && hp < maxHp) hp = Math.min(maxHp, hp + 50 * dt);
  // power-up
  if (puT > 0 && timer() > puHiddenUntil && Math.abs(puX - px) < 0.7 && Math.abs(puY - py) < 0.7) {
    if (isHost) activatePowerUp(puT);
    else {
      evQ.push(70);
      puHiddenUntil = timer() + 1.5;
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
  if (nearBar >= 0 && promptCost === 0 && reviveTarget < 0 && keyPressed("e") && timer() > repairAt) {
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
    if (hp <= 0) goDown();
  }
}

// ------------------------------------------------------------------ networking

// Own copies of tts/net's sendState/readPlayer. Scratch resets the timer on the green flag, and the
// library's private "last send / last change" times would then block sending (and make stale slots look
// alive) after Stop + green flag; these keep their bookkeeping here so whenFlag can reset it.
const lastVal: string[] = [];
const lastChg: number[] = [];
let sendAt = -99;
let beat = 10;
let rpA = 0;
let rpB = 0;
let rpC = 0;
let rpD = 0;

/** @warp */
function netResetSlots() {
  lastVal.length = 0;
  lastChg.length = 0;
  for (let i = 1; i <= 6; i++) {
    const v = Net.slotValue(i);
    lastVal.push(v);
    lastChg.push(-99);
  }
  sendAt = -99;
}

/** @warp */
function netWrite(a: number, b: number, c: number, d: number) {
  const slot = Net.session.slot;
  if (slot === 0 || (timer() - sendAt < 0.1 && timer() >= sendAt)) return;
  sendAt = timer();
  beat++;
  if (beat > 99) beat = 10;
  const sa = Net.pad(Math.round(Math.max(-4999, Math.min(4999, a))) + 5000, 4);
  const sb = Net.pad(Math.round(Math.max(-4999, Math.min(4999, b))) + 5000, 4);
  const sc = Net.pad(Math.round(Math.max(-4999, Math.min(4999, c))) + 5000, 4);
  const sd = Net.pad(Math.round(Math.max(-4999, Math.min(4999, d))) + 5000, 4);
  const v = ("1" + beat + sa + sb + sc + sd) as unknown as number;
  if (slot === 1) Net.cloud.p1 = v;
  if (slot === 2) Net.cloud.p2 = v;
  if (slot === 3) Net.cloud.p3 = v;
  if (slot === 4) Net.cloud.p4 = v;
  if (slot === 5) Net.cloud.p5 = v;
  if (slot === 6) Net.cloud.p6 = v;
}

/** Read a slot into rpA..rpD; true if that player updated within the last 3 seconds. */
/** @warp */
function netReadSlot(slot: number): boolean {
  const v = Net.slotValue(slot);
  if (v !== lastVal[slot - 1]) {
    lastVal[slot - 1] = v;
    lastChg[slot - 1] = timer();
  }
  if (v.length < 19) return false;
  rpA = num4(v, 3) - 5000;
  rpB = num4(v, 7) - 5000;
  rpC = num4(v, 11) - 5000;
  rpD = num4(v, 15) - 5000;
  const age = timer() - lastChg[slot - 1];
  return age >= 0 && age < 3;
}

/** @warp */
function num4(v: string, i: number): number {
  return Number(v[i]) * 1000 + Number(v[i + 1]) * 100 + Number(v[i + 2]) * 10 + Number(v[i + 3]);
}

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
  let advSlot = 99; // lowest other player who says they are hosting
  if (game.started && mine > 0) hostSlot = mine;
  players = game.started ? 1 : 0;
  for (let i = 1; i <= 6; i++) {
    const r = i - 1;
    let act = false;
    if (i !== mine && timer() > joinedAt + 3.5) act = netReadSlot(i);
    if (act && rpC >= 432) {
      players++;
      othersInGame++;
      if (i < hostSlot) hostSlot = i;
      if (rpC >= 864 && i < advSlot) advSlot = i;
      const c = rpC;
      const tx = rpA / 100;
      const ty = rpB / 100;
      if (rAct[r] === 0) {
        rX[r] = tx;
        rY[r] = ty;
        rLastD[r] = rpD;
        rShot[r] = Math.floor(c / 216) % 2;
      } else {
        rX[r] = rX[r] + (tx - rX[r]) * 0.3;
        rY[r] = rY[r] + (ty - rY[r]) * 0.3;
      }
      rA[r] = (c % 72) * 5;
      rSt[r] = Math.floor(c / 72) % 3;
      rAl[r] = rSt[r] === 0 ? 1 : 0;
      const shot = Math.floor(c / 216) % 2;
      if (shot !== rShot[r]) {
        rShot[r] = shot;
        const d = Math.sqrt((rX[r] - px) * (rX[r] - px) + (rY[r] - py) * (rY[r] - py));
        me.volume = Math.max(10, 90 - d * 6);
        playSound("distshot");
      }
      if (rpD !== rLastD[r]) {
        rLastD[r] = rpD;
        const code = Math.abs(rpD);
        if (code >= 61 && code <= 66) {
          if (code - 60 === mine && myState === 1) revive();
        } else if (isHost && code !== 0) applyEvent(code);
      }
      rAct[r] = 1;
    } else {
      rAct[r] = 0;
    }
  }
  // a running host keeps the game; a newcomer never takes over from one (its world would be empty)
  if (advSlot < 99) isHost = isHost && game.started && mine > 0 && mine < advSlot;
  else isHost = (isHost && game.started) || mine === 0 || hostSlot === mine || hostSlot === 99;
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
  if (v1.length >= 165) {
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
      if (timer() > puHiddenUntil) puT = Number(v1[29]);
      puX = num3(v1, 30) / 40;
      puY = num3(v1, 33) / 40;
      puActSeq = Number(v1[36]);
      puActType = Number(v1[37]);
      instaEnd = timer() + Number(v1[38]) * 10 + Number(v1[39]);
      dblEnd = timer() + Number(v1[40]) * 10 + Number(v1[41]);
      saleEnd = timer() + Number(v1[42]) * 10 + Number(v1[43]);
      boxLoc = Number(v1[44]);
      for (let z = 0; z < 15; z++) readZombie(z, v1, 45 + z * 8);
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
      s = s + puT;
      const q1 = Net.pad(Math.round(puX * 40), 3);
      s = s + q1;
      const q2 = Net.pad(Math.round(puY * 40), 3);
      s = s + q2 + puActSeq + puActType;
      const t1 = Net.pad(Math.min(99, Math.ceil(Math.max(0, instaEnd - timer()))), 2);
      s = s + t1;
      const t2 = Net.pad(Math.min(99, Math.ceil(Math.max(0, dblEnd - timer()))), 2);
      s = s + t2;
      const t3 = Net.pad(Math.min(99, Math.ceil(Math.max(0, saleEnd - timer()))), 2);
      s = s + t3 + boxLoc;
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
  let c = Math.floor((((pa % 360) + 360) % 360) / 5) + 72 * myState + 216 * myShot;
  if (game.started) c += 432;
  if (isHost && game.started) c += 864;
  netWrite(px * 100, py * 100, c, curEv);
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
  bB.insert(k, objFull ? 5 : -Math.min(88, depth * 5.6));
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
  for (let m = 0; m < 6; m++) {
    if (m < 5) addObj(machX[m], machY[m], C_MACH_PERK0 + m, 1.0, 160, 0, 0.27, 0);
    else addObj(machX[m], machY[m], C_MACH_PAP, 1.0, 160, 0, 0.42, 0);
  }
  addObj(boxX[boxLoc], boxY[boxLoc], C_MACH_BOX, 1.0, 160, 0, 0.42, 0);
  objFull = true;
  if (bxState > 0) {
    let icon = C_WI_0 + bxIcon;
    if (bxIcon === 9) icon = C_WI_TEDDY;
    addObj(boxX[boxLoc], boxY[boxLoc], icon, 0.25, 40, 0.62 + sin(timer() * 200) * 0.03, 1.2, 0);
  }
  if (puT > 0 && timer() > puHiddenUntil) addObj(puX, puY, C_PU_MAXAMMO + puT - 1, 0.4, 64, 0.2 + sin(timer() * 180) * 0.06, 0.5, 0);
  objFull = false;
  for (let r = 0; r < 6; r++) {
    if (rAct[r] === 1 && rSt[r] !== 2 && !(spectating && r === specR)) {
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
  if (hPhase === 1 && myState !== 2) stampAt(C_CROSSHAIR, 0, 0);
  // wave + score
  stampAt(C_HUD_WAVE, -178, 157);
  drawNum(hWave, -149, 157, 100, 0);
  me.size = 100;
  stampAt(C_HUD_SCORE, 163, 157);
  drawNum(pts, 228, 157, pts >= 10000 ? 78 : 100, 1);
  if (players > 1) {
    me.size = 100;
    stampAt(C_HUD_PLAYERS, -195, 127);
    drawNum(players, -180, 127, 80, 0);
  }
  // health
  me.size = 100;
  stampAt(C_HUD_HP, -153, -158);
  Draw.line(-204, -158, -134, -158, 12, "#2A1C1A");
  if (hp > 0) Draw.line(-204, -158, -204 + (hp / maxHp) * 70, -158, 10, hp < 35 ? "#E04A3C" : "#7CC444");
  // perks
  me.size = 100;
  for (let i = 0; i < 5; i++) {
    if (perk[i] === 1) stampAt(C_PERKICON0 + i, -226 + i * 24, -128);
  }
  // active power-ups with their seconds left
  let px2 = -80;
  if (timer() < instaEnd) {
    me.size = 50;
    stampAt(C_PU_MAXAMMO + 1, px2, 150);
    drawNum(instaEnd - timer(), px2 + 18, 150, 70, 0);
    px2 += 72;
  }
  if (timer() < dblEnd) {
    me.size = 50;
    stampAt(C_PU_MAXAMMO + 2, px2, 150);
    drawNum(dblEnd - timer(), px2 + 18, 150, 70, 0);
    px2 += 72;
  }
  if (timer() < saleEnd) {
    me.size = 50;
    stampAt(C_PU_MAXAMMO + 5, px2, 150);
    drawNum(saleEnd - timer(), px2 + 18, 150, 70, 0);
  }
  me.size = 100;
  drawNum(hp, -124, -158, 100, 0);
  // ammo
  me.size = 100;
  stampAt(C_HUD_AMMO, 163, -158);
  stampAt(C_WN_0 + wpn + papd[wpn] * 9, 163, -130);
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
  if (reviveTarget >= 0 && reviveProg > 0) {
    Draw.line(-60, 108, 60, 108, 10, "#1A1C1A");
    Draw.line(-60, 108, -60 + (120 * reviveProg) / (perk[1] === 1 ? 1.5 : 3), 108, 8, "#9BE07A");
  }
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
  if (myState === 1 && hPhase === 1) {
    if (selfRevAt > 0) stampAt(C_MSG_SELFREV, 0, 40);
    else {
      stampAt(C_MSG_BLEED, 0, 40);
      drawNum(Math.ceil(bleedEnd - timer()), 0, 0, 180, 0.5);
      me.size = 100;
    }
  }
  if (myState === 2 && hPhase === 1) {
    if (spectating) {
      stampAt(C_MSG_SPECTATE, 0, 100);
      drawNum(specR + 1, 128, 100, 100, 0);
      me.size = 100;
    } else stampAt(C_MSG_DEAD, 0, 40);
  }
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
    if (edge && Math.abs(mouseX() - 155) < 75 && Math.abs(mouseY() - 158) < 15) game.touch = !game.touch;
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
    if (mode === 1) stampAt(C_MENU_TOUCH_OFF + (game.touch ? 1 : 0), 155, 158);
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
  const dt = Math.max(0, Math.min(0.1, rawDt));
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
  if (puActSeq !== lastActSeq) {
    lastActSeq = puActSeq;
    onPowerUp(puActType);
  }
  if (hWave !== lastWave) {
    lastWave = hWave;
    if (hWave > 0) {
      bannerUntil = timer() + 2.5;
      me.volume = 60;
      playSound("siren");
      if (myState > 0) {
        // back in for the new wave (dead players respawn in the start room with a pistol)
        if (myState === 2) {
          const slot = Math.max(1, Net.session.slot);
          px = 10.5 + (slot % 3) * 1.2;
          py = 12.5;
        }
        revive();
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
      computeReach();
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
  // camera (a dead player watches a living teammate)
  const saveX = px;
  const saveY = py;
  const saveA = pa;
  spectating = myState === 2 && specR >= 0 && rAct[specR] === 1 && rSt[specR] === 0;
  if (spectating) {
    px = rX[specR];
    py = rY[specR];
    pa = rA[specR];
  }
  dirX = cos(pa);
  dirY = sin(pa);
  plX = -dirY * PLANE;
  plY = dirX * PLANE;
  horizon = game.bob * 0.6 - (myState === 1 ? 40 : 0);
  penClear();
  castWalls();
  collectObjects();
  drawObjects();
  px = saveX;
  py = saveY;
  pa = saveA;
  drawHud();
  drawTouch();
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
  // a Stop + green flag must look exactly like a fresh load (Scratch also restarts the timer, so every
  // "until"/"next" time goes back to 0)
  netResetSlots();
  nextFire = 0;
  reloadEnd = 0;
  hurtSnd = 0;
  repairAt = 0;
  emptyAt = 0;
  groanAt = 0;
  nextSpawn = 0;
  interEnd = 0;
  fpsAt = 0;
  puEnd = 0;
  bxEnd = 0;
  bxIconAt = 0;
  bleedEnd = 0;
  selfRevAt = 0;
  game.fireAt = -9;
  game.started = false;
  game.titleDone = false;
  game.chatSend = 0;
  game.down = false;
  game.dead = false;
  game.pap = 0;
  game.weapon = 0;
  game.reloading = false;
  game.phase = 0;
  puT = 0;
  puActSeq = 0;
  lastActSeq = 0;
  puHiddenUntil = 0;
  instaEnd = 0;
  dblEnd = 0;
  saleEnd = 0;
  boxLoc = 0;
  bxState = 0;
  spectating = false;
  specR = -1;
  toSpawn = 0;
  aliveCount = 0;
  msgUntil = 0;
  bannerUntil = 0;
  clearedUntil = 0;
  noPtsUntil = 0;
  hurtAt = -99;
  reviveProg = 0;
  reviveTarget = -1;
  promptCost = 0;
  curEv = 0;
  evSign = 1;
  nextTick = 0;
  flowAt = 0;
  prevClick = true;
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
      netResetSlots();
      joinedAt = timer();
      if (Net.session.slot === 0) offline = true; // session full: play solo
      mode = 3;
    }
    frame();
  });
});
