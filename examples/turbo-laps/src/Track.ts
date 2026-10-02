// The track: 3x3 tiles of 480x360 (world 1440x1080), one clone each, placed by the camera every frame.
import * as Camera from "tts/camera";

let tile = 0;
let isClone = false;

whenFlag(() => {
  me.visible = false;
  isClone = false;
  for (let i = 0; i < 9; i++) {
    tile = i;
    createClone();
  }
});

onClone(() => {
  isClone = true;
  switchCostume(tile + 1);
  goToBack();
  const tx = ((tile % 3) - 1) * 480;
  const ty = (1 - Math.floor(tile / 3)) * 360;
  forever(() => {
    Camera.placeTile(tx, ty, 240, 180);
  });
});
