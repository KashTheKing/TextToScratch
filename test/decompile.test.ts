import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { build, decompile, emptyProject, newSprite, Sb3, writeSb3 } from "../src/compiler";
import { libs, VM } from "./helpers";

// ---------- helpers ----------

/** An example project's sources and asset files, read like the CLI does. */
function loadExample(dir: string) {
  const src = path.join(dir, "src");
  const sources: Record<string, string> = {};
  const images: Record<string, Uint8Array> = {};
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith(".ts")) sources[e.name] = fs.readFileSync(path.join(src, e.name), "utf8");
    else if (e.isDirectory() && e.name === "lib") for (const f of fs.readdirSync(path.join(src, "lib"))) sources[`lib/${f}`] = fs.readFileSync(path.join(src, "lib", f), "utf8");
    else if (e.isDirectory()) for (const f of fs.readdirSync(path.join(src, e.name))) if (/\.(png|svg|jpe?g|wav|mp3)$/i.test(f)) images[`${e.name}/${f}`] = fs.readFileSync(path.join(src, e.name, f));
  }
  return { sources, images };
}

/** Load a project into a headless VM, click the flag and run `frames` steps. */
async function runSb3(sb3: Sb3, frames = 60) {
  const vm = new VM();
  await vm.loadProject(Buffer.from(await writeSb3(sb3)));
  vm.runtime.currentStepTime = 1000 / 30;
  vm.greenFlag();
  for (let i = 0; i < frames; i++) vm.runtime._step();
  return vm;
}

/** Variable and list values by name across all targets, plus sprite positions. */
function snapshot(vm: any) {
  const out: Record<string, any> = {};
  for (const t of vm.runtime.targets.filter((t: any) => t.isOriginal)) {
    for (const v of Object.values(t.variables) as any[]) out[`${t.getName()}.${v.name}`] = Array.isArray(v.value) ? v.value.map(String) : String(v.value);
    if (!t.isStage) out[`${t.getName()}@`] = [t.x, t.y];
  }
  return out;
}

/** A tiny block builder for hand-made Scratch projects. */
function blocks() {
  const all: Record<string, any> = {};
  let n = 0;
  const input = (v: any) => (typeof v === "number" ? [1, [4, String(v)]] : typeof v === "string" ? [1, [10, v]] : v);
  const B = (opcode: string, inputs: Record<string, any> = {}, fields: Record<string, any> = {}, extra: any = {}) => {
    const id = "b" + n++;
    all[id] = { opcode, next: null, parent: null, inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, input(v)])), fields, shadow: false, topLevel: false, ...extra };
    return id;
  };
  return {
    all,
    B,
    R: (id: string) => [3, id, [10, ""]], // reporter in a round slot
    C: (id: string | null) => [2, id], // boolean slot / substack
    V: (name: string) => [3, [12, name, "v_" + name], [10, ""]],
    vf: (name: string) => ({ VARIABLE: [name, "v_" + name] }),
    lf: (name: string) => ({ LIST: [name, "l_" + name] }),
    /** Link blocks into a stack; the first one becomes a top-level script at y. */
    seq: (y: number | null, ...ids: string[]) => {
      ids.forEach((id, i) => { all[id].next = ids[i + 1] ?? null; if (i) all[id].parent = ids[i - 1]; });
      if (y !== null) Object.assign(all[ids[0]], { topLevel: true, x: 0, y });
      return ids[0];
    },
  };
}

/** Decompile, check the result builds cleanly, and return the rebuilt project. */
function roundTrip(sb3: Sb3) {
  const d = decompile(sb3.json);
  const res = build({ sources: d.sources, base: sb3 }, libs);
  assert.deepEqual(res.diagnostics, [], JSON.stringify(res.diagnostics, null, 1) + "\n" + Object.values(d.sources).join("\n"));
  return { d, sb3: res.sb3! };
}

// ---------- tests ----------

const EXAMPLES = fs.readdirSync(path.join(__dirname, "..", "examples")).filter((e) => e !== "dead-zone" && fs.existsSync(path.join(__dirname, "..", "examples", e, "src")));
for (const ex of EXAMPLES) {
  test(`round trip: examples/${ex} decompiles to code that builds`, () => {
    const { sources, images } = loadExample(path.join(__dirname, "..", "examples", ex));
    const first = build({ sources, images, base: emptyProject() }, libs);
    assert.deepEqual(first.diagnostics, []);
    const { d } = roundTrip(first.sb3!);
    assert.deepEqual(d.warnings, []);
  });
}

