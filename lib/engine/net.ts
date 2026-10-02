// tts/net: online multiplayer over Scratch cloud variables (up to 6 players, plus a quick-chat channel).
// Scratch does not allow free-text chat, so messages are picked from the fixed QUICK_CHAT list.
//
// Cloud variables only sync on scratch.mit.edu for logged-in Scratchers in a shared project, and on
// TurboWarp. Each update is limited to ~10 per second, so sendState() throttles itself.
//
//   whenFlag(() => {
//     Net.join();                                  // claims a free player slot (takes ~2 seconds)
//     forever(() => {
//       Net.sendState(me.x, me.y, me.direction, 0);
//       for (let i = 1; i <= Net.SLOTS; i++) {
//         const active = Net.readPlayer(i);
//         if (active && i !== Net.session.slot) { ... use Net.pa, Net.pb ... }
//       }
//     });
//   });

/** @cloud */
export const cloud = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, msg: 0 };

export const SLOTS = 6;
/** Quick-chat phrases: sendMessage(i) sends QUICK_CHAT[i]. Edit freely, but keep them friendly (Scratch community guidelines). */
export const QUICK_CHAT: string[] = ["Hi!", "Good game!", "Follow me!", "Nice!", "Oops!", "Bye!"];

/** This client's player slot (1..6) in session.slot, or 0 before join() / if the game is full. Shared by all sprites. */
export const session = { slot: 0 };
/** Values from the last readPlayer(). */
export let pa = 0;
export let pb = 0;
export let pc = 0;
export let pd = 0;
/** Last message received by pollMessage(). */
export let message = "";
export let messageFrom = 0;

let beat = 0;
let lastSend = 0;
let msgSeq = 0;
let lastMsg = "";
const lastValue: string[] = ["", "", "", "", "", ""];
const lastChange: number[] = [0, 0, 0, 0, 0, 0];

/** @warp */
export function slotValue(slot: number): string {
  if (slot === 1) return String(cloud.p1);
  if (slot === 2) return String(cloud.p2);
  if (slot === 3) return String(cloud.p3);
  if (slot === 4) return String(cloud.p4);
  if (slot === 5) return String(cloud.p5);
  return String(cloud.p6);
}

// Cloud values are long digit strings; storing them as text keeps every digit (a JS number would round).
/** @warp */
function setSlot(slot: number, value: string) {
  const v = value as unknown as number;
  if (slot === 1) cloud.p1 = v;
  if (slot === 2) cloud.p2 = v;
  if (slot === 3) cloud.p3 = v;
  if (slot === 4) cloud.p4 = v;
  if (slot === 5) cloud.p5 = v;
  if (slot === 6) cloud.p6 = v;
}

/** Left-pad a number with zeros. */
/** @warp */
export function pad(n: number, width: number): string {
  let s = String(n);
  while (s.length < width) s = "0" + s;
  return s;
}

/** Characters [start, start + length) of a string. */
/** @warp */
export function slice(text: string, start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length && i < text.length; i++) out = out + text[i];
  return out;
}


/** @warp */
function snapshotSlots() {
  for (let i = 1; i <= SLOTS; i++) lastValue[i - 1] = slotValue(i);
}

/** Lowest slot whose value hasn't changed since snapshotSlots(), or 0. */
/** @warp */
function freeSlot(): number {
  let free = 0;
  for (let i = SLOTS; i >= 1; i--) {
    const v = slotValue(i);
    if (v === lastValue[i - 1]) free = i;
  }
  return free;
}

/** Watch the slots for 2 seconds, then claim one that nobody is updating. */
export function join() {
  session.slot = 0;
  snapshotSlots();
  wait(2);
  const free = freeSlot();
  if (free > 0) {
    beat = random(10, 99);
    // claim it right away with a neutral state (all four values 0) so nobody else takes it
    setSlot(free, "1" + String(beat) + "5000500050005000");
  }
  session.slot = free; // set once, so other sprites never see a half-chosen slot
}

/** Publish four numbers (each -4999..4999) for this player, at most 10 times per second. */
/** @warp */
export function sendState(a: number, b: number, c: number, d: number) {
  if (session.slot === 0 || timer() - lastSend < 0.1) return;
  lastSend = timer();
  beat = beat + 1;
  if (beat > 99) beat = 10;
  const sa = pad(Math.round(Math.max(-4999, Math.min(4999, a))) + 5000, 4);
  const sb = pad(Math.round(Math.max(-4999, Math.min(4999, b))) + 5000, 4);
  const sc = pad(Math.round(Math.max(-4999, Math.min(4999, c))) + 5000, 4);
  const sd = pad(Math.round(Math.max(-4999, Math.min(4999, d))) + 5000, 4);
  setSlot(session.slot, "1" + String(beat) + sa + sb + sc + sd);
}

/** Read a player slot into pa..pd. Returns true if that player updated within the last 3 seconds. */
/** @warp */
export function readPlayer(slot: number): boolean {
  const v = slotValue(slot);
  if (v !== lastValue[slot - 1]) {
    lastValue[slot - 1] = v;
    lastChange[slot - 1] = timer();
  }
  if (v.length < 19) return false;
  pa = Number(slice(v, 3, 4)) - 5000;
  pb = Number(slice(v, 7, 4)) - 5000;
  pc = Number(slice(v, 11, 4)) - 5000;
  pd = Number(slice(v, 15, 4)) - 5000;
  return slot === session.slot || timer() - lastChange[slot - 1] < 3;
}

/** Send QUICK_CHAT[phrase] to everyone. */
/** @warp */
export function sendMessage(phrase: number) {
  msgSeq = msgSeq + 1;
  if (msgSeq > 9) msgSeq = 1;
  cloud.msg = ("1" + String(session.slot) + String(msgSeq) + pad(phrase, 2)) as unknown as number;
}

/** True when a new message arrived (from someone else); read Net.message (the phrase text) and Net.messageFrom. */
/** @warp */
export function pollMessage(): boolean {
  const v = String(cloud.msg);
  if (v === lastMsg || v.length < 5) return false;
  lastMsg = v;
  messageFrom = Number(v[1]);
  if (messageFrom === session.slot) return false;
  const phrase = Number(slice(v, 3, 2));
  message = phrase >= 0 && phrase < QUICK_CHAT.length ? QUICK_CHAT[phrase] : "";
  return true;
}
