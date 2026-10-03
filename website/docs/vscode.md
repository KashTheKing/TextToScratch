---
sidebar_position: 11
title: VS Code extension
---

# VS Code extension

The TextToScratch extension lets you build a whole Scratch game inside VS Code: write the code, see errors, and play the game in a panel next to it.

## Install

The extension isn't on the Marketplace yet. Build the `.vsix` from the repository:

```bash
cd vscode
npm install
npm run package        # writes texttoscratch-0.1.0.vsix
code --install-extension texttoscratch-0.1.0.vsix
```

You can also use **Extensions → … → Install from VSIX…** in VS Code.

## Start a project

- **TextToScratch: New Project** creates an empty project (a stage and a starter sprite) or a copy of one of the example games.
- **TextToScratch: Import Scratch Project (.sb3)** takes a `.sb3` file or a link to a shared project such as `https://scratch.mit.edu/projects/1387527973`:
  - Every sprite is decompiled to `src/<Sprite>.ts`.
  - Every costume and sound is saved in `src/<Sprite>/` under its original name.
  - The original is kept as `project.sb3`.
  - Decompiler warnings appear in the Problems panel.
  - The project is then built and opened in the game viewer.

When no project is open, the TextToScratch sidebar has the same buttons. Any folder with a `src/Stage.ts` counts as a project.

## While you code

- **IntelliSense.** Opening a project creates `tsconfig.json` and `.tts/` (the typings) if they're missing. Adding or removing a sprite, costume or sound updates the `SpriteName`, `CostumeName` and `SoundName` unions right away. Hovering over a block shows its docs.
- **Errors.** TypeScript shows type errors as you type. Each save also runs the TextToScratch compiler and adds errors for code Scratch can't run, such as destructuring.
- **Snippets.** Type `whenFlag`, `forever`, `onMessage`, `onClone`, `arrowmove` or `spawner` and press Tab.
- **Status bar.** Shows ✓ when the build is OK, or the number of errors. Click it to open the viewer.

## Game viewer

**TextToScratch: Run in Viewer** (▶ in the editor title bar) builds the project and plays it with the real Scratch engine. The viewer has:

- Green flag, stop, turbo mode and an FPS counter.
- Stage size options (small, normal, large, fit) and full screen.
- Variable and list monitors, keyboard and mouse input, `askAndWait`, sounds, and bitmap and SVG costumes.
- **Auto-reload**: the game reloads after each save. With **Keep running** on, it presses the green flag again if the game was running.
- **2 players**: two copies of the game side by side, sharing cloud variables through a simulated local server. Use it to test [multiplayer](engine/multiplayer) games. Click a stage to control that player.

## Sharing

- **Build** writes `dist/<project>.sb3`.
- **Export .sb3** saves it wherever you choose.
- **Open in Scratch / TurboWarp** builds the project, copies the file path, and opens the editor. There, use **File → Load from your computer**.
