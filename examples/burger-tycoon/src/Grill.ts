// Grill station: click to cook a patty, click again when it's READY to put it on the tray. Don't let it burn!
import { game } from "./Stage";

const BURN = 7; // seconds a ready patty survives
let state = 0; // 0 empty, 1 cooking, 2 ready, 3 burnt
let t0 = 0;
let p = 0;

function cookTime(): number {
  return 4 - game.grillLvl * 1.1;
}

function start() {
  state = 1;
  t0 = timer();
  switchCostume("grill_cook");
  playSound("sizzle");
}

function collect() {
  game.trayB = 1;
  state = 0;
  switchCostume("grill_empty");
  playSound("pop");
}

onMessage("day start", () => {
  state = 0;
  p = 0;
  switchCostume("grill_empty");
  goTo(-180, -75);
  me.visible = true;
  while (game.phase === "day") {
    if (state === 0 && game.chef === 1 && game.dayLeft > 0) start();
    if (state === 1) {
      p = (timer() - t0) / cookTime();
      if (p >= 1) {
        state = 2;
        t0 = timer();
        switchCostume("grill_ready");
        playSound("ding");
      }
    }
    if (state === 2) {
      p = 1 - (timer() - t0) / BURN;
      if (game.chef === 1 && game.trayB === 0) collect();
      if (p <= 0) {
        state = 3;
        switchCostume("grill_burnt");
        playSound("burnt");
      }
    }
    if (state === 3 && game.chef === 1) {
      state = 0;
      switchCostume("grill_empty");
    }
    me.size = 100 + (state === 2 ? 4 * sin(timer() * 720) : 0);
    game.sGrill = state;
    game.pGrill = p;
  }
});

whenClicked(() => {
  if (game.phase === "day") {
    if (state === 0) {
      start();
    } else if (state === 2) {
      if (game.trayB === 0) {
        collect();
      } else {
        playSound("deny");
      }
    } else if (state === 3) {
      state = 0;
      switchCostume("grill_empty");
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
