import { test } from "node:test";
import assert from "node:assert/strict";
import { compile, run, svg } from "./helpers";

const near = (a: any, b: number, eps = 1e-6) => assert.ok(Math.abs(Number(a) - b) < eps, `${a} ≈ ${b}`);

test("library functions compile into the sprite that uses them, namespaced", () => {
  const res = compile({ "Hero.ts": `import * as M from "tts/math"; whenFlag(() => { me.x = M.clamp(500, -10, 10); });` });
  assert.deepEqual(res.diagnostics, []);
  const hero = res.sb3!.json.targets.find((t: any) => t.name === "Hero");
  const codes = Object.values(hero.blocks).filter((b: any) => b.opcode === "procedures_prototype").map((b: any) => b.mutation.proccode);
  assert.deepEqual(codes, ["math.clamp %s %s %s"]); // only what's used
  // unused engine modules add nothing to the project
  assert.deepEqual(res.sb3!.json.targets[0].variables, {});
});

test("math", async () => {
  const r = await run({
    "Stage.ts": `
      import * as M from "tts/math";
      export const out = { c: 0, l: 0, a1: 0, a2: 0, a3: 0, d: 0, w: 0, dist: 0, ov: false, ap: 0, sg: 0 };
      whenFlag(() => {
        out.c = M.clamp(15, 0, 10);
        out.l = M.lerp(10, 20, 0.25);
        out.a1 = M.atan2(1, -1);
        out.a2 = M.atan2(-1, -1);
        out.a3 = M.atan2(0, -5);
        out.d = M.directionTo(0, 0, 10, 0);
        out.w = M.wrap(-30, 0, 360);
        out.dist = M.distance(0, 0, 3, 4);
        out.ov = M.boxesOverlap(0, 0, 10, 10, 9, 0, 10, 10);
        out.ap = M.approach(5, 0, 2);
        out.sg = M.sign(-3);
      });`,
  });
  assert.equal(Number(r.g("c")), 10);
  near(r.g("l"), 12.5);
  near(r.g("a1"), 135);
  near(r.g("a2"), -135);
  near(r.g("a3"), 180);
  near(r.g("d"), 90);
  near(r.g("w"), 330);
  near(r.g("dist"), 5);
  assert.equal(r.g("ov"), true);
  near(r.g("ap"), 3);
  near(r.g("sg"), -1);
});

test("data: split/join, slice, indexOf, replaceAll, formatTime, sort, save codes", async () => {
  const r = await run({
    "Stage.ts": `
      import * as Data from "tts/data";
      export const out = { j: "", n: 0, sl: "", ix: 0, ra: "", ft: "", sorted: "", code: "", ok: false, bad: true, restored: "" };
      whenFlag(() => {
        Data.split("a,bb,ccc", ",");
        out.n = Data.parts.length;
        out.j = Data.join("+");
        out.sl = Data.slice("scratch", 1, 3);
        out.ix = Data.indexOf("hello world", "wor");
        out.ra = Data.replaceAll("a-b-c", "-", "::");
        out.ft = Data.formatTime(125);
        Data.numbers.length = 0;
        Data.numbers.push(5, 1, 4, 2);
        Data.sortNumbers();
        Data.parts.length = 0;
        for (let i = 0; i < Data.numbers.length; i++) Data.parts.push(String(Data.numbers[i]));
        out.sorted = Data.join(",");
        out.code = Data.saveCode();
        out.ok = Data.loadCode(out.code);
        Data.parts.length = 0;
        for (let i = 0; i < Data.numbers.length; i++) Data.parts.push(String(Data.numbers[i]));
        out.restored = Data.join(",");
        out.bad = Data.loadCode("1-2-k999");
      });`,
  });
  assert.equal(Number(r.g("n")), 3);
  assert.equal(r.g("j"), "a+bb+ccc");
  assert.equal(r.g("sl"), "cra");
  assert.equal(Number(r.g("ix")), 6);
  assert.equal(r.g("ra"), "a::b::c");
  assert.equal(r.g("ft"), "2:05");
  assert.equal(r.g("sorted"), "1,2,4,5");
  assert.equal(r.g("restored"), "1,2,4,5");
  assert.equal(String(r.g("ok")), "true");
  assert.equal(String(r.g("bad")), "false");
});

