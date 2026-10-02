// Coins: one clone per position; collected coins burst into sparks.
import * as Camera from "tts/camera";
import * as Scene from "tts/scene";
import { game } from "./Stage";

const coinX = [115, -60, 400, 510, 650, 815, 955, 1060];
const coinY = [-50, -115, -60, -40, 20, -70, -10, -115];

let cx = 0;
let cy = 0;

whenFlag(() => {
  me.visible = false;
});

onMessage("scene play", () => {
  for (let i = 0; i < coinX.length; i++) {
    cx = coinX[i];
    cy = coinY[i];
    createClone();
  }
});

onClone(() => {
  while (Scene.is("play")) {
    Camera.place(cx, cy + sin(timer() * 180 + cx) * 4);
    if (Camera.onScreen && touching("Player")) {
      game.coins++;
      game.sparkX = me.x;
      game.sparkY = me.y;
      broadcast("sparkle");
      deleteClone();
    }
  }
  deleteClone();
});
