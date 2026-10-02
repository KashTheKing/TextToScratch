// Builds the CLI (dist/cli.js) and the editor/extension bundle (extension/build/editor.js + vendored Monaco).
import { build } from "esbuild";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const watch = process.argv.includes("--watch");

await build({ entryPoints: ["src/cli.ts"], bundle: true, platform: "node", format: "cjs", outfile: "dist/cli.js", packages: "external" });

const editor = {
  entryPoints: ["extension/editor.ts"],
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: "extension/build/editor.js",
  minify: !watch,
  external: ["fs", "path", "os", "crypto", "perf_hooks", "inspector", "source-map-support", "buffer"],
  define: {
    __ES5__: JSON.stringify(fs.readFileSync(require.resolve("typescript/lib/lib.es5.d.ts"), "utf8")),
    __SCRATCH__: JSON.stringify(fs.readFileSync("lib/scratch.d.ts", "utf8")),
    __ENGINE__: JSON.stringify(Object.fromEntries(fs.readdirSync("lib/engine").map((f) => [f, fs.readFileSync(`lib/engine/${f}`, "utf8")]))),
    // Monaco's hashed worker files, loaded directly (extension CSP forbids its default blob: workers)
    __WORKERS__: JSON.stringify(Object.fromEntries(fs.readdirSync("node_modules/monaco-editor/min/vs/assets").map((f) => [f.split(".worker")[0], f]))),
  },
  logOverride: { "require-resolve-not-external": "silent", "unsupported-require-call": "silent" },
};
await build(editor);

fs.cpSync("node_modules/monaco-editor/min/vs", "extension/vendor/vs", { recursive: true });
console.log("Built dist/cli.js and extension/");