test("3d projection and rotation", async () => {
  const r = await run({
    "Stage.ts": `
      import * as ThreeD from "tts/3d";
      export const out = { vis: false, x: 0, y: 0, behind: true, turned: 0, rx: 0, rz: 0 };
      whenFlag(() => {
        ThreeD.setCamera(0, 0, -300, 0, 0);
        out.vis = ThreeD.project(100, 50, 0);
        out.x = ThreeD.sx;
        out.y = ThreeD.sy;
        out.behind = ThreeD.project(0, 0, -400);
        ThreeD.setCamera(0, 0, 0, 90, 0);
        const ok = ThreeD.project(100, 0, 0);
        out.turned = ThreeD.sx;
        ThreeD.rotate(10, 0, 90);
        out.rx = ThreeD.rx;
        out.rz = ThreeD.rz;
      });`,
  });
  assert.equal(String(r.g("vis")), "true");
  near(r.g("x"), 100); // 100 * 300 / 300
  near(r.g("y"), 50);
  assert.equal(String(r.g("behind")), "false");
  near(r.g("turned"), 0, 1e-6); // turned right 90°: a point to the right is straight ahead
  near(r.g("rx"), 0, 1e-6);
  near(r.g("rz"), 10, 1e-6);
});

test("net: text encoding and player state round trip over cloud variables", async () => {
  const r = await run(
    {
      "Stage.ts": `
        import * as Net from "tts/net";
        export const out = { enc: "", dec: "", slot: 0, active: false, a: 0, b: 0, c: 0, d: 0, other: true };
        whenFlag(() => {
          out.enc = Net.encode("hi 42!");
          out.dec = Net.decode(out.enc);
          Net.join();
          out.slot = Net.session.slot;
          wait(0.15);
          Net.sendState(-120, 75, 4999, -4999);
          out.active = Net.readPlayer(Net.session.slot);
          out.a = Net.pa; out.b = Net.pb; out.c = Net.pc; out.d = Net.pd;
          out.other = Net.readPlayer(2);
        });`,
    },
    0,
    2800,
  );
  assert.equal(r.g("dec"), "hi 42!");
  assert.equal(Number(r.g("slot")), 1); // lowest free slot
  assert.equal(String(r.g("active")), "true");
  assert.deepEqual([r.g("a"), r.g("b"), r.g("c"), r.g("d")].map(Number), [-120, 75, 4999, -4999]);
  assert.equal(String(r.g("other")), "false");
  const cloudVars = Object.values(r.res.sb3!.json.targets[0].variables) as any[];
  assert.ok(cloudVars.some((v) => v[0] === "☁ p1" && v[2] === true));
});

test("time cooldowns", async () => {
  const r = await run({
    "Stage.ts": `export const out = { first: false, second: true, n: 0 };`,
    "Gun.ts": `
      import * as Time from "tts/time";
      import { out } from "./Stage";
      whenFlag(() => {
        out.first = Time.cooldown("shoot", 10);
        out.second = Time.cooldown("shoot", 10);
      });`,
  });
  assert.equal(String(r.g("first")), "true");
  assert.equal(String(r.g("second")), "false");
});

test("user libraries in src/lib are shared by sprites", async () => {
  const r = await run({
    "lib/util.ts": `export const TEN = 10; export function triple(n: number): number { return n * 3; }`,
    "A.ts": `import { triple, TEN } from "./lib/util"; whenFlag(() => { me.x = triple(TEN); });`,
    "B.ts": `import { triple } from "./lib/util"; whenFlag(() => { me.y = triple(-5); });`,
  });
  assert.equal(r.sprite("A").x, 30);
  assert.equal(r.sprite("B").y, -15);
  const res = compile({ "lib/bad.ts": `whenFlag(() => {});`, "A.ts": `` });
  assert.match(res.diagnostics[0].message, /Library files can only contain declarations/);
});

