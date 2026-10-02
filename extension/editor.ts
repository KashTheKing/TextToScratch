// TextToScratch editor: Monaco + in-browser compiler. Runs standalone or embedded (iframe) in the Scratch editor.
import { build, emptyProject, IMAGE_EXT, readSb3, Sb3, SOUND_EXT, sourcesOf, typesFor, writeSb3, Diag } from "../src/compiler";

declare const __ES5__: string, __SCRATCH__: string, __WORKERS__: Record<string, string>;
declare const require: any;
const libs = { es5: __ES5__, scratch: __SCRATCH__ };
const embedded = window.parent !== window;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let monaco: any;
let editor: any;
let base: Sb3 = emptyProject();
let files: Record<string, string> = {};
let images: Record<string, Uint8Array> = {};
let current: string | null = null;
let lastBuild: Uint8Array | null = null;
const models = new Map<string, any>();

const SKELETON = (name: string) =>
  name === "Stage"
    ? `// The stage. Exported state objects are global: every sprite can use them.\nexport const game = { score: 0 };\n\nwhenFlag(() => {\n  game.score = 0;\n});\n`
    : `whenFlag(() => {\n  goTo(0, 0);\n});\n`;

// ---------- parent (Scratch page) bridge ----------
let reqId = 0;
const pending = new Map<number, (v: any) => void>();
window.addEventListener("message", (e) => {
  if (e.source !== window.parent || e.data?.tts !== "res") return;
  pending.get(e.data.id)?.(e.data);
  pending.delete(e.data.id);
});
function ask(cmd: string, data?: any): Promise<any> {
  const id = ++reqId;
  return new Promise((resolve, reject) => {
    pending.set(id, (r) => (r.error ? reject(new Error(r.error)) : resolve(r.data)));
    window.parent.postMessage({ tts: "req", id, cmd, data }, "*");
  });
}

// ---------- UI helpers ----------
function status(text: string, kind: "ok" | "err" | "" = "") {
  const s = $("status");
  s.textContent = text;
  s.className = "status " + kind;
}

const targetNames = () => {
  const names = new Set<string>(["Stage"]);
  base.json.targets.forEach((t: any) => !t.isStage && names.add(t.name));
  Object.keys(files).forEach((f) => names.add(f.replace(/\.ts$/, "")));
  Object.keys(images).forEach((p) => names.add(p.split("/")[0]));
  return [...names];
};

function thumbnail(name: string): string | null {
  const own = Object.entries(images).find(([p]) => p.split("/")[0] === name);
  if (own) return URL.createObjectURL(new Blob([own[1] as BlobPart], { type: own[0].endsWith(".svg") ? "image/svg+xml" : "image/" + own[0].split(".").pop() }));
  const t = base.json.targets.find((x: any) => (name === "Stage" ? x.isStage : x.name === name));
  const c = t?.costumes[t.currentCostume ?? 0];
  const data = c && base.files[c.md5ext];
  return data ? URL.createObjectURL(new Blob([data as BlobPart], { type: c.dataFormat === "svg" ? "image/svg+xml" : "image/" + c.dataFormat })) : null;
}

function renderTiles() {
  const tiles = $("tiles");
  tiles.replaceChildren();
  for (const name of targetNames()) {
    const file = name + ".ts";
    const tile = document.createElement("div");
    tile.className = "tile" + (current === file ? " selected" : "") + (files[file] === undefined ? " nocode" : "");
    tile.title = files[file] === undefined ? `${name}: no code yet (its blocks are kept). Click to start coding it.` : name;
    const src = thumbnail(name);
    if (src) tile.append(Object.assign(document.createElement("img"), { src, alt: "" }));
    tile.append(Object.assign(document.createElement("div"), { className: "name", textContent: name }));
    const added = Object.keys(images).filter((p) => p.split("/")[0] === name).length;
    if (added) tile.append(Object.assign(document.createElement("div"), { className: "badge", textContent: "+" + added, title: `${added} new costume/sound file(s)` }));
    if (files[file] !== undefined && name !== "Stage") {
      const del = Object.assign(document.createElement("button"), { className: "delete", textContent: "✕", title: "Delete this code file (sprite keeps its costumes)" });
      del.onclick = (e) => { e.stopPropagation(); if (confirm(`Delete ${file}?`)) removeFile(file); };
      tile.append(del);
    }
    tile.onclick = () => open(file);
    tile.ondragover = (e) => { e.preventDefault(); tile.classList.add("drop"); };
    tile.ondragleave = () => tile.classList.remove("drop");
    tile.ondrop = async (e) => {
      e.preventDefault();
      tile.classList.remove("drop");
      for (const f of Array.from(e.dataTransfer?.files ?? [])) {
        const ext = f.name.split(".").pop()!.toLowerCase();
        if ([...IMAGE_EXT, ...SOUND_EXT].includes(ext)) images[`${name}/${f.name}`] = new Uint8Array(await f.arrayBuffer());
      }
      refreshTypes();
      renderTiles();
      status(`Files added to ${name} — build to apply`);
    };
    tiles.append(tile);
  }
}

