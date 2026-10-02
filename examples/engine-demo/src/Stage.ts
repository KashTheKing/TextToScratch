// Sky Run: a scrolling platformer built on the TextToScratch engine.
import * as Scene from "tts/scene";

export const game = { coins: 0, progress: 0, sparkX: 0, sparkY: 0 };
export const LEVEL_END = 1140; // world x of the goal

whenFlag(() => {
  switchBackdrop("sky");
  Scene.go("menu");
});

onMessage("scene play", () => {
  game.coins = 0;
  game.progress = 0;
  showVariable(game.coins);
});
