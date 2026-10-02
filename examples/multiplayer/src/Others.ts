// Everyone else: one clone per player slot, shown while that player is active.
import * as Net from "tts/net";

let slot = 0;

whenFlag(() => {
  me.visible = false;
  for (let i = 1; i <= Net.SLOTS; i++) {
    slot = i;
    createClone();
  }
});

onClone(() => {
  setEffect("color", slot * 25);
  forever(() => {
    const active = Net.readPlayer(slot);
    if (active && slot !== Net.session.slot) {
      me.visible = true;
      glide(0.1, Net.pa, Net.pb); // smooth out the ~10 updates/second
    } else {
      me.visible = false;
    }
  });
});