function renderTabs() {
  const tabs = $("tabs");
  tabs.replaceChildren();
  for (const file of Object.keys(files)) {
    const tab = Object.assign(document.createElement("div"), { className: "tab" + (file === current ? " active" : ""), textContent: file });
    tab.onclick = () => open(file);
    tabs.append(tab);
  }
}

// ---------- files / models ----------
const uri = (file: string) => monaco.Uri.parse("file:///src/" + file);

function modelFor(file: string) {
  let m = models.get(file);
  if (!m) {
    m = monaco.editor.getModel(uri(file)) ?? monaco.editor.createModel(files[file], "typescript", uri(file));
    m.onDidChangeContent(() => { files[file] = m.getValue(); });
    models.set(file, m);
  }
  return m;
}

function open(file: string) {
  if (files[file] === undefined) files[file] = SKELETON(file.replace(/\.ts$/, ""));
  current = file;
  editor.setModel(modelFor(file));
  editor.focus();
  renderTiles();
  renderTabs();
}

function removeFile(file: string) {
  models.get(file)?.dispose();
  models.delete(file);
  delete files[file];
  if (current === file) current = null;
  const next = Object.keys(files)[0];
  if (next) open(next);
  else { editor.setModel(null); renderTiles(); renderTabs(); }
}

let typesLib: any;
function refreshTypes() {
  const ts = monaco.typescript ?? monaco.languages.typescript;
  typesLib?.dispose();
  typesLib = ts.typescriptDefaults.addExtraLib(typesFor(base.json, targetNames(), Object.keys(images)), "file:///sprites.d.ts");
}

function loadProject(sb3: Sb3) {
  base = sb3;
  images = {};
  for (const m of models.values()) m.dispose();
  models.clear();
  files = sourcesOf(sb3.json) ?? {};
  current = null;
  refreshTypes();
  Object.keys(files).forEach(modelFor); // every file needs a model so cross-file imports resolve
  const first = Object.keys(files)[0];
  if (first) open(first);
  else { editor.setModel(null); renderTiles(); renderTabs(); }
}

// ---------- build ----------
function showProblems(diags: Diag[]) {
  const box = $("problems");
  box.replaceChildren();
  for (const m of models.values()) monaco.editor.setModelMarkers(m, "tts", []);
  const byFile = new Map<string, any[]>();
  for (const d of diags) {
    const file = d.file.replace(/^\/src\//, "");
    const row = document.createElement("div");
    row.className = "problem";
    row.innerHTML = `<b>${file}:${d.line}:${d.col}</b> `;
    row.append(d.message);
    row.onclick = () => {
      if (!files[file]) return;
      open(file);
      editor.setPosition({ lineNumber: d.line, column: d.col });
      editor.revealLineInCenter(d.line);
    };
    box.append(row);
    if (files[file] !== undefined) {
      const list = byFile.get(file) ?? [];
      list.push({ severity: monaco.MarkerSeverity.Error, message: d.message, startLineNumber: d.line, startColumn: d.col, endLineNumber: d.line, endColumn: d.col + 1 });
      byFile.set(file, list);
    }
  }
  for (const [file, markers] of byFile) monaco.editor.setModelMarkers(modelFor(file), "tts", markers);
}

async function doBuild(run: boolean) {
  status("Building…");
  try {
    // re-read the live project so costumes drawn in Scratch since the last build are kept
    if (embedded) base = await readSb3(await ask("get"));
    const res = build({ sources: files, images, base }, libs);
    showProblems(res.diagnostics);
    if (!res.sb3) return status(`${res.diagnostics.length} problem(s)`, "err");
    lastBuild = await writeSb3(res.sb3);
    base = res.sb3;
    images = {};
    refreshTypes();
    renderTiles();
    if (embedded) await ask("load", { data: lastBuild.slice().buffer, run });
    status(run ? "Running ✓" : "Built ✓", "ok");
  } catch (e: any) {
    console.error(e);
    status("Error: " + e.message, "err");
  }
}

function download() {
  if (!lastBuild) return status("Build first", "err");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lastBuild as BlobPart], { type: "application/x.scratch.sb3" }));
  a.download = "project.sb3";
  a.click();
}

