// 3, 2, 1, GO! at the start of each race.
import * as Scene from "tts/scene";
import { game } from "./Stage";

whenFlag(() => {
  me.visible = false;
});

onMessage("scene race", () => {
  goTo(0, 40);
  goToFront();
  wait(0.6);
  for (let i = 3; i > 0; i--) {
    switchCostume(("c" + i) as CostumeName);
    me.size = 140;
    me.visible = true;
    playSound("beep");
    repeat(10, () => {
      me.size -= 4;
    });
    wait(0.5);
  }
  switchCostume("cgo");
  me.size = 140;
  playSound("go");
  game.go = true;
  game.lapStart = timer();
  repeat(15, () => {
    me.size += 2;
    changeEffect("ghost", 6);
  });
  me.visible = false;
  clearEffects();
});

onMessage("scene menu", () => {
  me.visible = false;
});
