// Our own shots. They damage bots here; other players work out their own hits on their side.
import { myShots, fx, CRATE } from "./Stage";

let life = 0;

/** @warp */
function spawnQueued() {
  while (myShots.length >= 4) {
    goTo(myShots[0], myShots[1]);
    me.direction = myShots[2];
    myShots.shift();
    myShots.shift();
    myShots.shift();
    myShots.shift();
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
    move(11);
    life--;
    if (touching("Bot") || touching("Others")) {
      playSound("plink");
      wait(0); // stay one more frame so the bot sees the hit
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
