// Big text banners: "WAVE INCOMING!" and "PICK AN UPGRADE".
import { game } from "./Stage";

whenFlag(() => {
  me.visible = false;
});

onMessage("wave start", () => {
  switchCostume("wave");
  playSound("wave");
  goTo(0, 60);
  me.size = 30;
  me.visible = true;
  goToFront();
  repeat(7, () => {
    me.size += 10;
  });
  wait(1.2);
  me.visible = false;
});

onMessage("choose", () => {
  switchCostume("choose");
  goTo(0, 130);
  me.size = 70;
  me.visible = true;
  goToFront();
  waitUntil(() => !game.choosing);
  me.visible = false;
});

onMessage("game over", () => {
  me.visible = false;
});
