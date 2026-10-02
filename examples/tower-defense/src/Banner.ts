// Big centre messages: get ready, boss warning, victory and game over (click to restart).
import { game } from "./Stage";

whenFlag(() => {
  me.visible = false;
});

onMessage("setup", () => {
  switchCostume("ready");
  goTo(0, -20);
  me.size = 80;
  clearEffects();
  goToFront();
  me.visible = true;
  wait(3);
  if (game.wave === 0) me.visible = false;
});

onMessage("start wave", () => {
  if (game.wave % 5 === 0) {
    switchCostume("boss");
    playSound("boss");
    me.size = 70;
    goToFront();
    me.visible = true;
    wait(2);
  } else {
    playSound("wave");
  }
  if (game.over === 0) me.visible = false;
});

onMessage("win", () => {
  switchCostume("win");
  showEnd();
  playSound("win");
});

onMessage("lose", () => {
  switchCostume("lose");
  showEnd();
  playSound("lose");
});

function showEnd() {
  me.size = 30;
  goToFront();
  me.visible = true;
  repeat(10, () => {
    me.size += 7;
  });
}

whenClicked(() => {
  if (game.over === 1) broadcast("setup");
});
