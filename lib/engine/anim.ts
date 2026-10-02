// tts/anim: costume animations. Name frames <prefix><n>: walk1, walk2, ...
//
// Quick, one animation at a time per sprite (switching restarts it; show() never animates):
//   if (moving) Anim.play("walk", 2, 8); else Anim.show("idle");
//
// Or as objects, when you want to keep several configured animations around:
//   const walk = new Anim.Animation("walk", 2, 8);
//   const die = new Anim.Animation("die", 4, 10, false);   // plays once
//   walk.show();   die.restart();   if (die.finished()) deleteClone();

let current = "";
let startedAt = 0;

/** Loop `<prefix>1..<prefix><frames>` at `fps`; restarts from frame 1 when a different animation was playing. */
/** @warp */
export function play(prefix: string, frames: number, fps: number) {
  if (current !== prefix) {
    current = prefix;
    startedAt = timer();
  }
  const f = (Math.floor((timer() - startedAt) * fps) % frames) + 1;
  switchCostume((prefix + String(f)) as CostumeName);
}

/** Play `<prefix>1..<prefix><frames>` once and hold the last frame. Returns true once it has finished. */
/** @warp */
export function playOnce(prefix: string, frames: number, fps: number): boolean {
  if (current !== prefix) {
    current = prefix;
    startedAt = timer();
  }
  const raw = Math.floor((timer() - startedAt) * fps);
  switchCostume((prefix + String(Math.min(raw, frames - 1) + 1)) as CostumeName);
  return raw >= frames;
}

/** Show a single costume (no animation), e.g. "idle". */
/** @warp */
export function show(costume: CostumeName) {
  current = costume;
  switchCostume(costume);
}

/** Restart whatever play()/playOnce() is showing from its first frame. */
/** @warp */
export function restart() {
  startedAt = timer();
}

/** A configured animation. Create with `new` at the top of a sprite file; every clone gets its own copy. */
export class Animation {
  prefix = "";
  frames = 1;
  fps = 8;
  loop = true;
  startedAt = 0;
  speed = 1;

  constructor(prefix: string, frames: number, fps: number, loop: boolean = true) {
    this.prefix = prefix;
    this.frames = frames;
    this.fps = fps;
    this.loop = loop;
  }

  /** Start again from the first frame. */
  /** @warp */
  restart() {
    this.startedAt = timer();
  }

  /** Current frame number (1-based). */
  /** @warp */
  frame(): number {
    const raw = Math.floor((timer() - this.startedAt) * this.fps * this.speed);
    if (this.loop) return (raw % this.frames) + 1;
    return Math.min(raw, this.frames - 1) + 1;
  }

  /** Switch the sprite to the current frame (call every frame). */
  /** @warp */
  show() {
    const f = this.frame();
    switchCostume((this.prefix + String(f)) as CostumeName);
  }

  /** For non-looping animations: has the last frame been shown for a full frame? */
  /** @warp */
  finished(): boolean {
    return !this.loop && (timer() - this.startedAt) * this.fps * this.speed >= this.frames;
  }
}
