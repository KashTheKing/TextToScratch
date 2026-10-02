# TextToScratch

Write Scratch games in **typed TypeScript** and compile them to real Scratch blocks (`.sb3`).
Draw sprites and backdrops in Scratch (or drop image files in a folder); write all the logic as code.

- Full type checking by the real TypeScript compiler, so typos in sprite, costume, backdrop and sound names are compile errors.
- Output is a normal Scratch project: open it in Scratch or TurboWarp, share it, remix it.
- Three ways to use it: a **browser extension** that adds a code editor inside the Scratch editor, a **standalone web editor**, and a **CLI** for VS Code users.

```ts
// Fruit.ts
import { game } from "./Stage";

onClone(() => {
  goTo(random(-200, 200), 190);
  while (me.y > -170) {
    me.y -= 4;
    if (touching("Basket")) {
      game.score++;
      deleteClone();
    }
  }
  game.lives--;
  deleteClone();
});
```

## Setup

```bash
npm install
```

```bash
npm run build
```

`npm run build` produces `dist/cli.js` (the CLI) and `extension/` (the browser extension and web editor).

### Browser extension (code inside the Scratch editor)

1. `npm run build`
2. Chrome: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, pick the `extension/` folder.
   Firefox: `about:debugging` → **Load Temporary Add-on** → `extension/manifest.json`.
3. Open a project in the editor at scratch.mit.edu or turbowarp.org. A **{ } Text Code** item appears in the menu bar.
4. Click it. The code editor covers the blocks area; the stage and sprite list stay visible.
   - Click a sprite tile to start coding it. Sprites without a code file keep their hand-made blocks.
   - **Build & Run** (Ctrl+S) compiles, loads the result into the editor, and clicks the green flag.
   - Drop image files on a sprite tile to add them as costumes (on the Stage: backdrops).
   - Your source code is saved *inside the project* (a collapsed Stage comment), so **File → Save** keeps it.

### Standalone web editor

```bash
npm run dev
```

Open http://localhost:5180 to get the same editor with **Open .sb3** and **Download .sb3** buttons.

### CLI (VS Code, git, your own editor)

Run `npm link` once in this repo to get the `tts` command (or use `node dist/cli.js` in its place).

```bash
tts init my-game
```

```bash
tts build my-game
```

```
my-game/
  project.sb3        optional: a project saved from Scratch, used for its art and sounds
  src/
    Stage.ts         the stage
    Player.ts        one file per sprite (file name = sprite name)
    Player/          images here become Player's costumes (png, svg, jpg)
      idle.png
      run1.png
    Stage/           images here become backdrops
  dist/my-game.sb3   build output
```

`tts watch my-game` rebuilds on every save. `tts build` also writes `.tts/*.d.ts`, so VS Code shows the same types and errors.

## The language

It's ordinary TypeScript, so a few rules map it onto Scratch.

| TypeScript | Scratch |
|---|---|
| `let speed = 5` at the top of `Player.ts` | variable "for this sprite only" |
| `export const game = { score: 0, lives: 3 }` | global variables `score`, `lives` (use `game.score++` from any file) |
| `const GRAVITY = 0.5` | inlined constant |
| `const items: number[] = []` | list (indexes are 0-based in code; the compiler adds 1) |
| `function jump(height: number) { ... }` | custom block (`/** @warp */` = run without screen refresh) |
| `return x` in a function | supported (hidden `__ret` variable) |
| `whenFlag(() => { ... })` | hat block (must be at the top level) |
| `if / else`, `while`, `for (;;)`, `cond ? a : b` | if/else, repeat until, ... |
| `` `Score: ${n}` ``, `a + "text"` | join |
| `me.x += 5`, `me.visible = false` | change x by, hide |

**Events:** `whenFlag`, `whenKey(key)`, `whenClicked`, `whenBackdrop(name)`, `whenGreater("timer" | "loudness", n)`, `onMessage(msg)`, `onClone`.

**Motion:** `move`, `turnRight`, `turnLeft`, `goTo(x, y)`, `goToTarget(sprite | "mouse" | "random")`, `glide`, `glideToTarget`, `pointInDirection`, `pointTowards`, `bounceOnEdge`, plus `me.x`, `me.y`, `me.direction`, `me.rotationStyle`.

