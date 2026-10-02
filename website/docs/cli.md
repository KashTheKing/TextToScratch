---
sidebar_position: 10
title: CLI & VS Code
---

# CLI & VS Code

Prefer your own editor, git, and art in files? Use the command-line compiler.

## Create a project

```bash
tts init my-game
```

```
my-game/
  project.sb3        optional: a project saved from Scratch, used for its art and sounds
  tsconfig.json      gives VS Code the same types and errors
  src/
    Stage.ts         the stage
    Player.ts        one file per sprite (file name = sprite name)
    Player/          images here become Player's costumes (png, svg, jpg)
      idle.png
      walk1.png
    Stage/           images here become backdrops
```

## Build

```bash
tts build my-game
```

This writes `dist/my-game.sb3`; open it in Scratch with **File → Load from your computer**. `tts watch my-game` rebuilds on every save.

Each build also writes `.tts/scratch.d.ts` and `.tts/sprites.d.ts`, so VS Code autocompletes your sprite, costume and sound names.

## Image folders

Every image in `src/<Sprite>/` becomes a costume named after its file (`run1.png` becomes the costume `run1`).
Costumes are added in name order; an image with the same name as an existing costume replaces it.
SVG, PNG and JPG are supported.

## Round trip with Scratch

1. Build, open the `.sb3` in Scratch, and draw or edit art there.
2. **File → Save to your computer** as `my-game/project.sb3`.
3. Build again: your art comes from `project.sb3` and your logic from `src/`.
