// Three AI cars (clones) that follow the waypoints, each with its own lane and top speed.
import * as Camera from "tts/camera";
import * as Scene from "tts/scene";
import * as Maths from "tts/math";
import { game, rprog } from "./Stage";
import { WX, WY, onPad } from "./lib/track";

const START_X: number[] = [-40, -40, -130];
const START_Y: number[] = [-395, -445, -445];
const TOP: number[] = [7.5, 7.0, 7.25];

let id = 0;
let isClone = false;
let wx = 0;
let wy = 0;
let dir = 90;
let spd = 0;
let wp = 0;
let lap = 0;
let lane = 0;
let boost = 0;

whenFlag(() => {
  me.visible = false;
  isClone = false;
});

onMessage("scene menu", () => {
  if (isClone) deleteClone();
});

onMessage("scene race", () => {
  if (isClone) deleteClone();
  rprog.length = 0;
  for (let i = 0; i < 3; i++) {
    rprog.push(0);
    id = i;
    createClone();
  }
});

/** @warp */
function drive() {
  const tx = WX[wp] + lane;
  const ty = WY[wp] + lane;
  const want = Maths.directionTo(wx, wy, tx, ty);
  const diff = Maths.wrap(want - dir, -180, 180);
  dir += Maths.clamp(diff, -5, 5);
  let top = TOP[id] * (1 - Math.min(Math.abs(diff), 90) / 260);
  if (onPad(wx, wy)) boost = 25;
  if (boost > 0) {
    boost--;
    top = 11.5;
  }
  if (spd < top) spd = Math.min(top, spd + 0.3);
  else spd += (top - spd) * 0.2;
  wx += sin(dir) * spd;
  wy += cos(dir) * spd;
  const dx = wx - WX[wp];
  const dy = wy - WY[wp];
  const d = Math.sqrt(dx * dx + dy * dy);
  let hit = d < 70;
  if (wp === 0) hit = wx >= 0 && Math.abs(dy) < 90 && dx < 120;
  if (hit) {
    if (wp === 0) lap++;
    wp = (wp + 1) % WX.length;
    lane = random(-25, 25);
  }
  rprog[id] = lap * WX.length + wp - d / 2000;
}

onClone(() => {
  isClone = true;
  switchCostume(id + 1);
  me.rotationStyle = "all around";
  wx = START_X[id];
  wy = START_Y[id];
  dir = 90;
  spd = 0;
  wp = 0;
  lap = 0;
  lane = 0;
  boost = 0;
  while (Scene.is("race")) {
    if (game.go) drive();
    Camera.place(wx, wy);
    me.direction = dir;
  }
});
