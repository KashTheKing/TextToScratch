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
| Value-returning calls | At most one per statement. Split `f(a) + f(b)` into two variables. |
| Loop conditions | Can't call value-returning functions or use `?:`. Compute the value into a variable first. |
| `==` / `===` | Scratch equality: compares numbers numerically, text case-insensitively (`"A" === "a"` is true). |
| `%` | Result takes the sign of the divisor (`-1 % 3` is `2`). |
| `sin`, `cos`, ... | Use **degrees**. |
| Functions | Belong to their sprite. To run code elsewhere, use `broadcast`. |
| Objects | Only for state (`{ score: 0 }`). No classes, no objects at runtime. |
| Lists | Hold numbers and text. No nested arrays. |
| Timing | Like Scratch, loops yield once per frame unless the function is marked `/** @warp */`. |
