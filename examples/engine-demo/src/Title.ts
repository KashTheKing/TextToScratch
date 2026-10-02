// Menu and win panels. Click or press space to (re)start.
import * as Scene from "tts/scene";

function waitForStart() {
  goToFront();
  goTo(0, 20);
  me.visible = true;
  waitUntil(() => !mouseDown() && !keyPressed("space"));
  waitUntil(() => mouseDown() || keyPressed("space"));
  me.visible = false;
  Scene.go("play");
}

whenFlag(() => {
  me.visible = false;
});

onMessage("scene menu", () => {
  switchCostume("menu");
  waitForStart();
});

onMessage("scene win", () => {
  switchCostume("win");
  waitForStart();
});
