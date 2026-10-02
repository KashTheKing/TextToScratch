// This player's robot: move, aim, blast, take hits, respawn, publish state, quick chat.
import * as Net from "tts/net";
import * as Input from "tts/input";
import { game, myShots, fx, remote, remoteKills, botKills, CRATE } from "./Stage";

const SPEED = 4;
const MAX_HP = 5;
const WIN = 10;

let shotSeq = 0;
let nextShot = 0;
let respawnAt = 0;
let deaths = 0;
let killer = 0;
let lastHp = 0;
let chatUntil = 0;

/** True if the round body (not the cannon) overlaps a crate. */
/** @warp */
function blocked(): boolean {
  switchCostume("hitbox");
  const hit = touchingColor(CRATE);
  switchCostume("me");
  return hit;
}

/** @warp */
function moveBy(dx: number, dy: number) {
  me.x += dx;
  const bx = blocked();
  if (bx || Math.abs(me.x) > 222) me.x -= dx;
  me.y += dy;
  const by = blocked();
  if (by || Math.abs(me.y) > 155) me.y -= dy;
}

/** @warp */
function spawnSpot() {
  goTo(random(-210, 210), random(-150, 150));
  let tries = 0;
  while (tries < 50 && blocked()) {
    goTo(random(-210, 210), random(-150, 150));
    tries++;
  }
}

function respawn() {
  spawnSpot();
  game.hp = MAX_HP;
  lastHp = MAX_HP;
  game.shield = timer() + 1.5;
  game.alive = true;
  me.visible = true;
  goToFront();
  playSound("respawn");
}

function die() {
  game.alive = false;
  deaths++;
  killer = game.lastHit <= 6 ? game.lastHit : 0;
  if (game.lastHit > 10) botKills[game.lastHit - 11] += 1;
  fx.push(me.x);
  fx.push(me.y);
  fx.push(18);
  playSound("explode");
  me.visible = false;
  respawnAt = timer() + 2;
}

function shoot() {
  nextShot = timer() + 0.22;
  shotSeq = (shotSeq + 1) % 10;
  myShots.push(me.x + 26 * sin(me.direction));
  myShots.push(me.y + 26 * cos(me.direction));
  myShots.push(me.direction);
  myShots.push(0);
  playSound("shoot");
}

function chat(phrase: number) {
  Net.sendMessage(phrase);
  say(Net.QUICK_CHAT[phrase]);
  chatUntil = timer() + 2.5;
  playSound("chat");
}

/** @warp */
function updateRival() {
  let best = 0;
  for (let i = 0; i < 3; i++) best = Math.max(best, botKills[i]);
  let online = 0;
  for (let i = 0; i < 6; i++) {
    online += remote[i];
    best = Math.max(best, remoteKills[i]);
  }
  game.rival = best;
  game.alone = online === 0;
}

whenFlag(() => {
  me.visible = false;
  me.rotationStyle = "all around";
  switchCostume("me");
  game.alive = false;
  Net.join();
  if (Net.session.slot > 0) setEffect("color", (Net.session.slot - 1) * 30);
  game.joined = true;
  // keep our slot alive while in the menu
  forever(() => {
    if (!game.playing) Net.sendState(4000, 0, 0, game.kills * 100 + (deaths % 10) * 10 + killer);
  });
});

onMessage("start", () => {
  deaths = 0;
  killer = 0;
  respawn();
  while (game.playing) {
    if (game.alive) {
      const ax = Input.axisX();
      const ay = Input.axisY();
      moveBy(ax * SPEED, ay * SPEED);
      pointTowards("mouse");
      if (mouseDown() && timer() > nextShot) shoot();
      if (timer() < game.shield) setEffect("ghost", 50 * (Math.floor(timer() * 8) % 2));
      else setEffect("ghost", 0);
      if (game.hp < lastHp) {
        playSound("hurt");
        setEffect("brightness", 60);
      } else {
        setEffect("brightness", 0);
      }
      lastHp = game.hp;
      if (game.hp <= 0) die();
    } else if (timer() > respawnAt) {
      respawn();
    }
    game.px = me.x;
    game.py = me.y;
    const dir = Math.round(me.direction) + 180;
    Net.sendState(game.alive ? me.x : 4000, me.y, dir + 400 * shotSeq, game.kills * 100 + (deaths % 10) * 10 + killer);

    if (Input.pressedOnce("1")) chat(0);
    if (Input.pressedOnce("2")) chat(1);
    if (Input.pressedOnce("3")) chat(2);
    if (Input.pressedOnce("4")) chat(3);
    if (Input.pressedOnce("5")) chat(4);
    if (Input.pressedOnce("6")) chat(5);
    if (chatUntil > 0 && timer() > chatUntil) {
      say("");
      chatUntil = 0;
    }
    const got = Net.pollMessage();
    if (got) {
      game.chatFrom = Net.messageFrom;
      game.chatText = Net.message;
      game.chatSeq++;
    }

    updateRival();
    if (game.kills >= WIN || game.rival >= WIN) {
      game.won = game.kills >= WIN;
      game.playing = false;
      broadcast("round over");
    }
  }
  me.visible = false;
  say("");
});
