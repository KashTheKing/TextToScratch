---
name: tts-game
description: Create a complete Scratch game with TextToScratch (TypeScript source, SVG art, synthesized sound effects, title-card thumbnail), play-test it, and optionally publish it to Scratch and the TextToScratch studio. Use when asked to make/build a new game or example project.
---

# Make a TextToScratch game

Repo: `D:\Projects\TextToScratch`. Games live in `examples/<slug>/` (or their own repo with `"texttoscratch": "file:../TextToScratch"` as a devDependency, like `D:\Projects\block-puzzle`).

## 1. Learn the language (don't guess)
- Typed API: `lib/scratch.d.ts`. Engine: `lib/engine/*.ts`, imported as `tts/input`, `tts/physics`, `tts/camera`, `tts/anim`, `tts/net`, `tts/particles`, `tts/draw`, `tts/time`, `tts/math`, `tts/scene`, `tts/data`, `tts/3d`.
- Limits: `website/docs/language.md`, `website/docs/differences.md`. No `break`/`continue`/`switch`; `new` only at a file's top level; function locals are sprite variables (not recursion-safe).
- Copy structure from `examples/catcher` (small), `examples/engine-demo` (engine), `examples/multiplayer` (net).

## 2. Layout
```
examples/<slug>/
  src/Stage.ts           shared state (export const game = {...})
  src/<Sprite>.ts        one file per sprite
  src/<Sprite>/*.svg     costumes (need width/height/viewBox), *.wav sounds
  src/Thumbnail.ts       title card, always top layer; hide it when the game starts
  src/Thumbnail/thumbnail.svg   480x360 bold title (Marker font, thick dark stroke + shadow, "Made with TextToScratch" badge)
  scripts/sfx.mjs        synthesizes the WAVs
```

## 3. Art and sound
- Hand-written SVG, bright and Scratch-like; no placeholder boxes.
- Sounds: copy the `wav()`/`synth()` helpers from `D:\Projects\block-puzzle\scripts\sfx.mjs`, give every meaningful event a sound (shoot, hit, coin, wave, win, game over), run `node scripts/sfx.mjs`.

## 4. Build
```bash
npm run build && node dist/cli.js build examples/<slug>
```
Fix every diagnostic. Output: `examples/<slug>/dist/<slug>.sb3`.

## 5. Play-test (required)
- `node scripts/serve.mjs` (port 5180), open `http://localhost:5180/test/player.html?project=/examples/<slug>/dist/<slug>.sb3` in the browser; `?noflag` shows the title card. `window.vm` is the VM.
- Multiplayer: `test/multiplayer.html` (fake cloud server).
- Play start → lose/win → restart. Fix until it's fun.

## 6. Community rules
- Scratch forbids free-text chat: multiplayer uses quick chat only (`Net.sendMessage(i)` / `Net.QUICK_CHAT`).
- Cartoon violence only, no blood. Keep clones < 300.

## 7. Publish to Scratch (when asked)
In the user's logged-in Chrome (claude-in-chrome). GUI buttons are flaky in a background tab, so use the APIs:
1. Navigate to `https://scratch.mit.edu/projects/editor/`. This creates a new project; its id is in the URL.
2. Inject a hidden `<input type=file aria-label=ttsloader>` whose onchange runs `vm.loadProject(await file.arrayBuffer())` (get `vm` by walking the React fiber of `[class*=stage-wrapper]` up to `memoizedProps.vm`), then `file_upload` the .sb3 to it. Don't call `vm.stop()` first (loading hangs).
3. Token: `(await fetch("/session/",{headers:{"X-Requested-With":"XMLHttpRequest"}}).then(r=>r.json())).user.token`. CSRF: the `scratchcsrftoken` cookie.
4. Upload every costume and sound: `POST https://assets.scratch.mit.edu/<assetId>.<dataFormat>` (body `asset.data`, credentials include).
5. Save: `PUT https://projects.scratch.mit.edu/<id>`, body `vm.toJSON()`, header `x-token`.
6. Thumbnail: `vm.renderer.requestSnapshot(cb); vm.renderer.draw()` gives a PNG data URL; POST the blob to `/internalapi/project/thumbnail/<id>/set/` with `X-CSRFToken`. Race it with a 5s timeout (background tabs may not render).
7. Title, instructions, notes: `PUT https://api.scratch.mit.edu/projects/<id>` with `x-token`, body `{title, instructions, description}`. Notes start "Made with TextToScratch!" and link the source and https://github.com/KashTheKing/TextToScratch.
8. Navigate (force: true; the editor thinks it's unsaved) to the project page and click the yellow banner's **Share** button by coordinate. Retry until `https://api.scratch.mit.edu/projects/<id>` returns 200.
9. Add to the studio: `POST https://api.scratch.mit.edu/studios/52025574/project/<id>` with `x-token` (403 until shared).
10. Verify the thumbnail on the studio page. If it shows the game instead of the title card, re-snapshot from the project page's VM and POST again.

## 8. Wrap up
Add the example to `scripts/site.mjs` `EXAMPLES` and the docs if it should appear on the website; rebuild with `node scripts/site.mjs --deploy`. Commit without a Claude co-author line.
