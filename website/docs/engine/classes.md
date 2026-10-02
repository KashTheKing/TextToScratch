---
title: Classes & objects
---

# Classes & objects

Use classes to bundle configuration, state and behaviour. Create objects with `new` at the top of a file:

```ts title="Enemy.ts"
class Patrol {
  speed = 2;
  direction = 1;

  constructor(public left: number, public right: number) {}

  update() {
    me.x += this.speed * this.direction;
    if (me.x > this.right || me.x < this.left) this.direction = -this.direction;
  }
}

class FastPatrol extends Patrol {
  constructor(left: number, right: number) {
    super(left, right);
    this.speed = 5;
  }
}

const patrol = new FastPatrol(-150, 150);

whenFlag(() => {
  forever(() => patrol.update());
});
```

## How objects map to Scratch

| Code | Scratch |
|---|---|
| `const patrol = new Patrol(-150, 150)` | variables `patrol.speed`, `patrol.direction`, `patrol.left`, `patrol.right` |
| `patrol.update()` | custom block `patrol.update` (each object gets its own copy) |
| `this.speed` inside a method | the object's variable |
| `export const boss = new Enemy()` | the object's variables are global, shared by all sprites |
| a clone of the sprite | gets its own copy of every object, so each clone has independent state |

The last row is what makes classes useful for games: give the sprite an object, create clones, and every clone runs the same methods on its own data.

```ts
const health = new Health(3);
onClone(() => {
  forever(() => {
    if (touching("Bullet")) health.damage(1);   // each clone tracks its own health
    if (health.dead()) deleteClone();
  });
});
```

## What's supported

- Fields with literal or constant initial values, including lists (`items: number[] = []`).
- Constructors with parameters and defaults, parameter properties (`constructor(public speed = 2)`) and `super(...)`.
- Methods with parameters and return values, calling other methods with `this.method()`.
- `extends` with overrides: a method called on a `Boss` uses `Boss`'s version, even when called from a base-class method.
- Classes in `src/lib/` and in engine modules (`new Anim.Animation("walk", 2, 8)`).

## Rules

- **Objects are created when the project is built**, so constructors can only do `this.field = value` with constants or
  constructor arguments, and `super(...)`. Put anything else in a method (e.g. `init()`) and call it from `whenFlag`.
- Create objects with `new` at the top level of a file (not inside functions or loops). For many objects at runtime, use clones.
- Objects can't be passed around as values. Call their methods and read their fields directly.
- No `static` members, getters or setters. Use top-level functions and constants instead.
