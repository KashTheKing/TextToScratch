// Everyone else online: one clone per player slot. Shows their robot, replays their shots and
// watches their death counter to credit our kills.
import * as Net from "tts/net";
import { game, enemyShots, fx, remote, remoteKills } from "./Stage";

let slot = 0;
let seen = false;
let lastShot = 0;
let lastDeaths = 0;
let base = 0;
let kills = 0;
let chatSeen = 0;
let chatUntil = 0;

whenFlag(() => {
  me.visible = false;
  for (let i = 1; i <= Net.SLOTS; i++) {
    slot = i;
    createClone();
  }
});

onClone(() => {
  me.rotationStyle = "all around";
  setEffect("color", (slot - 1) * 30);
  chatSeen = game.chatSeq;
  forever(() => {
    let active = false;
    if (Net.session.slot > 0 && slot !== Net.session.slot) active = Net.readPlayer(slot);
    remote[slot - 1] = active ? 1 : 0;
    if (active) {
      const shotN = Math.floor(Net.pc / 400);
      const deathN = Math.floor(Net.pd / 10) % 10;
      kills = Math.floor(Net.pd / 100);
      if (!seen) {
        seen = true;
        lastShot = shotN;
        lastDeaths = deathN;
        base = game.playing ? 0 : kills;
        goTo(Net.pa, Net.pb);
      }
      if (kills < base) base = 0;
      remoteKills[slot - 1] = game.playing ? kills - base : 0;
      if (Net.pa > 3000) {
        me.visible = false;
      } else {
        me.visible = true;
        me.x += (Net.pa - me.x) * 0.45;
        me.y += (Net.pb - me.y) * 0.45;
        me.direction = (Net.pc % 400) - 180;
        let n = (shotN - lastShot + 10) % 10;
        while (n > 0 && game.playing) {
          enemyShots.push(me.x + 26 * sin(me.direction));
          enemyShots.push(me.y + 26 * cos(me.direction));
          enemyShots.push(me.direction);
          enemyShots.push(slot);
          playSound("pew");
          n--;
        }
      }
      lastShot = shotN;
      if (deathN !== lastDeaths) {
        lastDeaths = deathN;
        fx.push(me.x);
        fx.push(me.y);
        fx.push(18);
        playSound("boom");
        if (Net.pd % 10 === Net.session.slot && game.playing) {
          game.kills++;
          broadcast("kill");
        }
      }
      if (game.chatSeq !== chatSeen) {
        chatSeen = game.chatSeq;
        if (game.chatFrom === slot) {
          say(game.chatText);
          chatUntil = timer() + 2.5;
          playSound("blip");
        }
      }
      if (chatUntil > 0 && timer() > chatUntil) {
        say("");
        chatUntil = 0;
      }
    } else {
      seen = false;
      remoteKills[slot - 1] = 0;
      me.visible = false;
    }
  });
});

onMessage("start", () => {
  base = kills; // count kills from this round only
});
