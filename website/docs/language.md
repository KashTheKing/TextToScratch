---
title: Language guide
---

# Language guide

TextToScratch code is ordinary TypeScript. These rules map it onto Scratch.

## Files are sprites

| File | Becomes |
|---|---|
| `Stage.ts` | the Stage |
| `Player.ts` | the sprite named `Player` (it's created if it doesn't exist yet) |

Code at the top level of a file can only *declare* things: variables, functions, and event handlers.

## Variables

```ts
let speed = 5;                          // "for this sprite only" variable
export const game = { score: 0 };       // global variables: score
const GRAVITY = 0.8;                    // constant, inlined (no variable)
const items: string[] = [];             // list
```

| Code | Scratch |
|---|---|
| `let x = 0` at the top of a sprite file | variable *for this sprite only* (every clone gets its own copy) |
| `export const state = { a: 0, b: "" }` | global variables `a` and `b`, used as `state.a` from any file |
| `export let x = 0` | global variable (only the file that declares it can assign it) |
| `const N = 5` | inlined literal |
| `const list: number[] = [1, 2]` | list with starting items |
| `let i = 0` inside a function or event | a sprite variable with a unique name |

Initial values must be literals or constants (`let x = START_X`). They're saved in the project as the variable's starting value.

### Using shared state

TypeScript doesn't let other files assign to an imported `let`, so share state through an object:

```ts title="Stage.ts"
export const game = { score: 0, lives: 3 };
```

```ts title="Enemy.ts"
import { game } from "./Stage";
onMessage("hit", () => { game.lives--; });
```

## Events

Event handlers must be at the top level:

```ts
whenFlag(() => { ... });
whenKey("space", () => { ... });
whenClicked(() => { ... });
whenBackdrop("level2", () => { ... });
whenGreater("timer", 10, () => { ... });
onMessage("game over", () => { ... });
onClone(() => { ... });
```

## Control flow

| Code | Block |
|---|---|
| `if (c) { } else { }` | <span className="blk control">if / else</span> |
| `while (c) { }` | <span className="blk control">repeat until not c</span> |
| `while (true) { }` / `forever(() => { })` | <span className="blk control">forever</span> |
| `for (let i = 0; i < n; i++) { }` | set + <span className="blk control">repeat until</span> |
| `repeat(10, () => { })` | <span className="blk control">repeat 10</span> |
| `waitUntil(() => cond)` | <span className="blk control">wait until</span> |
| `cond ? a : b` | if / else into a temporary variable |
| `return` | <span className="blk control">stop this script</span> |

Loop and `waitUntil` conditions can call your functions; the compiler evaluates them again on every iteration.

## Functions = custom blocks

```ts
/** @warp */
function drawSquare(size: number, filled: boolean) { ... }
```

- Parameters can be `number`, `string` or `boolean` (boolean parameters become hexagonal inputs).
- `/** @warp */` turns on **Run without screen refresh**.
- Functions can `return` a value; it's passed back through a hidden `__ret` variable.
- Functions belong to their sprite. To run code in another sprite, `broadcast` a message.

## Sprite properties: `me`

```ts
me.x += 5;              // change x by 5
me.y = 0;               // set y to 0
me.direction = 90;      // point in direction 90
me.size = 150;          // set size to 150 %
me.visible = false;     // hide
me.rotationStyle = "left-right";
me.draggable = true;
if (me.costumeName === "jump") { ... }
```

## Expressions

| Code | Block |
|---|---|
| `a + b` (numbers) | <span className="blk operators">+</span> |
| `a + b`, `` `Score: ${s}` `` (strings) | <span className="blk operators">join</span> |
| `- * / %` | arithmetic |
| `< > <= >= === !==` | comparisons |
| `&& \|\| !` | <span className="blk operators">and / or / not</span> |
| `Math.floor(x)`, `Math.abs(x)`, `Math.sqrt(x)`, ... | <span className="blk operators">floor of</span>, ... |
| `Math.round(x)`, `Math.min(a, b)`, `Math.max(a, b)`, `Math.random()` | round / computed / pick random |
| `random(1, 10)` | <span className="blk operators">pick random 1 to 10</span> |
| `str.length`, `str[i]`, `str.includes(s)` | length / letter of / contains |
| `list[i]`, `list.length`, `list.includes(x)`, `list.indexOf(x)` | list reporters |

## Classes, libraries and the engine

- [Classes](./engine/classes.md): fields, methods, constructors and `extends`. Each object becomes variables plus custom blocks.
- Shared code goes in `src/lib/`, and the [game engine](./engine/overview.md) is built in: `import * as Physics from "tts/physics"`.
- `/** @cloud */ export const online = { best: 0 }` makes cloud variables.

## Typed asset names

Sprite, costume, backdrop and sound names are checked against your project:

```ts
switchCostume("jmup");
//            ~~~~~~ Argument of type '"jmup"' is not assignable to parameter of type 'CostumeName'.
```
