// File-system side of TextToScratch, shared by the CLI and the VS Code extension:
// project scaffolding, typings (.tts/), building a folder, and importing .sb3 files / shared Scratch projects.
import fs from "node:fs";
import path from "node:path";
import { build, decompile, Diag, emptyProject, IMAGE_EXT, Libs, readSb3, Sb3, sourcesOf, SOUND_EXT, typesFor, writeSb3 } from "./compiler";

/** lib/ next to the CLI's dist/; the VS Code extension passes its own copy. */
export const LIB_DIR = path.join(__dirname, "..", "lib");

export function libs(libDir = LIB_DIR): Libs {
  const engineDir = path.join(libDir, "engine");
  const es5 = path.join(libDir, "lib.es5.d.ts"); // bundled copy (extension); else TypeScript's own
  return {
    es5: fs.readFileSync(fs.existsSync(es5) ? es5 : require.resolve("typescript/lib/lib.es5.d.ts"), "utf8"),
    scratch: fs.readFileSync(path.join(libDir, "scratch.d.ts"), "utf8"),
    engine: Object.fromEntries(fs.readdirSync(engineDir).filter((f) => f.endsWith(".ts")).map((f) => [f, fs.readFileSync(path.join(engineDir, f), "utf8")])),
  };
}

export const STAGE = `// The stage. Exported state objects are global: every sprite can read and change them.
export const game = { score: 0 };

whenFlag(() => {
  game.score = 0;
  showVariable(game.score);
});
`;
export const SPRITE = `import { game } from "./Stage";

let speed = 5;

whenFlag(() => {
  goTo(0, 0);
  forever(() => {
    if (keyPressed("right arrow")) me.x += speed;
    if (keyPressed("left arrow")) me.x -= speed;
  });
});

whenClicked(() => {
  game.score++;
  say(\`Score: \${game.score}\`);
});
`;
export const NEW_SPRITE = `whenFlag(() => {
  goTo(0, 0);
});
`;
export const TSCONFIG = {
  // target ES2015 / no baseUrl: TypeScript 6 (VS Code's) reports ES5 and baseUrl as deprecated; lib stays ES5
  compilerOptions: { strict: true, noEmit: true, target: "ES2015", lib: ["ES5"], types: [], moduleDetection: "force", module: "ESNext", moduleResolution: "Bundler", paths: { "tts/*": ["./.tts/engine/*"] } },
  // .tts is listed file by file: TypeScript's include globs skip dot-folders
  files: [".tts/scratch.d.ts", ".tts/sprites.d.ts"],
  include: ["src"],
};

/** Create tsconfig.json, or add the .tts typings to one written by an older `tts init`. */
export function ensureTsconfig(dir: string) {
  const p = path.join(dir, "tsconfig.json");
  if (!fs.existsSync(p)) return fs.writeFileSync(p, JSON.stringify(TSCONFIG, null, 2) + "\n");
  let json: any;
  try { json = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return; } // has comments: leave it to the user
  const old = !json.files && json.include?.includes(".tts") && json.compilerOptions?.baseUrl === "." && json.compilerOptions?.target === "ES5";
  if (!old) return;
  json.files = TSCONFIG.files;
  json.include = json.include.filter((i: string) => i !== ".tts");
  json.compilerOptions = { ...json.compilerOptions, ...TSCONFIG.compilerOptions };
  delete json.compilerOptions.baseUrl;
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + "\n");
}

const writeNew = (p: string, s: string | Uint8Array) => {
  if (fs.existsSync(p)) return;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
};
const writeIfChanged = (p: string, s: string) => {
  if (fs.existsSync(p) && fs.readFileSync(p, "utf8") === s) return false;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
  return true;
};

