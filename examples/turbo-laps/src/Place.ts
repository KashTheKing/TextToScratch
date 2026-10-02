// HUD: race position badge (1st..4th), top right.
import * as Scene from "tts/scene";
import { game, rprog } from "./Stage";

whenFlag(() => {
  me.visible = false;
});

onMessage("scene race", () => {
  goTo(178, 145);
  me.visible = true;
  while (Scene.is("race")) {
    goToFront();
    let p = 1;
    for (let i = 0; i < rprog.length; i++) {
      if (rprog[i] > game.prog) p++;
    }
    game.place = p;
    switchCostume(p);
  }
});

onMessage("scene menu", () => {
  me.visible = false;
});
