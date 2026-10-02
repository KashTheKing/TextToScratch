// Shots from other players and bots. These are the ones that can hurt us.
import { game, enemyShots, fx, CRATE } from "./Stage";

let life = 0;
let owner = 0;

/** @warp */
function spawnQueued() {
  while (enemyShots.length >= 4) {
    goTo(enemyShots[0], enemyShots[1]);
    me.direction = enemyShots[2];
    owner = enemyShots[3];
    enemyShots.shift();
    enemyShots.shift();
    enemyShots.shift();
    enemyShots.shift();
    createClone();
  }
}

whenFlag(() => {
  me.visible = false;
  forever(() => spawnQueued());
});

onClone(() => {
  me.visible = true;
  life = 30;
  while (life > 0) {
    move(owner > 10 ? 7 : 11);
    life--;
    if (game.alive && touching("Me")) {
      if (timer() > game.shield) {
        game.hp--;
        game.lastHit = owner;
      }
      life = 0;
    } else if (touchingColor(CRATE) || Math.abs(me.x) > 236 || Math.abs(me.y) > 176) {
      fx.push(me.x);
      fx.push(me.y);
      fx.push(4);
      life = 0;
    }
  }
  deleteClone();
});

onMessage("round over", () => {
  deleteClone();
});
