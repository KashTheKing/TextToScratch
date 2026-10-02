// Everything drawn with the pen: money, stars, clock, order bubbles, cooking bars, the tray and the shop prices.
import * as Draw from "tts/draw";
import { game, seatState, seatOrder, seatPatience, prices, SEAT_X, DAY_LENGTH } from "./Stage";

const STATION_X: number[] = [-180, -95, -10, 75];

function has(order: number, bit: number): boolean {
  return Math.floor(order / bit) % 2 === 1;
}

/** Stamp a whole number with its left edge at x. */
/** @warp */
function num(n: number, x: number, y: number, size: number) {
  const s = String(Math.round(n));
  me.size = size;
  for (let i = 0; i < s.length; i++) {
    switchCostume(("d" + s[i]) as CostumeName);
    goTo(x + (i * 20 * size) / 100, y);
    stamp();
  }
}

/** @warp */
function icon(c: CostumeName, x: number, y: number, size: number) {
  me.size = size;
  switchCostume(c);
  goTo(x, y);
  stamp();
}

/** @warp */
function stationBar(i: number, state: number, p: number) {
  if (state === 1) Draw.bar(STATION_X[i] - 30, -26, 60, 7, p, "#FFAB19", "#3B2414");
  if (state === 2) Draw.bar(STATION_X[i] - 30, -26, 60, 7, p, p < 0.35 ? "#FF4D4D" : "#59C059", "#3B2414");
}

/** @warp */
function drawOrder(i: number) {
  const o = seatOrder[i];
  const x = SEAT_X[i];
  icon("bubble", x, 118, 100);
  let k = 0;
  if (has(o, 1)) k++;
  if (has(o, 2)) k++;
  if (has(o, 4)) k++;
  if (has(o, 8)) k++;
  let ix = x - ((k - 1) * 26) / 2;
  if (has(o, 1)) {
    icon("i_burger", ix, 128, 62);
    ix += 26;
  }
  if (has(o, 2)) {
    icon("i_fries", ix, 128, 62);
    ix += 26;
  }
  if (has(o, 4)) {
    icon("i_drink", ix, 128, 62);
    ix += 26;
  }
  if (has(o, 8)) icon("i_shake", ix, 128, 62);
  const pt = seatPatience[i];
  Draw.bar(x - 44, 104, 88, 6, pt, pt < 0.3 ? "#FF4D4D" : pt < 0.6 ? "#FFAB19" : "#59C059", "#DDDDDD");
}

/** @warp */
function drawDay() {
  // money
  const pop = game.bounce * 6;
  icon("dollar", -224, 162, 100 + pop);
  num(game.money, -204, 162, 100 + pop);
  // stars
  for (let i = 0; i < 5; i++) icon(i < game.stars ? "star" : "star_off", -84 + i * 24, 162, 100);
  // clock
  Draw.bar(34, 162, 76, 10, game.dayLeft / DAY_LENGTH, game.dayLeft < 10 ? "#FF4D4D" : "#FFD500", "#6B5444");
  num(game.day, 166, 162, 100);
  // seats
  for (let i = 0; i < 4; i++) {
    if (i >= game.seats) icon("lock", SEAT_X[i], 48, 100);
    if (seatState[i] === 2) drawOrder(i);
  }
  stationBar(0, game.sGrill, game.pGrill);
  stationBar(1, game.sFryer, game.pFryer);
  stationBar(2, game.sSoda, game.pSoda);
  if (game.shakeOn === 1) stationBar(3, game.sShake, game.pShake);
  // tray
  let tx = -45;
  if (game.trayB === 1) {
    icon("i_burger", tx, -165, 62);
    tx += 30;
  }
  if (game.trayF === 1) {
    icon("i_fries", tx, -165, 62);
    tx += 30;
  }
  if (game.trayD === 1) {
    icon("i_drink", tx, -165, 62);
    tx += 30;
  }
  if (game.trayS === 1) icon("i_shake", tx, -165, 62);
}

/** @warp */
function drawShop() {
  num(game.served, -100, 52, 90);
  num(game.earned, -40, 22, 90);
  num(game.missed, 100, 52, 90);
  icon("dollar", 72, 22, 90);
  num(game.money, 90, 22, 90);
  for (let i = 0; i < 5; i++) {
    const p = prices[i];
    const x = -164 + i * 82;
    if (p < 0) {
      icon("max", x, -86, 80);
    } else {
      icon("dollar", x - 22, -86, 75);
      num(p, x - 8, -86, 75);
    }
  }
}

/** @warp */
function drawEnd() {
  num(game.day, 60, -30, 100);
  icon("dollar", 60, -64, 100);
  num(game.money, 80, -64, 100);
}

whenFlag(() => {
  me.visible = false;
  penClear();
  forever(() => {
    penClear();
    if (game.phase === "day") drawDay();
    if (game.phase === "shop") drawShop();
    if (game.phase === "over" || game.phase === "win") drawEnd();
    if (game.bounce > 0) game.bounce--;
  });
});
