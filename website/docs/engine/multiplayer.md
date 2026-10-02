---
title: Multiplayer
---

# Online multiplayer

`import * as Net from "tts/net"`

Real-time multiplayer for up to **6 players**, plus a short text message channel, built on Scratch **cloud variables**.

![Two clients: each sees the other player, and client B shows the wave sent by client A](/img/engine/multiplayer.png)

```ts title="Me.ts"
import * as Net from "tts/net";
import * as Input from "tts/input";

whenFlag(() => {
  Net.join();                                   // claims a free slot (takes ~2 s)
  forever(() => {
    me.x += Input.axisX() * 5;
    me.y += Input.axisY() * 5;
    Net.sendState(me.x, me.y, 0, 0);            // four numbers per player
    const got = Net.pollMessage();
    if (got) say(Net.message);
  });
});
```

```ts title="Others.ts"
import * as Net from "tts/net";
let slot = 0;

whenFlag(() => {
  for (let i = 1; i <= Net.SLOTS; i++) { slot = i; createClone(); }
});

onClone(() => {
  forever(() => {
    const active = Net.readPlayer(slot);
    if (active && slot !== Net.session.slot) {
      me.visible = true;
      glide(0.1, Net.pa, Net.pb);               // smooth out the ~10 updates per second
    } else {
      me.visible = false;
    }
  });
});
```

The full demo is `examples/multiplayer`.

## API

| | |
|---|---|
| `join()` | watch the slots for 2 seconds, then claim a free one; sets `session.slot` (0 if full) |
| `session.slot` | this player's slot, 1–6, shared by all your sprites |
| `sendState(a, b, c, d)` | publish four whole numbers from -4999 to 4999 (position, direction, score...); throttled to 10 per second |
| `readPlayer(slot)` | read a player into `pa`, `pb`, `pc`, `pd`; true if they updated in the last 3 seconds |
| `sendMessage(text)` | send a short message (about 100 characters) to everyone |
| `pollMessage()` | true when someone else sent a new message; read `message` and `messageFrom` |
| `encode(text)` / `decode(digits)` | the text ⇄ digits encoding used for cloud variables |
| `SLOTS` | 6 |

## Where it works

- **scratch.mit.edu:** the project must be *shared*, and players must be logged in with the *Scratcher* status (not "New Scratcher").
  Scratch allows about 10 cloud updates per second per player; `sendState` stays under that.
- **TurboWarp:** works for everyone on the same project, with no account needed.
- In the editor, cloud variables behave like normal variables, so you can test the single-player parts.

## How it works

The module declares 7 cloud variables (`☁ p1`–`☁ p6` and `☁ msg`). Scratch allows 10 per project, which leaves 3 for you.
Each player writes only their own slot: a heartbeat plus four numbers, packed as digits. A player counts as active
while their heartbeat keeps changing. Text is encoded as two digits per character (lower case, digits and common punctuation).

### Your own cloud variables

Mark an exported state object with `@cloud`:

```ts
/** @cloud */
export const highscores = { best: 0 };
```

Cloud variables hold numbers only, and each update is visible to every player of the shared project.
