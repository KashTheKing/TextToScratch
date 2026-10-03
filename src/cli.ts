#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildDir, fetchScratchProject, importSb3, init, libs, scratchId } from "./node";

async function buildCmd(dir: string, out?: string) {
  const res = await buildDir(dir, libs(), out);
  for (const d of res.diagnostics) console.error(`${d.path}:${d.line}:${d.col} - error: ${d.message}`);
  if (res.target) console.log(`Built ${res.target}`);
  return res.ok;
}

async function main() {
  const [cmd = "help", ...rest] = process.argv.slice(2);
  const outIdx = rest.indexOf("--out");
  const out = outIdx >= 0 ? rest.splice(outIdx, 2)[1] : undefined;
  const dir = rest[0] ?? ".";
  if (cmd === "init") {
    init(dir);
    return console.log(`Created project in ${dir}. Put costume images and wav/mp3 sounds in src/<SpriteName>/, then run: tts build`);
  }
  if (cmd === "build") return void (process.exitCode = (await buildCmd(dir, out)) ? 0 : 1);
  if (cmd === "import") {
    const from = rest[0];
    if (!from) return console.error("usage: tts import <file.sb3 | scratch project url or id> [dir]");
    const id = fs.existsSync(from) ? null : scratchId(from);
    const target = rest[1] ?? (id ?? path.basename(from, ".sb3"));
    const { warnings } = await importSb3(id ? (await fetchScratchProject(id)).sb3 : fs.readFileSync(from), target);
    for (const w of warnings) console.warn(`warning: ${w}`);
    return console.log(`Imported into ${target}. Run: tts build ${target}`);
  }
  if (cmd === "watch") {
    await buildCmd(dir, out);
    let timer: NodeJS.Timeout | undefined;
    fs.watch(path.join(dir, "src"), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => buildCmd(dir, out).catch(console.error), 150);
    });
    return console.log("Watching src/ ...");
  }
  console.log(`TextToScratch
  tts init [dir]                 create a project
  tts build [dir] [--out file]   compile src/ (+ project.sb3 assets) to dist/<dir>.sb3
  tts watch [dir]                rebuild on change
  tts import <sb3|url> [dir]     turn an .sb3 or a shared Scratch project into a project folder`);
}

main().catch((e) => { console.error(e); process.exit(1); });
