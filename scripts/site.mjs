// Builds the docs site (website/build): bundles the web editor and example projects into its static files.
// `node scripts/site.mjs --deploy` then copies it to ../kashtheking.github.io/text-to-scratch.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const run = (cmd, cwd = ".") => execSync(cmd, { cwd, stdio: "inherit" });
const copy = (from, to) => fs.cpSync(from, to, { recursive: true });

run("node scripts/build.mjs");
const EXAMPLES = ["platformer", "catcher", "engine-demo", "3d-demo", "multiplayer"];
for (const ex of EXAMPLES) run(`node dist/cli.js build examples/${ex}`);

const s = "website/static";
fs.rmSync(`${s}/editor`, { recursive: true, force: true });
fs.mkdirSync(`${s}/examples`, { recursive: true });
// cache-bust the bundle: GitHub Pages caches for 10 minutes
const html = fs.readFileSync("extension/editor.html", "utf8").replace("build/editor.js", `build/editor.js?v=${Date.now()}`);
fs.mkdirSync(`${s}/editor`, { recursive: true });
fs.writeFileSync(`${s}/editor/index.html`, html);
copy("extension/editor.css", `${s}/editor/editor.css`);
copy("extension/build/editor.js", `${s}/editor/build/editor.js`);
copy("extension/vendor", `${s}/editor/vendor`);
for (const ex of EXAMPLES) copy(`examples/${ex}/dist/${ex}.sb3`, `${s}/examples/${ex}.sb3`);
// Block Puzzle lives in its own repo next to this one
if (fs.existsSync("../block-puzzle")) {
  run("node ../TextToScratch/dist/cli.js build .", "../block-puzzle");
  copy("../block-puzzle/dist/block-puzzle.sb3", `${s}/examples/block-puzzle.sb3`);
}

// downloadable extension (unpacked-loadable folder, zipped)
const JSZip = (await import("jszip")).default;
const zip = new JSZip();
const addDir = (dir, prefix) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) addDir(p, `${prefix}${e.name}/`);
    else if (!e.name.endsWith(".ts")) zip.file(prefix + e.name, fs.readFileSync(p));
  }
};
addDir("extension", "texttoscratch/");
fs.mkdirSync(`${s}/downloads`, { recursive: true });
fs.writeFileSync(`${s}/downloads/texttoscratch-extension.zip`, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));

run("npm run build", "website");

if (process.argv.includes("--deploy")) {
  const target = path.resolve("../kashtheking.github.io/text-to-scratch");
  fs.rmSync(target, { recursive: true, force: true });
  copy("website/build", target);
  console.log(`Copied to ${target}`);
}
