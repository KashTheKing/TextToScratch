// Global game state: every sprite can read and change these.
export const game = { score: 0, lives: 3, playing: false };

whenFlag(() => {
  switchBackdrop("sky");
  game.score = 0;
  game.lives = 3;
  game.playing = true;
  showVariable(game.score);
  showVariable(game.lives);
});

onMessage("game over", () => {
  game.playing = false;
  switchBackdrop("gameover");
  stopOthers();
});
