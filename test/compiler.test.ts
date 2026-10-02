import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { build, emptyProject, writeSb3 } from "../src/compiler";

const VM = require("scratch-vm");
const libs = {
  es5: fs.readFileSync(require.resolve("typescript/lib/lib.es5.d.ts"), "utf8"),
  scratch: fs.readFileSync(path.join(__dirname, "..", "lib", "scratch.d.ts"), "utf8"),
};

function compile(sources: Record<string, string>) {
  const res = build({ sources, base: emptyProject() }, libs);
  return res;
}

/** Compile, load into a headless VM, click the green flag and run `frames` steps. */
async function run(sources: Record<string, string>, frames = 30) {
  const res = compile(sources);
  assert.deepEqual(res.diagnostics, [], JSON.stringify(res.diagnostics, null, 1));
  const vm = new VM();
  await vm.loadProject(Buffer.from(await writeSb3(res.sb3!)));
  vm.runtime.currentStepTime = 1000 / 30; // normally set by vm.start()
  vm.greenFlag();
  for (let i = 0; i < frames; i++) vm.runtime._step();
  const stage = vm.runtime.getTargetForStage();
  const lookup = (target: any, name: string) => Object.values(target.variables).find((v: any) => v.name === name) as any;
  return {
    vm,
    g: (name: string) => lookup(stage, name)?.value,
    sprite: (name: string) => vm.runtime.getSpriteTargetByName(name),
    local: (sprite: string, name: string) => lookup(vm.runtime.getSpriteTargetByName(sprite), name)?.value,
  };
}

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
