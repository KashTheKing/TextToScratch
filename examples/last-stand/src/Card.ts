// Upgrade cards: three clones with different upgrades; click one to pick it.
import { game } from "./Stage";

const UPGRADES: string[] = ["damage", "firerate", "maxhp", "speed", "multishot", "heal"];
let isClone = false;

whenFlag(() => {
  isClone = false;
  me.visible = false;
});

function deal(x: number, index: number) {
  goTo(x, -20);
  switchCostume(UPGRADES[index - 1] as any);
  createClone();
}

onMessage("choose", () => {
  if (isClone) return;
  const a = random(1, 6);
  let b = random(1, 6);
  while (b === a) b = random(1, 6);
  let c = random(1, 6);
  while (c === a || c === b) c = random(1, 6);
  playSound("appear");
  deal(-150, a);
  deal(0, b);
  deal(150, c);
});

onClone(() => {
  isClone = true;
  me.size = 20;
  me.visible = true;
  goToFront();
  repeat(8, () => {
    me.size += 10;
  });
  while (game.choosing && game.playing) {
    me.size = touching("mouse") ? 110 : 100;
  }
  deleteClone();
});

whenClicked(() => {
  if (!isClone || !game.choosing) return;
  game.picked = me.costumeName;
  if (game.picked === "damage") game.damage++;
  if (game.picked === "firerate") game.fireDelay = game.fireDelay * 0.8;
  if (game.picked === "maxhp") {
    game.maxHp++;
    game.hp++;
  }
  if (game.picked === "speed") game.speed = game.speed * 1.15;
  if (game.picked === "multishot") game.shots++;
  if (game.picked === "heal") game.hp = game.maxHp;
  playSound("choose");
  game.choosing = false;
});
