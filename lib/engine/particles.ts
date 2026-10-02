// tts/particles: clone-based particle bursts. Give a sprite a small costume, then:
//
//   onClone(() => Particles.run());               // in that sprite (required)
//   Particles.burst(me.x, me.y, 12, 4, 20, 0.2);  // from the same sprite: 12 particles
//
// For bursts triggered elsewhere, broadcast a message and call burst() from the particle sprite.

let pvx = 0;
let pvy = 0;
let life = 20;
let fall = 0;

/** Spawn `count` particles at (x, y) flying outward at up to `speed`, lasting `frames`, with `gravity`. */
/** @warp */
export function burst(x: number, y: number, count: number, speed: number, frames: number, gravity: number) {
  goTo(x, y);
  life = frames;
  fall = gravity;
  for (let i = 0; i < count; i++) {
    pvx = (Math.random() * 2 - 1) * speed;
    pvy = (Math.random() * 2 - 1) * speed;
    createClone();
  }
}

/** Animate this clone (call from onClone): moves, falls, fades, then deletes itself. */
export function run() {
  me.visible = true;
  clearEffects();
  goToFront();
  repeat(life, () => {
    me.x += pvx;
    me.y += pvy;
    pvy -= fall;
    changeEffect("ghost", 100 / life);
  });
  deleteClone();
}
