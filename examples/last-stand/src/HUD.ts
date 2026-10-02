// Health bar (pen) along the bottom of the screen, plus power-up dots.
import * as Draw from "tts/draw";
import { game } from "./Stage";

whenFlag(() => {
  me.visible = false;
  penClear();
});

onMessage("start", () => {
  while (game.playing) {
    penClear();
    Draw.rect(0, -164, 164, 20, "#2A1B3D");
    Draw.bar(-78, -164, 156, 12, game.hp / game.maxHp, game.hp < 2 ? "#FA5252" : "#51CF66", "#5C3D2E");
    if (timer() < game.rapidUntil) Draw.circle(100, -164, 8, "#FCC419");
    if (timer() < game.spreadUntil) Draw.circle(122, -164, 8, "#4DABF7");
  }
  penClear();
});
