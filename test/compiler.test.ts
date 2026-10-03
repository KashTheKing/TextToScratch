import { test } from "node:test";
import assert from "node:assert/strict";
import { build, emptyProject, sourcesOf, writeSb3 } from "../src/compiler";
import { compile, libs, run, VM } from "./helpers";

test("arithmetic, strings, ternary, Math", async () => {
  const r = await run({
    "Stage.ts": `
      export let a = 0; export let s = ""; export let t = 0; export let m = 0; export let b = false;
      const BASE = 10;
      whenFlag(() => {
        a = (BASE + 5) * 2 - 6 / 3;
        s = \`a=\${a}!\` + "x";
        t = a > 20 ? 1 : 2;
        m = Math.max(3, 7) + Math.min(3, 7) + Math.floor(2.7) + Math.abs(-4);
        b = s.includes("28") && !(a < 0);
        a %= 5;
      });`,
  });
  assert.equal(r.g("a"), 3);
  assert.equal(r.g("s"), "a=28!x");
  assert.equal(Number(r.g("t")), 1); // Scratch stores literal sets as text
  assert.equal(r.g("m"), 16);
  assert.equal(r.g("b"), true);
});

test("loops, procedures with return values, warp", async () => {
  const r = await run({
    "Stage.ts": `
      export let sum = 0; export let f = 0; export let w = 0;
      /** @warp */
      function fact(n: number): number {
        let acc = 1;
        for (let i = 2; i <= n; i++) acc *= i;
        return acc;
      }
      function add(x: number, y: number) { sum += x + y; }
      whenFlag(() => {
        repeat(3, () => { add(1, 2); });
        f = fact(5);
        let k = 0;
        while (k < 10) k += 3;
        w = k;
      });`,
  }, 60);
  assert.equal(r.g("sum"), 9);
  assert.equal(r.g("f"), 120);
  assert.equal(r.g("w"), 12);
});

test("lists", async () => {
  const r = await run({
    "Stage.ts": `
      export const items: number[] = [5, 6];
      export let out = "";
      whenFlag(() => {
        items.length = 0;
        items.push(1, 2, 3);
        items.insert(0, 9);
        items.remove(1);
        items[0] = items[0] + 1;
        out = \`\${items.length}:\${items[0]}:\${items.indexOf(3)}:\${items.includes(2)}\`;
      });`,
  });
  assert.equal(r.g("out"), "3:10:2:true");
});

test("sprites, motion, broadcasts, globals across files, clones", async () => {
  const r = await run({
    "Stage.ts": `export const game = { hits: 0, clones: 0 };`,
    "Player.ts": `
      import { game } from "./Stage";
      let local = 4;
      whenFlag(() => {
        goTo(10, 20);
        me.x += local;
        me.direction = 45;
        me.visible = false;
        broadcast("ping");
        createClone();
      });
      onMessage("ping", () => { game.hits++; });
      onClone(() => { game.clones += 1; deleteClone(); });`,
  }, 10);
  const p = r.sprite("Player");
  assert.equal(p.x, 14);
  assert.equal(p.y, 20);
  assert.equal(p.direction, 45);
  assert.equal(p.visible, false);
  assert.equal(r.g("hits"), 1);
  assert.equal(r.g("clones"), 1);
  assert.equal(r.local("Player", "local"), 4);
});

test("showVariable makes a visible monitor", async () => {
  const r = await run({ "Stage.ts": `export const game = { score: 7 }; whenFlag(() => { showVariable(game.score); });` }, 3);
  assert.equal(r.vm.runtime._monitorState.get("g_score")?.get("visible"), true);
});

