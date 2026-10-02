// Menu, win and lose cards.
import { game, myShots, enemyShots, fx, botKills, remoteKills } from "./Stage";

/** Called by Title right before broadcasting "start", so every start script sees a fresh round. */
function newRound() {
  game.kills = 0;
  game.rival = 0;
  for (let i = 0; i < 3; i++) botKills[i] = 0;
  for (let i = 0; i < 6; i++) remoteKills[i] = 0;
  myShots.length = 0;
  enemyShots.length = 0;
  fx.length = 0;
  game.playing = true;
}


function waitForClick() {
  waitUntil(() => !mouseDown());
  waitUntil(() => mouseDown());
  waitUntil(() => !mouseDown());
  playSound("click");
}

whenFlag(() => {
  goTo(0, 0);
  switchCostume("menu");
  me.visible = true;
  goToFront();
  think("Connecting...");
  waitUntil(() => game.joined);
  think("");
  waitForClick();
  me.visible = false;
  newRound(); // before the broadcast, so every "start" script sees a fresh round
  broadcast("start");
});

onMessage("round over", () => {
  wait(0.8);
  switchCostume(game.won ? "win" : "lose");
  me.visible = true;
  goToFront();
  playSound(game.won ? "win" : "lose");
  waitForClick();
  me.visible = false;
  newRound(); // before the broadcast, so every "start" script sees a fresh round
  broadcast("start");
});