test("compiled code decompiles to code that behaves the same", async () => {
  const first = build({
    base: emptyProject(),
    sources: {
      "Stage.ts": `export const game = { out: "", total: 0, items: [] as number[] };`,
      "Hero.ts": `
        import { game } from "./Stage";
        let n = 0;
        /** @warp */
        function addUp(k: number, twice: boolean) {
          for (let i = 1; i <= k; i++) game.total += twice ? i * 2 : i;
        }
        whenFlag(() => {
          game.items = [4, 5, 6];
          game.items.insert(1, 9);
          game.items.remove(0);
          addUp(4, true);
          n = game.items.indexOf(5) + game.items.length;
          game.out = \`\${n}:\${game.items[0]}:\${"hello"[1]}:\${Math.round(7 % 3 * 2.5)}:\${-n}\`;
          goTo(10, 20);
          me.x += n;
        });`,
    },
  }, libs);
  assert.deepEqual(first.diagnostics, []);
  const before = snapshot(await runSb3(first.sb3!));
  const after = snapshot(await runSb3(roundTrip(first.sb3!).sb3));
  assert.equal(before["Stage.out"], "4:9:e:3:-4");
  assert.deepEqual(after, before);
});

test("hand-made Scratch blocks decompile, rebuild and produce the same values", async () => {
  const { all, B, R, C, V, vf, lf, seq } = blocks();
  // custom block: add (word) (times) times <loud>
  const proccode = "add %s times %n if %b";
  const ids = ["a1", "a2", "a3"];
  const arg = (name: string, bool = false) => B(bool ? "argument_reporter_boolean" : "argument_reporter_string_number", {}, { VALUE: [name, null] });
  const proto = B("procedures_prototype", Object.fromEntries(ids.map((id, i) => [id, [1, arg(["word", "times", "loud"][i], i === 2)]])), {}, {
    shadow: true, mutation: { tagName: "mutation", children: [], proccode, argumentids: JSON.stringify(ids), argumentnames: '["word","times","loud"]', argumentdefaults: '["","",false]', warp: "true" },
  });
  Object.values(all).forEach((b) => b.opcode.startsWith("argument") && (b.shadow = true));
  const def = B("procedures_definition", { custom_block: [1, proto] });
  const loop = B("control_repeat", { TIMES: R(arg("times")), SUBSTACK: C(seq(null, B("data_addtolist", { ITEM: R(arg("word")) }, lf("items")))) });
  const ifLoud = B("control_if", { CONDITION: C(arg("loud", true)), SUBSTACK: C(seq(null, B("data_changevariableby", { VALUE: R(arg("times")) }, vf("my count")))) });
  seq(200, def, loop, ifLoud);

  const call = B("procedures_call", { a1: "w", a2: 3, a3: C(B("operator_lt", { OPERAND1: 1, OPERAND2: 2 })) }, {}, { mutation: { tagName: "mutation", children: [], proccode, argumentids: JSON.stringify(ids), warp: "true" } });
  const join = B("operator_join", { STRING1: "n=", STRING2: R(B("data_lengthoflist", {}, lf("items"))) });
  seq(0,
    B("event_whenflagclicked"),
    B("data_deletealloflist", {}, lf("items")),
    B("data_setvariableto", { VALUE: 0 }, vf("my count")),
    B("control_repeat", { TIMES: 3, SUBSTACK: C(seq(null,
      B("data_addtolist", { ITEM: R(B("operator_join", { STRING1: "a", STRING2: V("my count") })) }, lf("items")),
      B("data_changevariableby", { VALUE: 2 }, vf("my count")),
    )) }),
    call,
    B("control_if_else", {
      CONDITION: C(B("operator_gt", { OPERAND1: V("my count"), OPERAND2: 5 })),
      SUBSTACK: C(seq(null, B("data_setvariableto", { VALUE: "big" }, vf("result")))),
      SUBSTACK2: C(seq(null, B("data_setvariableto", { VALUE: "small" }, vf("result")))),
    }),
    B("data_insertatlist", { ITEM: "z", INDEX: [1, [7, "1"]] }, lf("items")),
    B("data_replaceitemoflist", { ITEM: "end", INDEX: [1, [7, "last"]] }, lf("items")),
    B("data_deleteoflist", { INDEX: [1, [7, "2"]] }, lf("items")),
    B("data_setvariableto", { VALUE: R(B("data_itemoflist", { INDEX: [1, [7, "2"]] }, lf("items"))) }, vf("second")),
    B("data_setvariableto", { VALUE: R(B("data_itemnumoflist", { ITEM: "w" }, lf("items"))) }, vf("idx")),
    B("data_setvariableto", { VALUE: R(B("operator_letter_of", { LETTER: [1, [6, "2"]], STRING: "hello" })) }, vf("letter")),
    B("data_setvariableto", { VALUE: R(B("operator_round", { NUM: R(B("operator_multiply", { NUM1: R(B("operator_mod", { NUM1: 7, NUM2: 3 })), NUM2: 2.5 })) })) }, vf("m")),
    B("control_repeat_until", { CONDITION: C(B("operator_gt", { OPERAND1: V("counter"), OPERAND2: 3 })), SUBSTACK: C(seq(null, B("data_changevariableby", { VALUE: 1 }, vf("counter")))) }),
    B("data_setvariableto", { VALUE: R(join) }, vf("summary")),
    B("motion_gotoxy", { X: 10, Y: 20 }),
    B("motion_changexby", { DX: R(B("data_lengthoflist", {}, lf("items"))) }),
    B("control_clear_counter"), // a block the dialect lacks: becomes a comment + warning
  );

  const sb3 = emptyProject();
  const s = newSprite("Sprite 1", 1);
  s.target.blocks = all;
  s.target.variables = { "v_my count": ["my count", 0] } as any;
  sb3.json.targets.push(s.target);
  sb3.files[s.file[0]] = s.file[1];
  const stage = sb3.json.targets[0];
  stage.variables = Object.fromEntries(["result", "second", "idx", "letter", "m", "counter", "summary"].map((n) => ["v_" + n, [n, 0]]));
  stage.lists = { l_items: ["items", []] };

  const before = snapshot(await runSb3(sb3));
  const { d, sb3: rebuilt } = roundTrip(sb3);
  const after = snapshot(await runSb3(rebuilt));
  assert.equal(before["Stage.summary"], "n=6");
  for (const k of ["result", "second", "idx", "letter", "m", "counter", "summary", "items"]) assert.deepEqual(after["Stage." + k], before["Stage." + k], k);
  assert.deepEqual(after["Sprite 1@"], before["Sprite 1@"]);
  assert.equal(after["Sprite 1.myCount"], before["Sprite 1.my count"]);

  const code = d.sources["Sprite 1.ts"];
  assert.match(code, /\/\*\* @warp \*\/\nfunction addTimesIf\(word: string, times: number, loud: boolean\)/);
  assert.match(code, /let myCount = 0; \/\/ "my count"/);
  assert.match(code, /game\.items\.insert\(0, "z"\);/);
  assert.match(code, /game\.items\[game\.items\.length - 1\] = "end";/);
  assert.match(code, /while \(!\(game\.counter > 3\)\)|while \(game\.counter <= 3\)/);
  assert.match(code, /\/\/ unsupported: control_clear_counter/);
  assert.equal(d.warnings.length, 1);
  assert.match(d.warnings[0], /^Sprite 1\.ts:\d+: unsupported block 'control_clear_counter'/);
});

test("unknown hats, loose stacks and odd names never crash", () => {
  const { all, B, seq } = blocks();
  seq(0, B("event_whentouchingobject", { TOUCHINGOBJECTMENU: "_mouse_" }), B("looks_nextcostume"));
  seq(100, B("motion_movesteps", { STEPS: 10 })); // loose: never runs
  seq(200, B("event_whenkeypressed", {}, { KEY_OPTION: ["enter", null] }), B("weird_block"));
  const sb3 = emptyProject();
  const s = newSprite("2 cool/sprite", 1);
  s.target.blocks = all;
  s.target.variables = { a: ["class", 1], b: ["class", "x"], c: ["☺", true] } as any;
  sb3.json.targets.push(s.target);
  const d = decompile(sb3.json);
  const code = d.sources["2 cool_sprite.ts"];
  assert.match(code, /function unsupportedEvent_whentouchingobject\(\)/);
  assert.match(code, /whenKey\(\("enter" as any\), \(\) => \{/);
  assert.match(code, /let class2 = 1;/);
  assert.equal(d.warnings.length, 4, d.warnings.join("\n"));
  const res = build({ sources: d.sources, base: sb3 }, libs);
  assert.deepEqual(res.diagnostics, []);
});
