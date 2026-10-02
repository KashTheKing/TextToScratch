// Menu and finish panels. Space starts (or restarts) the race.
import * as Scene from "tts/scene";
import { game } from "./Stage";

function waitForStart() {
  goToFront();
  me.visible = true;
  waitUntil(() => !keyPressed("space"));
  waitUntil(() => keyPressed("space"));
  playSound("select");
  me.visible = false;
  Scene.go("race");
}

whenFlag(() => {
  me.visible = false;
});

onMessage("scene menu", () => {
  goTo(0, 0);
  switchCostume("menu");
  waitForStart();
});

onMessage("scene finish", () => {
  goTo(0, 0);
  switchCostume(("f" + game.place) as CostumeName);
  if (game.place === 1) playSound("win");
  else playSound("lose");
  me.size = 30;
  me.visible = true;
  goToFront();
  repeat(8, () => {
    me.size += 10;
  });
  me.size = 100;
  wait(0.8);
  waitForStart();
});