/** Project files every TextToScratch folder needs (never overwrites). */
export function scaffold(dir: string) {
  ensureTsconfig(dir);
  writeNew(path.join(dir, ".gitignore"), "node_modules/\ndist/\n.tts/\n");
  const name = path.basename(path.resolve(dir)).toLowerCase().replace(/[^a-z0-9-_.]/g, "-");
  writeNew(path.join(dir, "package.json"), JSON.stringify({
    name, private: true,
    scripts: { build: "tts build", watch: "tts watch" },
    devDependencies: { texttoscratch: "github:TextToScratch/TextToScratch" },
  }, null, 2) + "\n");
}

export function init(dir: string) {
  writeNew(path.join(dir, "src", "Stage.ts"), STAGE);
  writeNew(path.join(dir, "src", "Player.ts"), SPRITE);
  fs.mkdirSync(path.join(dir, "src", "Stage"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src", "Player"), { recursive: true });
  scaffold(dir);
}

export interface DirInput { sources: Record<string, string>; images: Record<string, Uint8Array>; base: Sb3 }

/** Read src/*.ts, src/lib/*.ts, asset folders and project.sb3. */
export async function readDir(dir: string): Promise<DirInput> {
  const src = path.join(dir, "src");
  const sources: Record<string, string> = {};
  const images: Record<string, Uint8Array> = {};
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith(".ts")) sources[e.name] = fs.readFileSync(path.join(src, e.name), "utf8");
    // src/lib/*.ts: shared code any sprite can import
    if (e.isDirectory() && e.name === "lib") {
      for (const f of fs.readdirSync(path.join(src, "lib"))) if (f.endsWith(".ts")) sources[`lib/${f}`] = fs.readFileSync(path.join(src, "lib", f), "utf8");
      continue;
    }
    if (e.isDirectory())
      for (const f of fs.readdirSync(path.join(src, e.name)))
        if ([...IMAGE_EXT, ...SOUND_EXT].includes(f.split(".").pop()!.toLowerCase())) images[`${e.name}/${f}`] = fs.readFileSync(path.join(src, e.name, f));
  }
  const basePath = path.join(dir, "project.sb3");
  const base = fs.existsSync(basePath) ? await readSb3(fs.readFileSync(basePath)) : emptyProject();
  return { sources, images, base };
}

/** Write .tts/ (scratch.d.ts, engine/, sprites.d.ts). Only touches files whose content changed. */
export function writeTypings(dir: string, L: Libs, types: string) {
  writeIfChanged(path.join(dir, ".tts", "scratch.d.ts"), L.scratch);
  writeIfChanged(path.join(dir, ".tts", "sprites.d.ts"), types);
  for (const [f, s] of Object.entries(L.engine!)) writeIfChanged(path.join(dir, ".tts", "engine", f), s);
}

/** Refresh typings without compiling (sprite / costume / sound name unions). */
export async function updateTypings(dir: string, L: Libs) {
  const { sources, images, base } = await readDir(dir);
  const names = Object.keys(sources).filter((f) => !f.includes("/")).map((f) => f.replace(/\.ts$/, ""));
  writeTypings(dir, L, typesFor(base.json, [...names, ...Object.keys(images).map((p) => p.split("/")[0])], Object.keys(images)));
}

export interface DirBuild { ok: boolean; diagnostics: (Diag & { path: string })[]; target?: string; bytes?: Uint8Array }