test("classes: fields, constructors, methods, inheritance with overrides, return values", async () => {
  const r = await run({
    "Stage.ts": `
      export const out = { a: 0, b: 0, c: 0, name: "", hp: 0, total: 0, items: 0 };
      class Counter {
        count = 0;
        items: number[] = [];
        constructor(public step: number = 1) {}
        add() { this.count += this.step; this.items.push(this.count); }
        doubled(): number { return this.count * 2; }
      }
      class Enemy {
        hp = 10;
        name = "enemy";
        constructor(hp: number, name: string) { this.hp = hp; this.name = name; }
        hit(damage: number) { this.hp -= damage; this.onHit(); }
        onHit() { out.total += 1; }
      }
      class Boss extends Enemy {
        constructor() { super(50, "boss"); }
        onHit() { out.total += 100; }
      }
      const c1 = new Counter(5);
      const c2 = new Counter();
      const boss = new Boss();
      const grunt = new Enemy(3, "grunt");
      whenFlag(() => {
        c1.add(); c1.add(); c2.add();
        out.a = c1.count; out.b = c2.count; out.c = c1.doubled(); out.items = c1.items.length;
        boss.hit(7); grunt.hit(1);
        out.hp = boss.hp; out.name = boss.name;
      });`,
  });
  assert.equal(Number(r.g("a")), 10);
  assert.equal(Number(r.g("b")), 1);
  assert.equal(Number(r.g("c")), 20);
  assert.equal(Number(r.g("items")), 2);
  assert.equal(Number(r.g("hp")), 43);
  assert.equal(r.g("name"), "boss");
  assert.equal(Number(r.g("total")), 101); // Boss.onHit overrides Enemy.onHit; grunt uses the base one
});

test("classes: every clone gets its own object state; exported objects are shared", async () => {
  const r = await run({
    "Stage.ts": `
      export class Score { points = 0; add(n: number) { this.points += n; } }
      export const score = new Score();
      export const out = { cloneX: 0 };`,
    "Ball.ts": `
      import { score, out } from "./Stage";
      class Mover { x = 0; speed = 1; constructor(s: number) { this.speed = s; } step() { this.x += this.speed; } }
      const m = new Mover(2);
      whenFlag(() => { createClone(); m.step(); score.add(1); });
      onClone(() => { m.step(); m.step(); out.cloneX = m.x; score.add(10); });`,
  });
  assert.equal(Number(r.g("cloneX")), 4); // the clone copied x = 0, then stepped twice
  assert.equal(Number(r.local("Ball", "m.x")), 2); // the original only stepped once
  assert.equal(Number(r.g("score.points")), 11);
});

test("class constructors must be compile-time", () => {
  const res = compile({ "A.ts": `class T { v = 0; constructor() { this.v = timer(); } } const t = new T(); whenFlag(() => {});` });
  assert.match(res.diagnostics[0].message, /Constructors run when the project is built/);
});

