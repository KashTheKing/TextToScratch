import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { build, emptyProject, writeSb3 } from "../src/compiler";

export const VM = require("scratch-vm");
const engineDir = path.join(__dirname, "..", "lib", "engine");
export const libs = {
  es5: fs.readFileSync(require.resolve("typescript/lib/lib.es5.d.ts"), "utf8"),
  scratch: fs.readFileSync(path.join(__dirname, "..", "lib", "scratch.d.ts"), "utf8"),
  engine: Object.fromEntries(fs.readdirSync(engineDir).map((f) => [f, fs.readFileSync(path.join(engineDir, f), "utf8")])),
};

export function compile(sources: Record<string, string>, images: Record<string, Uint8Array> = {}) {
  return build({ sources, images, base: emptyProject() }, libs);
}

/** A tiny SVG costume. */
export const svg = (color = "red") => new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="${color}"/></svg>`);

/** Compile, load into a headless VM, click the green flag and run `frames` steps (or for `ms` of real time). */
export async function run(sources: Record<string, string>, frames = 30, ms = 0, images: Record<string, Uint8Array> = {}) {
  const res = compile(sources, images);
  assert.deepEqual(res.diagnostics, [], JSON.stringify(res.diagnostics, null, 1));
  const vm = new VM();
  await vm.loadProject(Buffer.from(await writeSb3(res.sb3!)));
  vm.runtime.currentStepTime = 1000 / 30; // normally set by vm.start()
  vm.greenFlag();
  for (let i = 0; i < frames; i++) vm.runtime._step();
  for (const end = Date.now() + ms; Date.now() < end; ) {
    vm.runtime._step();
    await new Promise((r) => setTimeout(r, 10));
  }
  const stage = vm.runtime.getTargetForStage();
  const lookup = (target: any, name: string) => Object.values(target.variables).find((v: any) => v.name === name) as any;
  return {
    vm,
    res,
    g: (name: string) => lookup(stage, name)?.value,
    sprite: (name: string) => vm.runtime.getSpriteTargetByName(name),
    local: (sprite: string, name: string) => lookup(vm.runtime.getSpriteTargetByName(sprite), name)?.value,
  };
}