// ---------- boot ----------
function defineTheme() {
  // Token colours borrowed from the Scratch block categories.
  monaco.editor.defineTheme("scratch", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "9966FF", fontStyle: "bold" },
      { token: "identifier", foreground: "575E75" },
      { token: "string", foreground: "389438" },
      { token: "number", foreground: "DB6E00" },
      { token: "comment", foreground: "8A8FA3", fontStyle: "italic" },
      { token: "type.identifier", foreground: "4C97FF" },
      { token: "delimiter", foreground: "575E75" },
    ],
    colors: {
      "editor.background": "#FFFFFF",
      "editor.foreground": "#575E75",
      "editorLineNumber.foreground": "#B8BCCC",
      "editorLineNumber.activeForeground": "#855CD6",
      "editor.selectionBackground": "#D9E8FF",
      "editor.lineHighlightBackground": "#F5F8FF",
      "editorCursor.foreground": "#855CD6",
      "editorIndentGuide.background1": "#EEF0F5",
    },
  });
}

function boot() {
  require.config({ paths: { vs: "vendor/vs" } });
  require(["vs/editor/editor.main"], () => {
    monaco = (window as any).monaco;
    (self as any).MonacoEnvironment = {
      getWorker: (_: string, label: string) =>
        new Worker("vendor/vs/assets/" + __WORKERS__[label === "typescript" || label === "javascript" ? "ts" : "editor"], { name: label }),
    };
    const ts = monaco.typescript ?? monaco.languages.typescript;
    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES5, lib: ["lib.es5.d.ts"], // raw option: file name, not the tsconfig alias strict: true, noEmit: true, moduleDetection: 3,
      module: ts.ModuleKind.ESNext, moduleResolution: 100, allowNonTsExtensions: true, types: [],
    });
    ts.typescriptDefaults.setEagerModelSync(true);
    ts.typescriptDefaults.addExtraLib(libs.scratch, "file:///scratch.d.ts");
    defineTheme();
    editor = monaco.editor.create($("monaco"), {
      theme: "scratch", automaticLayout: true, fontSize: 14, minimap: { enabled: false },
      fontFamily: "Menlo, Consolas, 'Courier New', monospace", tabSize: 2, scrollBeyondLastLine: false,
      roundedSelection: true, padding: { top: 8 },
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => doBuild(true));
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => doBuild(false));
    if (embedded) {
      document.body.classList.add("embedded");
      ask("get").then(readSb3).then(loadProject).catch((e) => status("Couldn't read project: " + e.message, "err"));
    } else {
      loadProject(emptyProject());
      open("Stage.ts");
    }
  });
}

$("build").onclick = () => doBuild(false);
$("run").onclick = () => doBuild(true);
$("stop").onclick = () => (embedded ? ask("stop") : undefined);
$("download").onclick = download;
$("close").onclick = () => window.parent.postMessage({ tts: "close" }, "*");
$("add").onclick = () => {
  const name = prompt("Sprite name:")?.trim();
  if (!name) return;
  if (!/^[\w ]+$/.test(name)) return alert("Use letters, numbers, spaces and _ only.");
  open(name + ".ts");
  refreshTypes();
};
($("open") as HTMLInputElement).onchange = async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) loadProject(await readSb3(new Uint8Array(await f.arrayBuffer())));
};
window.addEventListener("load", boot);
