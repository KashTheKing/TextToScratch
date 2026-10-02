// First-person weapon: costume for the current gun (2 per weapon: idle, fire), centred so the barrel
// points at the crosshair. Kicks on recoil, dips while reloading, purple shimmer when Pack-a-Punched,
// and plays the weapon sounds when View bumps the shot/reload/empty/switch counters.
import { game } from "./Stage";

// per weapon: 0 pistol, 1 shotgun, 2 rifle, 3 SMG, 4 LMG, 5 sniper, 6 burst rifle, 7 magnum, 8 ray gun
const KICK: number[] = [16, 26, 8, 7, 9, 30, 9, 24, 12];
const PITCH: number[] = [0, 0, 0, 60, -20, 0, 25, 0, 0];

let lastShot = 0;
let lastReload = 0;
let lastEmpty = 0;
let lastSwitch = 0;
let kick = 0;
let dip = 0;

/** @warp */
function shotSound(w: number) {
  setSoundEffect("pitch", PITCH[w] - game.pap * 45);
  if (w === 0) playSound("pistol");
  if (w === 1) playSound("shotgun");
  if (w === 2 || w === 3 || w === 6) playSound("rifle");
  if (w === 4) playSound("lmg");
  if (w === 5) playSound("sniper");
  if (w === 7) playSound("magnum");
  if (w === 8) playSound("raygun");
}

whenFlag(() => {
  me.visible = false;
  me.size = 100;
  lastShot = game.shotSeq;
  lastReload = game.reloadSeq;
  lastEmpty = game.emptySeq;
  lastSwitch = game.switchSeq;
  goToFront();
  forever(() => {
    if (game.shotSeq !== lastShot) {
      lastShot = game.shotSeq;
      kick = KICK[game.weapon];
      shotSound(game.weapon);
    }
    if (game.reloadSeq !== lastReload) {
      lastReload = game.reloadSeq;
      setSoundEffect("pitch", 0);
      playSound("reload");
    }
    if (game.emptySeq !== lastEmpty) {
      lastEmpty = game.emptySeq;
      playSound("empty");
    }
    if (game.switchSeq !== lastSwitch) {
      lastSwitch = game.switchSeq;
      dip = 60;
      playSound("switch");
    }
    if (game.phase === 1 && game.started && !game.dead) {
      me.visible = true;
      const flash = timer() - game.fireAt < 0.06 ? 1 : 0;
      switchCostume(game.weapon * 2 + 1 + flash);
      if (game.pap === 1) {
        setEffect("color", 140);
        setEffect("brightness", 10 + sin(timer() * 400) * 12);
      } else {
        clearEffects();
      }
      const target = game.reloading ? 70 : 0;
      dip += (target - dip) * 0.25;
      kick = kick * 0.6;
      const low = game.down ? 30 : 0;
      goTo(0, -96 - kick + game.bob - dip - low); // centred: the barrel runs straight up to the crosshair
    } else {
      me.visible = false;
    }
  });
});
