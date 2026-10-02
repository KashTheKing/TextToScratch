// The level: three 480x360 tiles, one clone each, placed by the camera every frame.
import * as Camera from "tts/camera";
import * as Scene from "tts/scene";

let tile = 0;

whenFlag(() => {
  me.visible = false;
});

onMessage("scene play", () => {
  for (let i = 0; i < 3; i++) {
    tile = i;
    createClone();
  }
});

onClone(() => {
  switchCostume(tile + 1);
  while (Scene.is("play")) Camera.placeTile(tile * 480, 0, 240, 180);
  deleteClone();
});
