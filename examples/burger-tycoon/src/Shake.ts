// Shake machine (unlocked in the shop): click to blend, click when READY to put it on the tray.
import { game } from "./Stage";

const BURN = 9999; // drinks never spoil
let state = 0; // 0 empty, 1 cooking, 2 ready
let t0 = 0;
let p = 0;

function cookTime(): number {
  return 3;
}

function start() {
  state = 1;
  t0 = timer();
  switchCostume("shake_blend");
  playSound("blend");
}

function collect() {
  game.trayS = 1;
  state = 0;
  switchCostume("shake_empty");
  playSound("pop");
}

onMessage("day start", () => {
  state = 0;
  p = 0;
  switchCostume("shake_empty");
  goTo(75, -75);
  me.visible = true;
  if (game.shakeOn === 0) {
    switchCostume("shake_locked");
    return;
  }
  while (game.phase === "day") {
    if (state === 1) {
      p = (timer() - t0) / cookTime();
      if (p >= 1) {
        state = 2;
        t0 = timer();
        switchCostume("shake_ready");
        playSound("ding");
      }
    }
    if (state === 2) {
      p = 1 - (timer() - t0) / BURN;
    }
    me.size = 100 + (state === 2 ? 4 * sin(timer() * 720) : 0);
    game.sShake = state;
    game.pShake = p;
  }
});

whenClicked(() => {
  if (game.phase === "day" && game.shakeOn === 0) playSound("deny");
  if (game.phase === "day" && game.shakeOn === 1) {
    if (state === 0) {
      start();
    } else if (state === 2) {
      if (game.trayS === 0) {
        collect();
      } else {
        playSound("deny");
      }
    }
  }
});

onMessage("day over", () => {
  me.visible = false;
});

whenFlag(() => {
  me.visible = false;
});
