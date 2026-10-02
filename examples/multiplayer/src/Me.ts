// This client's player: joins a slot, moves around and publishes its position.
import * as Net from "tts/net";
import * as Input from "tts/input";

const SPEED = 5;

whenFlag(() => {
  me.visible = false;
  say("Joining...");
  Net.join();
  if (Net.session.slot === 0) {
    say("The game is full (6 players)");
    stopThis();
  }
  goTo(random(-180, 180), random(-120, 120));
  me.visible = true;
  sayFor(`You are player ${Net.session.slot}`, 2);
  forever(() => {
    me.x += Input.axisX() * SPEED;
    me.y += Input.axisY() * SPEED;
    me.x = Math.max(-220, Math.min(220, me.x));
    me.y = Math.max(-160, Math.min(160, me.y));
    Net.sendState(me.x, me.y, 0, 0);
    const wave = Input.pressedOnce("m");
    if (wave) Net.sendMessage(`player ${Net.session.slot} says hi!`);
    const got = Net.pollMessage();
    if (got) say(Net.message);
  });
});
