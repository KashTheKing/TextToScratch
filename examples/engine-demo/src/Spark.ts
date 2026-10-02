// Particle bursts when a coin is collected.
import * as Particles from "tts/particles";
import { game } from "./Stage";

whenFlag(() => {
  me.visible = false;
});

onMessage("sparkle", () => {
  Particles.burst(game.sparkX, game.sparkY, 10, 4, 18, 0.25);
});

onClone(() => {
  Particles.run();
});
