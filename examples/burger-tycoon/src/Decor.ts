// Plants and party lights bought in the shop: happier guests wait longer and tip more.
import { game } from "./Stage";

onMessage("day start", () => {
  goTo(0, 59);
  goToBack();
  switchCostume(game.decor >= 2 ? "decor2" : "decor1");
  me.visible = game.decor > 0;
});

onMessage("day over", () => {
  me.visible = false;
});

whenFlag(() => {
  me.visible = false;
});
