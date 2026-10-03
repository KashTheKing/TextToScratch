// Builds the VS Code extension: dist/extension.js (host, with the TextToScratch compiler bundled),
// media/vendor/ (scratch-vm, scratch-render, scratch-storage, scratch-svg-renderer, scratch-audio for the viewer; scratch-blocks for the blocks view),
// lib/ (typings) and templates/ (examples as New Project templates).
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const require = createRequire(path.join(root, "package.json"));
const at = (...p) => path.join(here, ...p);

await build({
  entryPoints: [at("src/extension.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile: at("dist/extension.js"),
  external: ["vscode"],
  minify: true,
  logOverride: { "require-resolve-not-external": "silent" },
});

// scratch-audio only ships a CommonJS build: bundle it as a browser global
await build({
  stdin: { contents: "window.AudioEngine = require('scratch-audio/dist.js');", resolveDir: root },
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: at("media/vendor/scratch-audio.js"),
  minify: true,
});

const vendor = at("media/vendor");
for (const p of ["scratch-vm/dist/web/scratch-vm.js", "scratch-render/dist/web/scratch-render.js", "scratch-storage/dist/web/scratch-storage.js", "scratch-svg-renderer/dist/web/scratch-svg-renderer.js"])
  fs.copyFileSync(path.join(root, "node_modules", p), path.join(vendor, path.basename(p)));
// scratch-blocks (vertical build, sets window.Blockly) and its media/ (sprites, icons) for the blocks view
fs.copyFileSync(path.join(root, "node_modules/scratch-blocks/dist/web/vertical.js"), path.join(vendor, "scratch-blocks.js"));
fs.rmSync(path.join(vendor, "blocks-media"), { recursive: true, force: true });
fs.cpSync(path.join(root, "node_modules/scratch-blocks/media"), path.join(vendor, "blocks-media"), { recursive: true });

fs.rmSync(at("lib"), { recursive: true, force: true });
fs.cpSync(path.join(root, "lib"), at("lib"), { recursive: true });
fs.copyFileSync(require.resolve("typescript/lib/lib.es5.d.ts"), at("lib/lib.es5.d.ts"));

fs.rmSync(at("templates"), { recursive: true, force: true });
for (const ex of fs.readdirSync(path.join(root, "examples")))
  if (fs.existsSync(path.join(root, "examples", ex, "src")))
    fs.cpSync(path.join(root, "examples", ex, "src"), at("templates", ex, "src"), { recursive: true });

console.log("Built vscode/");

// docs/ (the website's Markdown docs, opened in VS Code's Markdown preview: no website needed)
fs.rmSync(at("docs"), { recursive: true, force: true });
fs.cpSync(path.join(root, "website/docs"), at("docs"), { recursive: true });
