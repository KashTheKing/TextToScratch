---
title: Utilities
---

# Utilities

## Math

`import * as M from "tts/math"`

| | |
|---|---|
| `clamp(v, min, max)`, `lerp(a, b, t)`, `approach(current, target, step)` | |
| `sign(v)`, `wrap(v, min, max)` | |
| `distance(x1, y1, x2, y2)` | |
| `atan2(y, x)` | in degrees, mathematical (0 = right, counter-clockwise) |
| `directionTo(x1, y1, x2, y2)` | Scratch direction (0 = up, 90 = right), ready for `pointInDirection` |
| `randomFloat(min, max)` | decimal random number |
| `easeInOut(t)`, `easeOut(t)` | easing for t in 0..1 |
| `boxesOverlap(ax, ay, aw, ah, bx, by, bw, bh)`, `pointInBox(px, py, bx, by, bw, bh)` | centre-based boxes |

## Data

`import * as Data from "tts/data"`

| | |
|---|---|
| `split(text, sep)` | into the list `Data.parts` |
| `join(sep)` | `Data.parts` joined into text |
| `slice(text, start, length)`, `indexOf(text, find)`, `replaceAll(text, find, replacement)` | text helpers |
| `pad(n, width)`, `formatTime(seconds)` | `"007"`, `"2:05"` |
| `sortNumbers()` | sorts `Data.numbers` |
| `saveCode()` / `loadCode(code)` | turn `Data.numbers` into a copyable save code with a checksum, and back |

Scratch compares text case-insensitively, so `indexOf("Hello", "h")` is 0.

## Time

`import * as Time from "tts/time"`

| | |
|---|---|
| `cooldown(name, seconds)` | true if ready, and restarts it, e.g. `if (Time.cooldown("shoot", 0.25)) fire();` |
| `start(name, seconds)`, `done(name)`, `remaining(name)` | named countdowns |
| `delta()` | seconds since the last call; multiply speeds by it for frame-rate independent motion |

## Scene

`import * as Scene from "tts/scene"`

| | |
|---|---|
| `go(name)` | set the scene and broadcast `"scene <name>"` |
| `is(name)` | is this the current scene? |
| `scene.current` | the current scene's name |

```ts
onMessage("scene play", () => {
  while (Scene.is("play")) { /* game loop */ }
});
```

## Draw

`import * as Draw from "tts/draw"`. Colours are `"#rrggbb"`; use a sprite with a tiny costume.

| | |
|---|---|
| `rect(x, y, w, h, color)` | filled rectangle (centre-based) |
| `outline(x, y, w, h, thickness, color)` | rectangle outline |
| `circle(x, y, radius, color)` | filled circle |
| `line(x1, y1, x2, y2, thickness, color)` | line |
| `bar(x, y, w, h, fraction, fill, back)` | progress / health bar, left-aligned at x |

## Particles

`import * as Particles from "tts/particles"`

```ts title="Spark.ts"
import * as Particles from "tts/particles";
onMessage("explode", () => Particles.burst(0, 0, 12, 4, 20, 0.2));
onClone(() => Particles.run());      // required: animates each particle clone
```

`burst(x, y, count, speed, frames, gravity)` spawns clones that fly outward, fall, fade and delete themselves.
