// Hungry guests. The original sprite is a hidden spawner; each clone takes a seat, orders and waits.
import { game, seatState, seatOrder, seatPatience, SEAT_X } from "./Stage";

const CHARACTERS = 4;
let seat = 0;
let look = "cat";
let wantServe = 0;
let startT = 0;
let maxWait = 30;
let pay = 0;

function has(order: number, bit: number): boolean {
  return Math.floor(order / bit) % 2 === 1;
}

function freeSeat(): number {
  let found = -1;
  for (let i = 0; i < game.seats; i++) {
    if (found < 0 && seatState[i] === 0) found = i;
  }
  return found;
}

function makeOrder(): number {
  let o = 0;
  if (Math.random() < 0.85) o += 1;
  if (random(1, 2) === 1) o += 2;
  if (random(1, 2) === 1) o += 4;
  if (game.shakeOn === 1 && random(1, 3) === 1) o += 8;
  if (o === 0) o = 1;
  return o;
}

function pickLook() {
  const n = random(1, CHARACTERS);
  look = "cat";
  if (n === 2) look = "bear";
  if (n === 3) look = "frog";
  if (n === 4) look = "robot";
}

onMessage("day start", () => {
  me.visible = false;
  wait(1);
  while (game.phase === "day" && game.dayLeft > 1) {
    const s = freeSeat();
    if (s >= 0) {
      seat = s;
      seatState[s] = 1;
      seatOrder[s] = makeOrder();
      pickLook();
      createClone();
    }
    wait(Math.max(1.2, 4 - game.day * 0.35) + Math.random() * 1.5);
  }
});

function trayHasOrder(o: number): boolean {
  let ok = true;
  if (has(o, 1) && game.trayB === 0) ok = false;
  if (has(o, 2) && game.trayF === 0) ok = false;
  if (has(o, 4) && game.trayD === 0) ok = false;
  if (has(o, 8) && game.trayS === 0) ok = false;
  return ok;
}

function takeFromTray(o: number) {
  pay = 0;
  if (has(o, 1)) {
    game.trayB = 0;
    pay += 5;
  }
  if (has(o, 2)) {
    game.trayF = 0;
    pay += 3;
  }
  if (has(o, 4)) {
    game.trayD = 0;
    pay += 2;
  }
  if (has(o, 8)) {
    game.trayS = 0;
    pay += 6;
  }
}

onClone(() => {
  switchCostume(look as CostumeName);
  me.size = 100;
  goTo(250, 48);
  me.visible = true;
  goToBack();
  wantServe = 0;
  glide(0.8, SEAT_X[seat], 48);
  playSound("bell");
  maxWait = Math.max(16, 34 - game.day * 2) + game.decor * 3;
  startT = timer();
  seatPatience[seat] = 1;
  seatState[seat] = 2;
  let patience = 1;
  while (seatState[seat] === 2 && wantServe === 0 && patience > 0) {
    patience = 1 - (timer() - startT) / maxWait;
    seatPatience[seat] = patience;
    if (patience < 0.3) {
      switchCostume((look + "_mad") as CostumeName);
      me.x = SEAT_X[seat] + random(-1, 1);
    }
  }
  me.x = SEAT_X[seat];
  if (wantServe === 1) {
    takeFromTray(seatOrder[seat]);
    const tip = Math.round(pay * patience * (0.5 + game.decor * 0.4));
    pay += tip;
    game.money += pay;
    game.earned += pay;
    game.served++;
    game.bounce = 6;
    seatState[seat] = 3;
    switchCostume(look as CostumeName);
    playSound("cash");
    game.coinX = me.x;
    game.coinY = me.y + 30;
    broadcast("coins");
    if (patience > 0.6) {
      game.happy++;
      if (game.happy >= 3 && game.stars < 5) {
        game.happy = 0;
        game.stars++;
      }
    }
    say(tip > 0 ? `+$${pay}  (tip $${tip})` : `+$${pay}`);
    repeat(4, () => {
      me.y += 3;
    });
    repeat(4, () => {
      me.y -= 3;
    });
    wait(0.5);
    say("");
    glide(0.8, -250, 48);
  } else {
    seatState[seat] = 3;
    game.missed++;
    game.stars--;
    game.happy = 0;
    playSound("grumble");
    say("Too slow!");
    wait(0.8);
    say("");
    glide(0.8, 250, 48);
    if (game.stars <= 0) broadcast("lost");
  }
  seatState[seat] = 0;
  deleteClone();
});

whenClicked(() => {
  if (seatState[seat] === 2 && wantServe === 0) {
    if (trayHasOrder(seatOrder[seat])) {
      wantServe = 1;
    } else {
      playSound("deny");
      sayFor("That's not my order!", 0.8);
    }
  }
});

onMessage("day over", () => {
  me.visible = false;
  deleteClone();
});

whenFlag(() => {
  me.visible = false;
});
