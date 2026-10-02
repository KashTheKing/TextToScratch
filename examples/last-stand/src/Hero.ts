// The hero: WASD to move, aims at the mouse. Bullet.ts does the shooting.
import { game } from "./Stage";
import * as M from "tts/math";

let hurtUntil = 0;

whenFlag(() => {
  me.visible = false;
});

onMessage("start", () => {
  goTo(0, 0);
  me.size = 100;
  me.rotationStyle = "all around";
  switchCostume("hero");
  clearEffects();
  hurtUntil = 0;
  me.visible = true;
  while (game.playing) {
    let dx = 0;
    let dy = 0;
    if (keyPressed("a") || keyPressed("left arrow")) dx -= 1;
    if (keyPressed("d") || keyPressed("right arrow")) dx += 1;
    if (keyPressed("w") || keyPressed("up arrow")) dy += 1;
    if (keyPressed("s") || keyPressed("down arrow")) dy -= 1;
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }
    if (!game.choosing) {
      me.x = M.clamp(me.x + dx * game.speed, -222, 222);
      me.y = M.clamp(me.y + dy * game.speed, -140, 160);
    }
    pointTowards("mouse");
    if (timer() > hurtUntil) {
      switchCostume("hero");
      setEffect("ghost", 0);
      if (touching("Enemy")) {
        game.hp--;
        hurtUntil = timer() + 1;
        switchCostume("hurt");
        setEffect("ghost", 40);
        playSound("hurt");
        if (game.hp < 1) {
          game.playing = false;
          broadcast("game over");
        }
      }
    }
  }
});

onMessage("game over", () => {
  repeat(10, () => {
    me.size -= 8;
    turnRight(36);
  });
  me.visible = false;
  me.size = 100;
});
