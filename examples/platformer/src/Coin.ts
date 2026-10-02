import { game } from "./Stage";

// Coin positions (lists).
const coinX = [-70, 55, 140, -10, 190];
const coinY = [-35, 25, -115, -80, 100];

// The original coin is invisible and stamps out clones at each position.
whenFlag(() => {
  me.visible = false;
  for (let i = 0; i < coinX.length; i++) {
    goTo(coinX[i], coinY[i]);
    createClone();
  }
});

onClone(() => {
  me.visible = true;
  waitUntil(() => touching("Player"));
  game.coins++;
  repeat(5, () => {
    me.y += 4;
    changeEffect("ghost", 20);
  });
  deleteClone();
});
