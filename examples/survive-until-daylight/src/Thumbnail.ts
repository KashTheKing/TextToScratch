// Title card: on top of everything until the player clicks or presses space.
import { game } from "./Stage";

let clicked = false;

whenClicked(() => {
  clicked = true;
});

whenFlag(() => {
  clicked = false;
  goTo(0, 0);
  me.visible = true;
  goToFront();
  wait(0.3);
  waitUntil(() => clicked || mouseDown() || keyPressed("space"));
  playSound("begin");
  waitUntil(() => !mouseDown() && !keyPressed("space"));
  me.visible = false;
  game.titleDone = true;
});
