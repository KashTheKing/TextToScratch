// First-person weapon: picks the costume for the current gun, kicks on recoil, dips while reloading,
// and plays the weapon sounds when View bumps the shot/reload/empty counters.
import { game } from "./Stage";

let lastShot = 0;
let lastReload = 0;
let lastEmpty = 0;
let lastSwitch = 0;
let kick = 0;
let dip = 0;

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
      kick = game.weapon === 1 ? 26 : game.weapon === 0 ? 16 : 8;
      setSoundEffect("pitch", game.weapon === 3 ? 60 : 0);
      if (game.weapon === 0) playSound("pistol");
      if (game.weapon === 1) playSound("shotgun");
      if (game.weapon >= 2) playSound("rifle");
    }
    if (game.reloadSeq !== lastReload) {
      lastReload = game.reloadSeq;
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
    if (game.phase === 1 && game.started && !game.down) {
      me.visible = true;
      const flash = timer() - game.fireAt < 0.06 ? 1 : 0;
      switchCostume(game.weapon * 2 + 1 + flash);
      const target = game.reloading ? 70 : 0;
      dip += (target - dip) * 0.25;
      kick = kick * 0.6;
      goTo(0, -96 - kick + game.bob - dip); // centred: the barrel runs straight up to the crosshair
    } else {
      me.visible = false;
    }
  });
});
