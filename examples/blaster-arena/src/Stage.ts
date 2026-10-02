// Blaster Arena: online multiplayer top-down shooter (tts/net), with practice bots when you're alone.
export const game = {
  playing: false,
  joined: false,
  won: false,
  alive: false,
  alone: true,
  hp: 5,
  shield: 0, // timer() until which Me can't be hurt
  lastHit: 0, // who hit Me last: 1-6 = player slot, 11-13 = bot
  px: 0, // Me's position, for the bots
  py: 0,
  kills: 0,
  rival: 0,
  chatSeq: 0,
  chatFrom: 0,
  chatText: "",
};
/** Spawn queues: x, y, direction, owner (4 numbers per shot). */
export const myShots: number[] = [];
export const enemyShots: number[] = [];
/** Particle bursts: x, y, count. */
export const fx: number[] = [];
/** Per slot: 1 if that remote player is online. */
export const remote: number[] = [0, 0, 0, 0, 0, 0];
/** Per slot: remote player's kills this round. */
export const remoteKills: number[] = [0, 0, 0, 0, 0, 0];
export const botKills: number[] = [0, 0, 0];
export const CRATE = "#8B5A2B";

whenFlag(() => {
  switchBackdrop("arena");
  game.playing = false;
  game.joined = false;
  hideVariable(game.kills);
  hideVariable(game.rival);
  stopAllSounds();
});

onMessage("start", () => {
  showVariable(game.kills);
  showVariable(game.rival);
  playSound("start");
  me.volume = 50;
  while (game.playing) playSoundUntilDone("music");
});

onMessage("kill", () => {
  playSound("kill");
});

onMessage("round over", () => {
  stopAllSounds();
});
