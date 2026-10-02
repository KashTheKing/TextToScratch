// HUD: "LAP n/3" badge under the position.
import * as Scene from "tts/scene";
import { game, LAPS } from "./Stage";

whenFlag(() => {
  me.visible = false;
});

onMessage("scene race", () => {
  goTo(170, 98);
  me.visible = true;
  while (Scene.is("race")) {
    goToFront();
    switchCostume(Math.max(1, Math.min(LAPS, game.lap)));
  }
});

onMessage("scene menu", () => {
  me.visible = false;
});
