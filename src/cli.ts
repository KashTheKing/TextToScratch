#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { build, emptyProject, IMAGE_EXT, readSb3, SOUND_EXT, writeSb3, Libs } from "./compiler";

const ENGINE_DIR = path.join(__dirname, "..", "lib", "engine");
const libs = (): Libs => ({
  es5: fs.readFileSync(require.resolve("typescript/lib/lib.es5.d.ts"), "utf8"),
  scratch: fs.readFileSync(path.join(__dirname, "..", "lib", "scratch.d.ts"), "utf8"),
  engine: Object.fromEntries(fs.readdirSync(ENGINE_DIR).filter((f) => f.endsWith(".ts")).map((f) => [f, fs.readFileSync(path.join(ENGINE_DIR, f), "utf8")])),
});

const STAGE = `// The stage. Exported state objects are global: every sprite can read and change them.
export const game = { score: 0 };

whenFlag(() => {
  game.score = 0;
  showVariable(game.score);
});
`;
const SPRITE = `import { game } from "./Stage";

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
const TSCONFIG = {
  compilerOptions: { strict: true, noEmit: true, target: "ES5", lib: ["ES5"], types: [], moduleDetection: "force", module: "ESNext", moduleResolution: "Bundler", baseUrl: ".", paths: { "tts/*": [".tts/engine/*"] } },
  include: ["src", ".tts"],
};

function init(dir: string) {
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  const write = (f: string, s: string) => { const p = path.join(dir, f); if (!fs.existsSync(p)) fs.writeFileSync(p, s); };
  write("src/Stage.ts", STAGE);
  write("src/Player.ts", SPRITE);
  write("tsconfig.json", JSON.stringify(TSCONFIG, null, 2) + "\n");
  write(".gitignore", "node_modules/\ndist/\n.tts/\n");
  console.log(`Created project in ${dir}. Put costume images and wav/mp3 sounds in src/<SpriteName>/, then run: tts build`);
}

async function buildDir(dir: string, out?: string) {
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
  const L = libs();
  const res = build({ sources, images, base }, L);

  fs.mkdirSync(path.join(dir, ".tts"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".tts", "scratch.d.ts"), L.scratch);
  fs.writeFileSync(path.join(dir, ".tts", "sprites.d.ts"), res.types);
  fs.mkdirSync(path.join(dir, ".tts", "engine"), { recursive: true });
  for (const [f, s] of Object.entries(L.engine!)) fs.writeFileSync(path.join(dir, ".tts", "engine", f), s);

  for (const d of res.diagnostics) console.error(`${path.join(dir, d.file.replace(/^\//, ""))}:${d.line}:${d.col} - error: ${d.message}`);
  if (!res.sb3) return false;
  const target = out ?? path.join(dir, "dist", path.basename(path.resolve(dir)) + ".sb3");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, await writeSb3(res.sb3));
  console.log(`Built ${target}`);
  return true;
}

async function main() {
  const [cmd = "help", ...rest] = process.argv.slice(2);
  const outIdx = rest.indexOf("--out");
  const out = outIdx >= 0 ? rest.splice(outIdx, 2)[1] : undefined;
  const dir = rest[0] ?? ".";
  if (cmd === "init") return init(dir);
  if (cmd === "build") return void (process.exitCode = (await buildDir(dir, out)) ? 0 : 1);
  if (cmd === "watch") {
    await buildDir(dir, out);
    let timer: NodeJS.Timeout | undefined;
    fs.watch(path.join(dir, "src"), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => buildDir(dir, out).catch(console.error), 150);
    });
    return console.log("Watching src/ ...");
  }
  console.log(`TextToScratch
  tts init [dir]                 create a project
  tts build [dir] [--out file]   compile src/ (+ project.sb3 assets) to dist/<dir>.sb3
  tts watch [dir]                rebuild on change`);
}

main().catch((e) => { console.error(e); process.exit(1); });