test("image folders become costumes", async () => {
  const svg = (c: string) => new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="${c}"/></svg>`);
  const res = build({ sources: { "Hero.ts": `whenFlag(() => { switchCostume("walk"); });` }, images: { "Hero/idle.svg": svg("red"), "Hero/walk.svg": svg("blue") }, base: emptyProject() }, libs);
  assert.deepEqual(res.diagnostics, []);
  const hero = res.sb3!.json.targets.find((t: any) => t.name === "Hero");
  assert.deepEqual(hero.costumes.map((c: any) => [c.name, c.rotationCenterX, c.rotationCenterY]), [["idle", 10, 5], ["walk", 10, 5]]);
  // Scratch renders an SVG without a viewBox as 0x0, so one must be added
  assert.match(new TextDecoder().decode(res.sb3!.files[hero.costumes[0].md5ext]), /viewBox="0 0 20 10"/);
});

test("wav/mp3 files in a sprite folder become sounds", async () => {
  // 100 frames of 16-bit mono silence at 22050 Hz
  const wav = new Uint8Array(44 + 200);
  const dv = new DataView(wav.buffer);
  wav.set(new TextEncoder().encode("RIFF"), 0);
  dv.setUint32(4, 36 + 200, true);
  wav.set(new TextEncoder().encode("WAVEfmt "), 8);
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 22050, true); dv.setUint32(28, 44100, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  wav.set(new TextEncoder().encode("data"), 36);
  dv.setUint32(40, 200, true);
  const res = build({ sources: { "Hero.ts": `whenFlag(() => { playSound("jump"); });` }, images: { "Hero/jump.wav": wav }, base: emptyProject() }, libs);
  assert.deepEqual(res.diagnostics, []);
  const hero = res.sb3!.json.targets.find((t: any) => t.name === "Hero");
  assert.deepEqual(hero.sounds.map((s: any) => [s.name, s.dataFormat, s.rate, s.sampleCount]), [["jump", "wav", 22050, 100]]);
  const vm = new VM();
  await vm.loadProject(Buffer.from(await writeSb3(res.sb3!)));
  assert.equal(vm.runtime.getSpriteTargetByName("Hero").sprite.sounds[0].name, "jump");
  const bad = build({ sources: { "Hero.ts": `whenFlag(() => { playSound("jmup"); });` }, images: { "Hero/jump.wav": wav }, base: emptyProject() }, libs);
  assert.match(bad.diagnostics[0].message, /not assignable/);
});

test("large sources are split into comments Scratch accepts, and read back", async () => {
  const big = `// ${"x".repeat(20000)}\nwhenFlag(() => {});\n`;
  const res = compile({ "Stage.ts": big });
  const comments = Object.values(res.sb3!.json.targets[0].comments) as any[];
  assert.ok(comments.length >= 3 && comments.every((c) => c.text.length <= 8000));
  assert.deepEqual(sourcesOf(res.sb3!.json), { "Stage.ts": big });
  const vm = new VM();
  await vm.loadProject(Buffer.from(await writeSb3(res.sb3!))); // throws if Scratch's validator rejects it
});

test("loop/waitUntil conditions can call functions; initializers can use constants", async () => {
  const r = await run({
    "Stage.ts": `
      const START = 3;
      export let n = START;
      export let neg = -START;
      export const s = { count: 0, done: false };
      function below(x: number): boolean { return x < 10; }
      function ready(): boolean { return n >= 10; }
      whenFlag(() => {
        while (below(n)) { n++; s.count++; }
        for (let i = 0; below(i); i += 4) s.count += 100;
        waitUntil(() => ready());
        s.done = true;
      });`,
  });
  assert.equal(Number(r.g("n")), 10);
  assert.equal(Number(r.g("neg")), -3);
  assert.equal(Number(r.g("count")), 307); // 7 iterations + 3 for-loop iterations (0, 4, 8)
  assert.equal(String(r.g("done")), "true");
});

test("type errors and unsupported syntax are reported with positions", () => {
  const res = compile({ "Stage.ts": `whenFlag(() => { move("far"); });` });
  assert.equal(res.sb3, null);
  assert.match(res.diagnostics[0].message, /not assignable/);
  const res2 = compile({ "Stage.ts": `whenFlag(() => { while (true) { break; } });` });
  assert.match(res2.diagnostics[0].message, /break/);
  assert.equal(res2.diagnostics[0].line, 1);
  const res3 = compile({ "Stage.ts": `whenFlag(() => { switchCostume("nope"); });` });
  assert.match(res3.diagnostics[0].message, /not assignable/);
});

test("valueOf() reads another sprite's variable (not Object.prototype.valueOf)", async () => {
  const r = await run({
    "Stage.ts": `export const out = { v: 0 };`,
    "A.ts": `import { out } from "./Stage";\nwhenFlag(() => { wait(0.05); out.v = valueOf("B", "x y") as number; });`,
    "B.ts": `/** @name x y */ let xy = 7;`,
  });
  assert.equal(Number(r.g("v")), 7);
});

test("variables used as conditions follow Scratch truthiness and never sit in a hexagon slot", async () => {
  const src = `export const out = { r: "" };
let on = false; let n = 0; let s = "";
whenFlag(() => {
  out.r = "";
  on = true; if (on) out.r = out.r + "a"; if (!on) out.r = out.r + "X";
  on = false; if (!on) out.r = out.r + "b";
  n = 2; if (n) out.r = out.r + "c"; n = 0; if (!n) out.r = out.r + "d";
  s = "hi"; if (s) out.r = out.r + "e"; s = ""; if (!s) out.r = out.r + "f";
});`;
  const r = await run({ "Stage.ts": src });
  assert.equal(r.g("r"), "abcdef");
  const res = build({ sources: { "Stage.ts": src }, base: emptyProject() }, libs);
  const blocks: any = res.sb3!.json.targets[0].blocks;
  const hex = ["CONDITION", "OPERAND"];
  for (const b of Object.values(blocks) as any[])
    for (const k of hex) if (b.inputs?.[k]) assert.notEqual(blocks[b.inputs[k][1]]?.opcode, "data_variable", `${b.opcode}.${k}`);
});
