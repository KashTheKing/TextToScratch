// Drops from defeated enemies: health, rapid fire, spread shot.
import { game } from "./Stage";

let isClone = false;

whenFlag(() => {
  isClone = false;
  me.visible = false;
});

onMessage("drop", () => {
  if (isClone) return;
  goTo(game.dropX, game.dropY);
  const r = random(1, 3);
  if (r === 1) switchCostume("health");
  if (r === 2) switchCostume("rapid");
  if (r === 3) switchCostume("spread");
  createClone();
});

onClone(() => {
  isClone = true;
  me.visible = true;
  playSound("drop");
  const until = timer() + 8;
  let taken = false;
  while (!taken && game.playing && timer() < until) {
    me.size = 100 + 10 * sin(timer() * 400);
    if (until - timer() < 2) setEffect("ghost", Math.floor(timer() * 6) % 2 === 0 ? 70 : 0);
    if (touching("Hero")) taken = true;
  }
  if (taken) {
    if (me.costumeName === "health") game.hp = Math.min(game.maxHp, game.hp + 2);
    if (me.costumeName === "rapid") game.rapidUntil = timer() + 6;
    if (me.costumeName === "spread") game.spreadUntil = timer() + 6;
    game.score += 5;
    me.visible = false;
    playSoundUntilDone("powerup");
  }
  deleteClone();
});
