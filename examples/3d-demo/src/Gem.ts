// A sprite placed in the 3D world: it scales with distance and bobs up and down.
import * as ThreeD from "tts/3d";

whenFlag(() => {
  forever(() => {
    ThreeD.placeSprite(-200, 130 + sin(timer() * 120) * 15, 150, 60);
  });
});
