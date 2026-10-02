// Last Stand: survive escalating waves of slimes and robots. Pick an upgrade between waves.
export const game = {
  playing: false,
  choosing: false,
  score: 0,
  best: 0,
  wave: 0,
  hp: 5,
  maxHp: 5,
  // enemy bookkeeping
  toSpawn: 0,
  alive: 0,
  // hero stats (upgrades change these)
  damage: 1,
  fireDelay: 0.3,
  speed: 4,
  shots: 1,
  // power-up expiry times (timer seconds)
  rapidUntil: 0,
  spreadUntil: 0,
  // last enemy death spot, for drops
  dropX: 0,
  dropY: 0,
  // upgrade picked from a card (costume name)
  picked: "",
};

whenFlag(() => {
  switchBackdrop("arena");
  game.playing = false;
  hideVariable(game.score);
  hideVariable(game.best);
  hideVariable(game.wave);
});

whenFlag(() => {
  forever(() => {
    playSoundUntilDone("music");
  });
});

onMessage("new game", () => {
  switchBackdrop("arena");
  resetTimer();
  game.score = 0;
  game.wave = 0;
  game.maxHp = 5;
  game.hp = 5;
  game.damage = 1;
  game.fireDelay = 0.3;
  game.speed = 4;
  game.shots = 1;
  game.rapidUntil = 0;
  game.spreadUntil = 0;
  game.alive = 0;
  game.toSpawn = 0;
  game.choosing = false;
  game.playing = true;
  broadcast("start");
  showVariable(game.score);
  showVariable(game.best);
  showVariable(game.wave);
  while (game.playing) {
    game.wave++;
    broadcast("wave start");
    wait(0.5);
    waitUntil(() => !game.playing || (game.toSpawn < 1 && game.alive < 1));
    if (game.playing) {
      wait(0.6);
      game.choosing = true;
      broadcast("choose");
      waitUntil(() => !game.playing || !game.choosing);
    }
  }
});

let clicked = false;

whenClicked(() => {
  clicked = true;
});

onMessage("game over", () => {
  if (game.score > game.best) game.best = game.score;
  playSound("gameover");
  wait(0.8);
  switchBackdrop("gameover");
  wait(1);
  clicked = false;
  waitUntil(() => clicked || mouseDown() || keyPressed("space"));
  waitUntil(() => !mouseDown());
  broadcast("new game");
});
