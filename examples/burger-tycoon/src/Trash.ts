// Trash can: click to empty the tray if you grabbed the wrong things.
import { game } from "./Stage";

onMessage("day start", () => {
  switchCostume("trash");
  goTo(205, -90);
  me.visible = true;
});

whenClicked(() => {
  if (game.phase === "day") {
    if (game.trayB + game.trayF + game.trayD + game.trayS > 0) {
      game.trayB = 0;
      game.trayF = 0;
      game.trayD = 0;
      game.trayS = 0;
      playSound("trash");
      switchCostume("trash_open");
      wait(0.3);
      switchCostume("trash");
    } else {
      playSound("deny");
    }
  }
});

onMessage("day over", () => {
  me.visible = false;
});

whenFlag(() => {
  me.visible = false;
});