/** Compile a project folder; writes typings and (on success) the .sb3 to `out` (default dist/<dir>.sb3). */
export async function buildDir(dir: string, L: Libs, out?: string): Promise<DirBuild> {
  const res = build(await readDir(dir), L);
  writeTypings(dir, L, res.types);
  const diagnostics = res.diagnostics.map((d) => ({ ...d, path: path.join(dir, d.file.replace(/^\//, "")) }));
  if (!res.sb3) return { ok: false, diagnostics };
  const target = out ?? path.join(dir, "dist", path.basename(path.resolve(dir)) + ".sb3");
  const bytes = await writeSb3(res.sb3);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  return { ok: true, diagnostics, target, bytes };
}

// ---------- import ----------

/** Scratch project id from "1387527973", ".../projects/1387527973/" etc., or null. */
export function scratchId(s: string): string | null {
  const m = s.trim().match(/^(?:https?:\/\/)?(?:www\.)?(?:scratch\.mit\.edu\/projects\/)?(\d{3,})\/?(?:[#?].*)?$/) ?? s.match(/scratch\.mit\.edu\/projects\/(\d+)/);
  return m ? m[1] : null;
}

export interface FetchProgress { step: "info" | "project" | "assets"; done: number; total: number; bytes: number }

/** Download a shared project (project.json + every asset) as an Sb3. `progress` is called as each piece arrives. */
export async function fetchScratchProject(id: string, progress?: (p: FetchProgress) => void): Promise<{ sb3: Sb3; title: string }> {
  let bytes = 0;
  const get = async (url: string) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}${r.status === 404 ? " (is the project shared?)" : ""}`);
    return r;
  };
  progress?.({ step: "info", done: 0, total: 0, bytes });
  const meta: any = await (await get(`https://api.scratch.mit.edu/projects/${id}`)).json();
  progress?.({ step: "project", done: 0, total: 0, bytes });
  const text = await (await get(`https://projects.scratch.mit.edu/${id}?token=${meta.project_token}`)).text();
  bytes += text.length;
  const json: any = JSON.parse(text);
  if (!json.targets) throw new Error("Only Scratch 3 projects can be imported");
  const files: Record<string, Uint8Array> = {};
  const assets = new Set<string>(json.targets.flatMap((t: any) => [...t.costumes, ...t.sounds].map((a: any) => a.md5ext)));
  let done = 0;
  progress?.({ step: "assets", done, total: assets.size, bytes });
  await Promise.all([...assets].map(async (a) => {
    files[a] = new Uint8Array(await (await get(`https://assets.scratch.mit.edu/internalapi/asset/${a}/get/`)).arrayBuffer());
    bytes += files[a].length;
    progress?.({ step: "assets", done: ++done, total: assets.size, bytes });
  }));
  return { sb3: { json, files }, title: meta.title ?? id };
}

const SAFE = /^[^<>:"/\\|?*\x00-\x1f]+$/;

/** Turn an .sb3 into a project folder: src/*.ts (stored TextToScratch sources, else decompiled), every costume and
 *  sound in its sprite's folder under its original name, and the original as project.sb3 so nothing is lost. */
export async function importSb3(data: Uint8Array | Sb3, dir: string): Promise<{ warnings: string[]; decompiled: boolean }> {
  const sb3 = data instanceof Uint8Array ? await readSb3(data) : data;
  const stored = sourcesOf(sb3.json);
  const { sources, warnings } = stored ? { sources: stored, warnings: [] as string[] } : decompile(sb3.json);
  for (const [f, s] of Object.entries(sources)) writeNew(path.join(dir, "src", f), s);
  for (const t of sb3.json.targets) {
    const folder = t.isStage ? "Stage" : String(t.name).replace(/[\/\\]/g, "_");
    if (!SAFE.test(folder)) { warnings.push(`Sprite '${t.name}': name can't be a folder; its assets stay in project.sb3 only`); continue; }
    fs.mkdirSync(path.join(dir, "src", folder), { recursive: true });
    for (const a of [...t.costumes, ...t.sounds]) {
      const bytes = sb3.files[a.md5ext];
      const ext = String(a.dataFormat ?? a.md5ext.split(".").pop()).toLowerCase();
      if (!bytes || ![...IMAGE_EXT, ...SOUND_EXT].includes(ext)) continue;
      if (!SAFE.test(a.name) || a.name.trim() !== a.name) { warnings.push(`${folder}: asset '${a.name}' can't be a file name; it stays in project.sb3 only`); continue; }
      writeNew(path.join(dir, "src", folder, `${a.name}.${ext}`), bytes);
    }
  }
  writeNew(path.join(dir, "project.sb3"), await writeSb3(sb3));
  scaffold(dir);
  return { warnings, decompiled: !stored };
}
