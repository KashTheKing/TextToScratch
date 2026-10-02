// Level progress bar, drawn with the pen.
import * as Draw from "tts/draw";
import * as Scene from "tts/scene";
import { game } from "./Stage";

whenFlag(() => {
  me.visible = false;
  penClear();
});

onMessage("scene play", () => {
  while (Scene.is("play")) {
    penClear();
    Draw.bar(-60, 166, 200, 10, game.progress, "#4CBF56", "#22306E");
    Draw.outline(40, 166, 204, 14, 2, "#FFFFFF");
  }
  penClear();
});
