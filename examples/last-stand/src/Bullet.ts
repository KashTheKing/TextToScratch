// The original Bullet is the gun: while the mouse is held it fires clones toward the mouse.
import { game } from "./Stage";

let isClone = false;

whenFlag(() => {
  isClone = false;
  me.visible = false;
});

onMessage("start", () => {
  if (isClone) return;
  let next = 0;
  while (game.playing) {
    if (mouseDown() && !game.choosing && timer() > next) {
      goToTarget("Hero");
      pointTowards("mouse");
      const aim = me.direction;
      let n = game.shots;
      if (timer() < game.spreadUntil) n += 2;
      // fan the shots 12 degrees apart around the aim direction
      for (let i = 0; i < n; i++) {
        pointInDirection(aim + (i - (n - 1) / 2) * 12);
        createClone();
      }
      playSound("shoot");
      next = timer() + (timer() < game.rapidUntil ? game.fireDelay / 2.5 : game.fireDelay);
    }
  }
});

onClone(() => {
  isClone = true;
  move(22);
  me.visible = true;
  let alive = true;
  while (alive && game.playing) {
    move(12);
    if (touching("edge")) alive = false;
    // on a hit, stay one more frame so the enemy is sure to see it
    if (touching("Enemy")) alive = false;
  }
  deleteClone();
});
