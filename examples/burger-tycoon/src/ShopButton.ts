// End-of-day shop: one clone per upgrade plus the "open shop" button.
import { game, prices } from "./Stage";

const BUTTON_X: number[] = [-164, -82, 0, 82, 164];
let id = 0; // 1 grill, 2 seat, 3 chef, 4 decor, 5 shakes, 6 next day

function priceOf(n: number): number {
  let p = -1;
  if (n === 1) p = game.grillLvl === 0 ? 40 : game.grillLvl === 1 ? 90 : -1;
  if (n === 2) p = game.seats === 2 ? 50 : game.seats === 3 ? 110 : -1;
  if (n === 3) p = game.chef === 0 ? 150 : -1;
  if (n === 4) p = game.decor === 0 ? 60 : game.decor === 1 ? 140 : -1;
  if (n === 5) p = game.shakeOn === 0 ? 80 : -1;
  return p;
}

/** @warp */
function updatePrices() {
  for (let i = 1; i <= 5; i++) {
    const p = priceOf(i);
    prices[i - 1] = p;
  }
}

onMessage("day over", () => {
  if (game.phase === "shop") {
    updatePrices();
    for (let i = 1; i <= 6; i++) {
      id = i;
      createClone();
    }
    id = 0;
  }
});

onClone(() => {
  if (id === 6) {
    switchCostume("b_next");
    goTo(0, -136);
    me.size = 80;
  } else {
    switchCostume(id === 1 ? "b_grill" : id === 2 ? "b_seat" : id === 3 ? "b_chef" : id === 4 ? "b_decor" : "b_shake");
    goTo(BUTTON_X[id - 1], -38);
    me.size = 76;
  }
  me.visible = true;
  goToFront();
  while (game.phase === "shop") {
    let ghost = 0;
    if (id < 6) {
      const p = prices[id - 1];
      if (p < 0) ghost = 65;
      if (p > game.money) ghost = 55;
    }
    setEffect("ghost", ghost);
    const base = id === 6 ? 80 : 76;
    if (touching("mouse") && ghost === 0) {
      me.size += (base * 1.1 - me.size) / 3;
    } else {
      me.size += (base - me.size) / 3;
    }
  }
  deleteClone();
});

whenClicked(() => {
  if (game.phase === "shop" && id > 0) {
    if (id === 6) {
      playSound("pop");
      game.day++;
      game.phase = "day";
      broadcast("day start");
    } else {
      const p = prices[id - 1];
      if (p >= 0 && game.money >= p) {
        game.money -= p;
        if (id === 1) game.grillLvl++;
        if (id === 2) game.seats++;
        if (id === 3) game.chef = 1;
        if (id === 4) game.decor++;
        if (id === 5) game.shakeOn = 1;
        game.bounce = 6;
        playSound("buy");
        updatePrices();
        repeat(3, () => {
          me.y += 4;
        });
        repeat(3, () => {
          me.y -= 4;
        });
      } else {
        playSound("deny");
      }
    }
  }
});

whenFlag(() => {
  me.visible = false;
});
