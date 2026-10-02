// Auto-chef (bought in the shop): keeps the grill and fryer busy and loads the tray.
import { game } from "./Stage";

onMessage("day start", () => {
  goTo(148, -66);
  me.visible = game.chef === 1;
  while (game.phase === "day") {
    switchCostume("chef1");
    wait(0.25);
    switchCostume("chef2");
    wait(0.25);
  }
});

onMessage("day over", () => {
  me.visible = false;
});

whenFlag(() => {
  me.visible = false;
});
