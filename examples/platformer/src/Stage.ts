// Global state shared by every sprite.
export const game = { coins: 0, won: false };

whenFlag(() => {
  switchBackdrop("sky");
  game.coins = 0;
  game.won = false;
  showVariable(game.coins);
});

onMessage("win", () => {
  game.won = true;
  switchBackdrop("win");
});
