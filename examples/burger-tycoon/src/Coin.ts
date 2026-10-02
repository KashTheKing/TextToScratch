// Coin shower when a guest pays.
import * as Particles from "tts/particles";
import { game } from "./Stage";

whenFlag(() => {
  me.visible = false;
});

onMessage("coins", () => {
  Particles.burst(game.coinX, game.coinY, 12, 5, 20, 0.5);
});

onClone(() => {
  Particles.run();
});
