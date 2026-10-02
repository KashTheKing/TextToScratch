// Title card: on top of everything until the player clicks or presses space (View is joining the session meanwhile).
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
  playSound("start");
  waitUntil(() => !mouseDown() && !keyPressed("space"));
  me.visible = false;
  game.titleDone = true;
});