**Looks:** `say`, `sayFor`, `think`, `thinkFor`, `switchCostume`, `nextCostume`, `switchBackdrop`, `nextBackdrop`, `setEffect`, `changeEffect`, `clearEffects`, `goToFront`, `goToBack`, `moveForward`, `moveBackward`, plus `me.size`, `me.visible`, `me.costumeNumber`, `me.costumeName`, `me.backdropNumber`, `me.backdropName`.

**Sound:** `playSound`, `playSoundUntilDone`, `stopAllSounds`, `setSoundEffect`, `changeSoundEffect`, `clearSoundEffects`, `me.volume`.

**Control:** `wait`, `waitUntil(() => cond)`, `repeat(n, () => {})`, `forever(() => {})`, `stopAll`, `stopThis`, `stopOthers`, `createClone(sprite?)`, `deleteClone`, `broadcast`, `broadcastAndWait`.

**Sensing:** `touching(sprite | "edge" | "mouse")`, `touchingColor("#ff0000")`, `distanceTo`, `keyPressed(key)`, `mouseDown`, `mouseX`, `mouseY`, `askAndWait`, `answer`, `timer`, `resetTimer`, `loudness`, `current("year" | ...)`, `daysSince2000`, `username`, `valueOf(sprite, "x position")`, `me.draggable`.

**Operators:** `+ - * / %`, comparisons, `&& || !`, `random(a, b)`, `Math.floor/ceil/round/abs/sqrt/min/max/log/exp/random/PI`, `sin/cos/tan/asin/acos/atan` (degrees), `str.length`, `str[i]`, `str.charAt(i)`, `str.includes(s)`, `String(x)`, `Number(x)`.

**Lists:** `push`, `insert(i, v)`, `remove(i)`, `pop`, `shift`, `unshift`, `splice(i, 1)`, `list[i]`, `list[i] = v`, `length`, `length = 0`, `indexOf`, `includes`, `showVariable(list)`.

**Variables:** `showVariable(v)`, `hideVariable(v)`.

**Pen:** `penDown`, `penUp`, `penClear`, `stamp`, `setPenColor("#hex")`, `setPenSize`, `changePenSize`, `setPenParam`, `changePenParam`.

The full typed API is in [lib/scratch.d.ts](lib/scratch.d.ts).

### Things that work differently from JavaScript

These follow Scratch's behavior:

- **No `break` / `continue` / `switch`.** Use a flag in the loop condition, or `return` from a function.
- **Variables keep their values between runs.** Top-level initializers set the starting value saved in the project. Reset state inside `whenFlag`.
- **Variables declared inside functions are sprite variables,** so they are not safe across recursion.
- **At most one value-returning function call per statement.** Split `f(a) + f(b)` into two variables.
- **`==` is case-insensitive** and compares numbers numerically, like Scratch's `=` block.
- **`%` takes the sign of the divisor**, and trig functions use degrees.
- **Functions are per sprite.** To trigger code in another sprite, use `broadcast`.

## Development

```bash
npm test
```

```bash
npm run typecheck
```

- `npm test` compiles programs and runs them in a headless `scratch-vm`, checking the resulting variables and sprite state.
- `npm run dev` serves the editor with the same CSP Chrome applies to extension pages. `http://localhost:5180/test/harness.html` is a fake Scratch editor (real `scratch-vm` plus the real `bridge.js` and `content.js`) for testing the extension end to end. Run `npx tts build examples/catcher` first.

| Path | What it is |
|---|---|
| `src/compiler/compile.ts` | TypeScript AST → Scratch blocks |
| `src/compiler/api.ts` | table of API functions → opcodes |
| `src/compiler/index.ts` | type checking, project assembly, image costumes |
| `src/compiler/project.ts` | sb3 zip I/O, md5, image sizes |
| `extension/` | MV3 extension: `bridge.js` (finds the VM), `content.js` (menu item and overlay), `editor.*` (Monaco editor) |
| `examples/catcher` | a complete example game |
