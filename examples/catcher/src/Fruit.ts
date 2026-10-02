import { game } from "./Stage";

let fallSpeed = 0;

/** Pick a random fruit (or a bomb) and start at the top. */
function spawn(level: number) {
  switchCostume(random(1, 3));
  goTo(random(-200, 200), 190);
  fallSpeed = 3 + level / 5;
}

function caught(): boolean {
  return touching("Basket") && me.y < -100;
}

// The original sprite is a hidden spawner; clones do the falling.
whenFlag(() => {
  me.visible = false;
  wait(1);
  while (game.playing) {
    createClone();
    wait(Math.max(0.3, 1.2 - game.score / 50));
  }
});

onClone(() => {
  spawn(game.score);
  me.visible = true;
  while (me.y > -170) {
    me.y -= fallSpeed;
    const hit = caught();
    if (hit) {
      if (me.costumeName === "bomb") {
        game.lives = 0;
        broadcast("game over");
      } else {
        game.score++;
        changeEffect("brightness", 20);
      }
      deleteClone();
    }
  }
  if (me.costumeName !== "bomb") game.lives--;
  if (game.lives < 1) broadcast("game over");
  deleteClone();
});

onMessage("game over", () => {
  deleteClone(); // clears falling clones; does nothing on the original
});
