// Fryer station: click to drop a basket of fries, click when READY to put them on the tray.
import { game } from "./Stage";

const BURN = 7; // seconds a ready patty survives
let state = 0; // 0 empty, 1 cooking, 2 ready, 3 burnt
let t0 = 0;
let p = 0;

function cookTime(): number {
  return 3.5 - game.grillLvl * 0.9;
}

function start() {
  state = 1;
  t0 = timer();
  switchCostume("fryer_cook");
  playSound("bubble");
}

function collect() {
  game.trayF = 1;
  state = 0;
  switchCostume("fryer_empty");
  playSound("pop");
}

onMessage("day start", () => {
  state = 0;
  p = 0;
  switchCostume("fryer_empty");
  goTo(-95, -75);
  me.visible = true;
  while (game.phase === "day") {
    if (state === 0 && game.chef === 1 && game.dayLeft > 0) start();
    if (state === 1) {
      p = (timer() - t0) / cookTime();
      if (p >= 1) {
        state = 2;
        t0 = timer();
        switchCostume("fryer_ready");
        playSound("ding");
      }
    }
    if (state === 2) {
      p = 1 - (timer() - t0) / BURN;
      if (game.chef === 1 && game.trayF === 0) collect();
      if (p <= 0) {
        state = 3;
        switchCostume("fryer_burnt");
        playSound("burnt");
      }
    }
    if (state === 3 && game.chef === 1) {
      state = 0;
      switchCostume("fryer_empty");
    }
    me.size = 100 + (state === 2 ? 4 * sin(timer() * 720) : 0);
    game.sFryer = state;
    game.pFryer = p;
  }
});

whenClicked(() => {
  if (game.phase === "day") {
    if (state === 0) {
      start();
    } else if (state === 2) {
      if (game.trayF === 0) {
        collect();
      } else {
        playSound("deny");
      }
    } else if (state === 3) {
      state = 0;
      switchCostume("fryer_empty");
      playSound("trash");
    }
  }
});

onMessage("day over", () => {
  me.visible = false;
});

whenFlag(() => {
  me.visible = false;
});
