// Particle bursts for explosions and bullet impacts, queued by any sprite through `fx`.
import * as Particles from "tts/particles";
import { fx } from "./Stage";

/** @warp */
function drain() {
  while (fx.length >= 3) {
    Particles.burst(fx[0], fx[1], fx[2], fx[2] > 6 ? 6 : 3, fx[2] > 6 ? 18 : 8, 0);
    fx.shift();
    fx.shift();
    fx.shift();
  }
}

whenFlag(() => {
  me.visible = false;
  forever(() => drain());
});

onClone(() => Particles.run());
