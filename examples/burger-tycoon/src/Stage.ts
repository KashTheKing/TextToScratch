// Burger Tycoon: cook, serve, earn, upgrade. Shared state lives here.
export const game = {
  phase: "title", // title | day | shop | over | win
  money: 0,
  day: 1,
  stars: 5,
  dayLeft: 0,
  served: 0,
  missed: 0,
  earned: 0,
  grillLvl: 0,
  seats: 2,
  chef: 0,
  decor: 0,
  shakeOn: 0,
  trayB: 0,
  trayF: 0,
  trayD: 0,
  trayS: 0,
  happy: 0, // happy guests in a row (3 earns back a star)
  sGrill: 0,
  pGrill: 0,
  sFryer: 0,
  pFryer: 0,
  sSoda: 0,
  pSoda: 0,
  sShake: 0,
  pShake: 0,
  bounce: 0, // HUD money "pop" animation
  coinX: 0,
  coinY: 0,
};

export const DAY_LENGTH = 60;
export const GOAL = 800;
export const SEAT_X: number[] = [-165, -55, 55, 165];
// Per seat: 0 free, 1 walking in, 2 waiting for food, 3 leaving.
export const seatState: number[] = [0, 0, 0, 0];
// Order as a sum of bits: 1 burger, 2 fries, 4 drink, 8 shake.
export const seatOrder: number[] = [0, 0, 0, 0];
export const seatPatience: number[] = [0, 0, 0, 0];
// Shop prices for the 5 upgrades (-1 = maxed out), kept up to date by ShopButton.
export const prices: number[] = [0, 0, 0, 0, 0];

whenFlag(() => {
  stopAllSounds();
  switchBackdrop("diner");
  game.phase = "title";
});

onMessage("new game", () => {
  game.money = 0;
  game.day = 1;
  game.stars = 5;
  game.grillLvl = 0;
  game.seats = 2;
  game.chef = 0;
  game.decor = 0;
  game.shakeOn = 0;
  game.happy = 0;
  game.phase = "day"; // set before broadcasting so every station loop sees it
  broadcast("day start");
});

onMessage("day start", () => {
  switchBackdrop("diner");
  for (let i = 0; i < 4; i++) {
    seatState[i] = 0;
    seatOrder[i] = 0;
  }
  game.trayB = 0;
  game.trayF = 0;
  game.trayD = 0;
  game.trayS = 0;
  game.served = 0;
  game.missed = 0;
  game.earned = 0;
  game.dayLeft = DAY_LENGTH;
  game.phase = "day";
  playSound("daystart");
  resetTimer();
  while (game.phase === "day" && game.dayLeft > 0) {
    game.dayLeft = DAY_LENGTH - timer();
  }
  game.dayLeft = 0;
  // Kitchen closes: wait for the last guests to leave.
  waitUntil(() => game.phase !== "day" || seatsEmpty());
  if (game.phase === "day") endDay();
});

function seatsEmpty(): boolean {
  return seatState[0] === 0 && seatState[1] === 0 && seatState[2] === 0 && seatState[3] === 0;
}

function endDay() {
  if (game.money >= GOAL) {
    game.phase = "win";
    switchBackdrop("win");
    stopAllSounds();
    playSound("win");
  } else {
    game.phase = "shop";
    switchBackdrop("summary");
    stopAllSounds();
    playSound("dayover");
  }
  broadcast("day over");
}

onMessage("lost", () => {
  if (game.phase === "day") {
    game.phase = "over";
    switchBackdrop("closed");
    stopAllSounds();
    playSound("gameover");
    broadcast("day over");
  }
});

// Background music while the diner is open.
onMessage("day start", () => {
  while (game.phase === "day") playSoundUntilDone("music");
});

whenClicked(() => {
  if (game.phase === "over" || game.phase === "win") {
    game.phase = "title";
    broadcast("new game");
  }
});
