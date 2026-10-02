// The goal flag at the end of the level.
import * as Camera from "tts/camera";
import * as Scene from "tts/scene";
import { LEVEL_END } from "./Stage";

whenFlag(() => {
  me.visible = false;
});

onMessage("scene play", () => {
  while (Scene.is("play")) {
    Camera.place(LEVEL_END, -118);
    if (Camera.onScreen && touching("Player")) Scene.go("win");
  }
  me.visible = false;
});
