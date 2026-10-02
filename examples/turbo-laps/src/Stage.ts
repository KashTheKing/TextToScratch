// Turbo Laps: top-down racing on a scrolling track. Shared race state lives here.
import * as Scene from "tts/scene";

export const game = { go: false, prog: 0, lap: 0, lapTime: 0, bestLap: 0, place: 4, speed: 0, lapStart: 0 };
/** Progress of each rival (laps * waypoints + waypoint), used for the race position. */
export const rprog: number[] = [];
export const LAPS = 3;

whenFlag(() => {
  switchBackdrop("grass");
  hideVariable(game.lapTime);
  hideVariable(game.bestLap);
  game.bestLap = 0;
  Scene.go("menu");
});

onMessage("scene race", () => {
  game.go = false;
  game.prog = 0;
  game.lap = 0;
  game.lapTime = 0;
  game.speed = 0;
  game.place = 4;
  showVariable(game.lapTime);
  showVariable(game.bestLap);
});