test("anim: show never animates, play loops, playOnce finishes, Animation objects", async () => {
  const images = Object.fromEntries(["idle", "walk1", "walk2", "walk3", "die1", "die2"].map((n) => [`Hero/${n}.svg`, svg()]));
  const r = await run(
    {
      "Stage.ts": `export const out = { a: "", b: "", c: "", d: "", once: false, onceLater: false, obj: "", objDone: false };`,
      "Hero.ts": `
        import * as Anim from "tts/anim";
        import { out } from "./Stage";
        const slowWalk = new Anim.Animation("walk", 3, 0.01);
        const die = new Anim.Animation("die", 2, 1000, false);
        whenFlag(() => {
          Anim.show("idle");
          out.a = me.costumeName;
          wait(0.2);
          out.b = me.costumeName;           // still idle: show() never animates
          Anim.play("walk", 3, 0.01);
          out.c = me.costumeName;           // first frame
          out.once = Anim.playOnce("die", 2, 1000);
          wait(0.05);
          out.onceLater = Anim.playOnce("die", 2, 1000);
          out.d = me.costumeName;           // holds the last frame
          slowWalk.restart();
          slowWalk.show();
          out.obj = me.costumeName;
          die.restart();
          wait(0.05);
          out.objDone = die.finished();
        });`,
    },
    0,
    800,
    images,
  );
  assert.equal(r.g("a"), "idle");
  assert.equal(r.g("b"), "idle");
  assert.equal(r.g("c"), "walk1");
  assert.equal(String(r.g("once")), "false");
  assert.equal(String(r.g("onceLater")), "true");
  assert.equal(r.g("d"), "die2");
  assert.equal(r.g("obj"), "walk1");
  assert.equal(String(r.g("objDone")), "true");
});

test("scene switching broadcasts", async () => {
  const r = await run({
    "Stage.ts": `
      import * as Scene from "tts/scene";
      export const out = { got: 0, isMenu: false };
      whenFlag(() => { Scene.go("menu"); out.isMenu = Scene.is("menu"); });
      onMessage("scene menu", () => { out.got++; });`,
  });
  assert.equal(Number(r.g("got")), 1);
  assert.equal(String(r.g("isMenu")), "true");
});

test("every engine module type-checks and compiles when fully used", () => {
  // touch every exported function once so the whole engine is compiled
  const res = compile({
    "Box.ts": `
      import * as Physics from "tts/physics";
      import * as Input from "tts/input";
      import * as Camera from "tts/camera";
      import * as ThreeD from "tts/3d";
      import * as Draw from "tts/draw";
      import * as Particles from "tts/particles";
      import * as Net from "tts/net";
      whenFlag(() => {
        Physics.configure(1, 0.8, 10); Physics.setStepUp(4); Physics.setVelocity(1, 2); Physics.push(1, 0); Physics.jump(5);
        Physics.step("Box"); Physics.stepTopDown("Box"); Physics.bounceInStage(10, 10);
        const g = Physics.groundBelow("Box");
        const ax = Input.axisX(); const ay = Input.axisY(); const j = Input.jumpPressed(); const jh = Input.jumpHeld();
        const mc = Input.mouseClicked(); const p = Input.pressedOnce("x");
        Camera.follow(0, 0, 0.1); Camera.lookAt(0, 0); Camera.clampTo(-100, -100, 100, 100); Camera.shake(3); Camera.setZoom(100);
        Camera.place(0, 0); Camera.placeScaled(0, 0, 100);
        const mwx = Camera.mouseWorldX(); const mwy = Camera.mouseWorldY(); const tx = Camera.toScreenX(0); const ty = Camera.toScreenY(0);
        ThreeD.setFov(300); ThreeD.moveForward(1); ThreeD.strafe(1); ThreeD.cube(0, 0, 0, 10); ThreeD.grid(0, 10, 4);
        ThreeD.triangle3d(0, 0, 0, 10, 0, 0, 0, 10, 0); ThreeD.placeSprite(0, 0, 0, 100);
        Draw.rect(0, 0, 10, 10, "#ff0000"); Draw.outline(0, 0, 10, 10, 2, "#00ff00"); Draw.circle(0, 0, 5, "#0000ff");
        Draw.line(0, 0, 5, 5, 2, "#000000"); Draw.bar(-50, 0, 100, 10, 0.5, "#00ff00", "#333333");
        Particles.burst(0, 0, 3, 2, 10, 0.1);
        Net.sendMessage("hello"); const pm = Net.pollMessage();
      });
      onClone(() => Particles.run());`,
  });
  assert.deepEqual(res.diagnostics, [], JSON.stringify(res.diagnostics, null, 1));
});
