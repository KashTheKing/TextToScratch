---
title: Differences from JavaScript
---

# Differences from JavaScript

Your code runs as Scratch blocks, so it follows Scratch's rules. Here's what to keep in mind.

| Topic | What happens |
|---|---|
| `break`, `continue`, `switch` | Not supported. Use a flag in the loop condition, or `return` from a function. |
| Variable values | Kept between runs (green flag clicks). Reset them in `whenFlag`. |
| Variables inside functions | Become sprite variables, so they aren't safe across recursion. |
| Value-returning calls | At most one per statement. Split `f(a) + f(b)` into two variables. Loop and `waitUntil` conditions may call functions. |
| `==` / `===` | Scratch equality: compares numbers numerically, text case-insensitively (`"A" === "a"` is true). |
| `%` | Result takes the sign of the divisor (`-1 % 3` is `2`). |
| `sin`, `cos`, ... | Use **degrees**. |
| Functions | Belong to their sprite. Share code through `src/lib/` or the engine, which copy functions into each sprite that uses them. To trigger code in another sprite, use `broadcast`. |
| Objects | State objects (`{ score: 0 }`) and [classes](./engine/classes.md). Objects are created when the project is built: make them with `new` at the top of a file, and use clones when you need many at runtime. |
| `me.visible` | Can be set but not read (Scratch has no block for it). Keep it in a variable, or use `Camera.onScreen`. |
| Sprite positions | Scratch keeps sprites on stage, so a sprite can't move fully off screen. Hide it instead (`Camera.place` does this). |
| Lists | Hold numbers and text. No nested arrays. |
| Timing | Like Scratch, loops yield once per frame unless the function is marked `/** @warp */`. |
