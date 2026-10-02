// Drink station: click to pour, click when READY to put the drink on the tray.
import { game } from "./Stage";

const BURN = 9999; // drinks never spoil
let state = 0; // 0 empty, 1 cooking, 2 ready
let t0 = 0;
let p = 0;

function cookTime(): number {
  return 1.6;
}

function start() {
  state = 1;
  t0 = timer();
  switchCostume("soda_pour");
  playSound("pour");
}

function collect() {
  game.trayD = 1;
  state = 0;
  switchCostume("soda_empty");
  playSound("pop");
}

onMessage("day start", () => {
  state = 0;
  p = 0;
  switchCostume("soda_empty");
  goTo(-10, -75);
  me.visible = true;
  while (game.phase === "day") {
    if (state === 1) {
      p = (timer() - t0) / cookTime();
      if (p >= 1) {
        state = 2;
        t0 = timer();
        switchCostume("soda_ready");
        playSound("ding");
      }
    }
    if (state === 2) {
      p = 1 - (timer() - t0) / BURN;
    }
    me.size = 100 + (state === 2 ? 4 * sin(timer() * 720) : 0);
    game.sSoda = state;
    game.pSoda = p;
  }
});

whenClicked(() => {
  if (game.phase === "day") {
    if (state === 0) {
      start();
    } else if (state === 2) {
      if (game.trayD === 0) {
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
