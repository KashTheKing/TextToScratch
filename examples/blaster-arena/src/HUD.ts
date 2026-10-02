// Health bar along the top, drawn with the pen.
import * as Draw from "tts/draw";
import { game } from "./Stage";

whenFlag(() => {
  me.visible = false;
  penClear();
});

onMessage("start", () => {
  while (game.playing) {
    penClear();
    Draw.outline(0, 166, 148, 18, 3, "#0E1A24");
    Draw.bar(-72, 166, 144, 12, game.alive ? game.hp / 5 : 0, game.hp > 2 ? "#4CBF56" : "#FF5F5F", "#3A2030");
  }
  penClear();
});
