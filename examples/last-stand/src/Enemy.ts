// Enemy spawner (original) + enemies (clones): slimes, fast robots and big brutes.
import { game } from "./Stage";

let isClone = false;
let kind = 0; // 0 slime, 1 robot, 2 brute
let hp = 1;
let speed = 1;
let points = 10;
let hitCool = 0;

whenFlag(() => {
  isClone = false;
  me.visible = false;
});

function spawnOne() {
  const side = random(1, 4);
  if (side === 1) goTo(-240, random(-170, 170));
  if (side === 2) goTo(240, random(-170, 170));
  if (side === 3) goTo(random(-230, 230), 180);
  if (side === 4) goTo(random(-230, 230), -180);
  kind = 0;
  const roll = random(1, 100);
  if (game.wave >= 2 && roll < 15 + game.wave * 3) kind = 1;
  if (game.wave >= 4 && roll > 100 - game.wave * 2) kind = 2;
  game.alive++;
  createClone();
}

onMessage("wave start", () => {
  if (isClone) return;
  game.toSpawn = 4 + game.wave * 3;
  wait(1.2);
  while (game.toSpawn > 0 && game.playing) {
    spawnOne();
    game.toSpawn--;
    wait(Math.max(0.25, 1.1 - game.wave * 0.08));
  }
});

onClone(() => {
  isClone = true;
  me.rotationStyle = "don't rotate";
  const bonus = Math.floor(game.wave / 2);
  if (kind === 0) {
    hp = 2 + bonus;
    speed = 1.3 + game.wave * 0.06;
    points = 10;
  }
  if (kind === 1) {
    hp = 1 + bonus;
    speed = 2.4 + game.wave * 0.06;
    points = 15;
  }
  if (kind === 2) {
    hp = 10 + bonus * 3;
    speed = 0.8 + game.wave * 0.03;
    points = 50;
  }
  hitCool = 0;
  me.size = 100;
  me.visible = true;
  while (hp > 0 && game.playing) {
    if (!game.choosing) {
      pointTowards("Hero");
      turnRight(random(-25, 25));
      move(speed);
    }
    // two-frame wobble animation
    const frame = Math.floor(timer() * 4) % 2;
    if (kind === 0) switchCostume(frame === 0 ? "slime1" : "slime2");
    if (kind === 1) switchCostume(frame === 0 ? "robot1" : "robot2");
    if (kind === 2) switchCostume(frame === 0 ? "brute1" : "brute2");
    if (hitCool > 0) {
      hitCool--;
      if (hitCool === 0) setEffect("brightness", 0);
    } else if (touching("Bullet")) {
      hp -= game.damage;
      hitCool = 2;
      setEffect("brightness", 60);
      playSound("hit");
    }
  }
  if (game.playing) {
    game.score += points;
    game.dropX = me.x;
    game.dropY = me.y;
    if (random(1, 100) <= (kind === 2 ? 100 : 9)) broadcast("drop");
    game.alive--;
    setEffect("brightness", 0);
    switchCostume("pop");
    playSound("pop");
    repeat(6, () => {
      me.size += 12;
      changeEffect("ghost", 16);
    });
  }
  deleteClone();
});
