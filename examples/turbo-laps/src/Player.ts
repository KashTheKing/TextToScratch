// The player's car: drifty top-down physics in world coordinates; the camera follows it.
import * as Input from "tts/input";
import * as Camera from "tts/camera";
import * as Scene from "tts/scene";
import * as Time from "tts/time";
import { game, rprog, LAPS } from "./Stage";
import { WX, WY, trackDist, onPad, HALF_WIDTH } from "./lib/track";

const MAX_SPEED = 8;
const BOOST_SPEED = 12.5;
const GRASS_SPEED = 3.2;

let wx = 0;
let wy = 0;
let vx = 0;
let vy = 0;
let dir = 90;
let wp = 0;
let boosting = 0;

/** Has the car reached waypoint i? Waypoint 0 is the start/finish line and must actually be crossed. */
/** @warp */
function reached(i: number): boolean {
  const dx = wx - WX[i];
  const dy = wy - WY[i];
  if (i === 0) return wx >= 0 && Math.abs(dy) < 90 && dx < 120;
  return dx * dx + dy * dy < 130 * 130;
}

/** @warp */
function advance() {
  if (wp === 0) {
    game.lap++;
    if (game.lap > 1) lapDone();
    game.lapStart = timer();
  }
  wp = (wp + 1) % WX.length;
}

/** @warp */
function lapDone() {
  const t = Math.round((timer() - game.lapStart) * 100) / 100;
  if (game.bestLap === 0 || t < game.bestLap) game.bestLap = t;
  playSound("lap");
}

/** @warp */
function physics() {
  const fx = sin(dir);
  const fy = cos(dir);
  const rx = fy;
  const ry = -fx;
  let fwd = vx * fx + vy * fy;
  let lat = vx * rx + vy * ry;
  const offRoad = trackDist(wx, wy) > HALF_WIDTH;
  if (game.go) {
    const steer = Input.axisX();
    if (keyPressed("up arrow") || keyPressed("w")) fwd += 0.42;
    if (keyPressed("down arrow") || keyPressed("s")) fwd -= fwd > 0 ? 0.5 : 0.2;
    const grip = Math.min(1, Math.abs(fwd) / 3);
    dir += steer * 5.2 * grip * (fwd < 0 ? -1 : 1);
    // turning flings the car sideways a little: that's the drift
    lat -= steer * Math.abs(fwd) * 0.06;
  }
  if (onPad(wx, wy) && game.go) {
    if (boosting < 5) playSound("boost");
    boosting = 30;
  }
  let top = MAX_SPEED;
  if (boosting > 0) {
    boosting--;
    top = BOOST_SPEED;
    fwd += 0.8;
  }
  if (offRoad && boosting === 0) {
    top = GRASS_SPEED;
    lat *= 0.8;
  }
  fwd *= 0.985;
  if (fwd > top) fwd += (top - fwd) * 0.15;
  if (fwd < -3) fwd = -3;
  lat *= 0.86;
  if (Math.abs(lat) > 1.6 && Math.abs(fwd) > 4 && !offRoad && Time.cooldown("skid", 0.35)) playSound("skid");
  vx = fx * fwd + rx * lat;
  vy = fy * fwd + ry * lat;
  game.speed = Math.abs(fwd);
}

whenFlag(() => {
  me.visible = false;
  me.rotationStyle = "all around";
  game.bestLap = 0;
});

onMessage("scene menu", () => {
  wx = -130;
  wy = -395;
  Camera.lookAt(-60, -300);
  me.visible = false;
});

onMessage("scene race", () => {
  wx = -130;
  wy = -395;
  vx = 0;
  vy = 0;
  dir = 90;
  wp = 0;
  boosting = 0;
  game.lap = 0; // also reset in Stage, but this script may run first
  game.prog = 0;
  Camera.lookAt(wx, -300);
  me.visible = true;
  while (Scene.is("race")) {
    physics();
    wx = Math.max(-700, Math.min(700, wx + vx));
    wy = Math.max(-520, Math.min(520, wy + vy));
    Camera.follow(wx + vx * 10, wy + vy * 10, 0.18);
    Camera.clampTo(-480, -360, 480, 360);
    Camera.place(wx, wy);
    me.direction = dir;
    if (touching("Rival")) {
      vx *= 0.6;
      vy *= 0.6;
      if (Time.cooldown("bump", 0.4)) {
        playSound("bump");
        Camera.shake(4);
      }
    }
    if (reached(wp)) advance();
    else {
      const nx = (wp + 1) % WX.length;
      if (nx !== 1 && (wx - WX[nx]) * (wx - WX[nx]) + (wy - WY[nx]) * (wy - WY[nx]) < 100 * 100) {
        advance();
        advance();
      }
    }
    const dx = wx - WX[wp];
    const dy = wy - WY[wp];
    game.prog = game.lap * WX.length + wp - Math.sqrt(dx * dx + dy * dy) / 2000;
    if (game.lap >= 1) game.lapTime = Math.round((timer() - game.lapStart) * 10) / 10;
    if (game.lap > LAPS) {
      // final position, worked out here so the finish panel never sees a stale value
      let p = 1;
      for (let i = 0; i < rprog.length; i++) {
        if (rprog[i] > game.prog) p++;
      }
      game.place = p;
      Scene.go("finish");
    }
  }
});

onMessage("scene race", () => {
  me.volume = 45;
  while (Scene.is("race")) {
    setSoundEffect("pitch", game.speed * 14 - 30);
    playSoundUntilDone("engine");
  }
});
