// TextToScratch for VS Code: typings + compiler diagnostics, a Scratch game viewer, project/import/export commands
// and a sprites view. All compiling goes through the same code as the `tts` CLI (src/node.ts).
import * as vscode from "vscode";
import fs from "node:fs";
import path from "node:path";
import { buildDir, DirBuild, fetchScratchProject, importSb3, init, libs, NEW_SPRITE, readDir, scaffold, scratchId, ensureTsconfig, updateTypings } from "../../src/node";
import { Libs, SOUND_EXT } from "../../src/compiler";

const DOCS = "https://github.com/KashTheKing/TextToScratch/blob/main/website/docs/vscode.md";
let ext: vscode.ExtensionContext;
let L: Libs;
let projects: string[] = [];
let active: string | undefined;
const diags = vscode.languages.createDiagnosticCollection("texttoscratch");
const importDiags = vscode.languages.createDiagnosticCollection("texttoscratch-import");
const lastBuild = new Map<string, DirBuild>();
let statusItem: vscode.StatusBarItem;
let tree: SpritesView;
const output = vscode.window.createOutputChannel("TextToScratch");
const cfg = () => vscode.workspace.getConfiguration("texttoscratch");

/** Exposed for the smoke test. */
export interface Api { projects(): string[]; build(dir?: string): Promise<DirBuild | undefined>; viewerMessages: any[] }
const viewerMessages: any[] = [];

export async function activate(context: vscode.ExtensionContext): Promise<Api> {
  ext = context;
  L = libs(path.join(context.extensionPath, "lib"));
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusItem.command = "texttoscratch.openViewer";
  tree = new SpritesView();
  const reg = (id: string, fn: (...a: any[]) => any) => context.subscriptions.push(vscode.commands.registerCommand("texttoscratch." + id, fn));
  reg("newProject", newProject);
  reg("importSb3", importProject);
  reg("build", async () => {
    const r = await runBuild(await pickProject());
    if (r?.ok) vscode.window.showInformationMessage(`Built ${vscode.workspace.asRelativePath(r.target!)}`);
  });
  reg("run", async () => { const dir = await pickProject(); if (dir) { Viewer.show(dir); await runBuild(dir, "run"); } });
  reg("openViewer", async () => { const dir = await pickProject(); if (dir) { Viewer.show(dir); await runBuild(dir, "build"); } });
  reg("openInScratch", openInScratch);
  reg("exportSb3", exportSb3);
  reg("addSprite", addSprite);
  reg("refresh", () => findProjects());
  reg("openDocs", () => vscode.env.openExternal(vscode.Uri.parse(DOCS)));
  context.subscriptions.push(
    diags, importDiags, statusItem, output,
    vscode.window.registerTreeDataProvider("texttoscratch.sprites", tree),
    vscode.window.registerWebviewPanelSerializer(Viewer.type, { deserializeWebviewPanel: async (panel) => Viewer.revive(panel) }),
    vscode.window.onDidChangeActiveTextEditor(() => setActive()),
    vscode.workspace.onDidChangeWorkspaceFolders(() => findProjects()),
    vscode.workspace.onDidSaveTextDocument(onSave),
    watcher(),
  );
  await findProjects();
  // a project created by New Project / Import before the window reloaded into it
  const open = context.globalState.get<string>("openViewer");
  if (open && projects.some((p) => same(p, open))) {
    context.globalState.update("openViewer", undefined);
    Viewer.show(open);
    runBuild(open, "run");
  }
  return { projects: () => projects, build: (dir) => runBuild(dir ?? active), viewerMessages };
}

export function deactivate() {}

const same = (a: string, b: string) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const inside = (file: string, dir: string) => !path.relative(dir, file).startsWith("..") && !path.isAbsolute(path.relative(dir, file));

// ---------------- projects ----------------

async function findProjects() {
  const found = await vscode.workspace.findFiles("{**/src/Stage.ts,**/.tts/scratch.d.ts}", "**/node_modules/**", 200);
  const dirs = new Set(found.map((u) => path.dirname(path.dirname(u.fsPath))));
  projects = [...dirs].filter((d) => fs.existsSync(path.join(d, "src"))).sort();
  await vscode.commands.executeCommand("setContext", "texttoscratch.hasProject", projects.length > 0);
  for (const p of projects) await ensureTypings(p);
  setActive();
  tree.refresh();
}

function setActive() {
  const file = vscode.window.activeTextEditor?.document.uri.fsPath;
  const owner = file && projects.filter((p) => inside(file, p)).sort((a, b) => b.length - a.length)[0];
  if (owner) active = owner;
  if (!active || !projects.includes(active)) active = projects[0];
  updateStatus();
}

async function pickProject(): Promise<string | undefined> {
  setActive();
  if (active) return active;
  const pick = await vscode.window.showInformationMessage("No TextToScratch project is open.", "New Project", "Import .sb3");
  if (pick === "New Project") newProject();
  if (pick === "Import .sb3") importProject();
}

/** IntelliSense out of the box: tsconfig + .tts/ typings, kept current. */
async function ensureTypings(dir: string) {
  ensureTsconfig(dir);
  try { await updateTypings(dir, L); } catch (e: any) { output.appendLine(`typings for ${dir}: ${e.message}`); }
}

// costume / sound / sprite files changed: refresh name unions and the sprites view
function watcher() {
  const w = vscode.workspace.createFileSystemWatcher("**/src/**");
  let timer: NodeJS.Timeout | undefined;
  const changed = (u: vscode.Uri) => {
    if (u.fsPath.includes("node_modules")) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (!projects.some((p) => inside(u.fsPath, p))) return findProjects();
      for (const p of projects) if (inside(u.fsPath, p)) await ensureTypings(p);
      tree.refresh();
    }, 250);
  };
  w.onDidCreate(changed);
  w.onDidDelete(changed);
  w.onDidChange((u) => { if (!u.fsPath.endsWith(".ts")) changed(u); }); // edited art/sounds
  return w;
}

let saveTimer: NodeJS.Timeout | undefined;
function onSave(doc: vscode.TextDocument) {
  const dir = projects.find((p) => inside(doc.uri.fsPath, path.join(p, "src")) || same(doc.uri.fsPath, path.join(p, "project.sb3")));
  if (!dir || !cfg().get("buildOnSave")) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => runBuild(dir, "save"), 300);
}

// ---------------- build ----------------

let building = false;
async function runBuild(dir: string | undefined, reason: "save" | "run" | "build" = "build"): Promise<DirBuild | undefined> {
  if (!dir) return;
  building = true;
  updateStatus();
  let res: DirBuild;
  try {
    res = await buildDir(dir, L);
  } catch (e: any) {
    res = { ok: false, diagnostics: [{ file: "", path: path.join(dir, "src"), line: 1, col: 1, message: String(e?.message ?? e) }] };
  }
  building = false;
  lastBuild.set(dir, res);
  // TypeScript errors are already shown by VS Code's TypeScript service; add only what the compiler alone sees
  const byFile = new Map<string, vscode.Diagnostic[]>();
  for (const d of res.diagnostics.filter((d) => d.code === undefined)) {
    const range = new vscode.Range(d.line - 1, d.col - 1, d.line - 1, d.col - 1 + 1);
    const diag = new vscode.Diagnostic(range, d.message, vscode.DiagnosticSeverity.Error);
    diag.source = "TextToScratch";
    byFile.set(d.path, [...(byFile.get(d.path) ?? []), diag]);
  }
  for (const [uri] of diags) if (inside(uri.fsPath, dir)) diags.delete(uri);
  for (const [f, list] of byFile) diags.set(vscode.Uri.file(f), widen(f, list));
  output.appendLine(`[${new Date().toLocaleTimeString()}] ${res.ok ? "Built " + res.target : `Build failed (${res.diagnostics.length} errors)`}`);
  for (const d of res.diagnostics) output.appendLine(`  ${d.path}:${d.line}:${d.col} ${d.message}`);
  updateStatus();
  tree.refresh();
  const v = Viewer.current;
  if (v && same(v.dir, dir)) {
    if (res.ok) v.post({ type: "load", bytes: res.bytes, reason, flag: reason !== "build" });
    else v.post({ type: "errors", messages: res.diagnostics.map((d) => `${path.relative(dir, d.path)}:${d.line}:${d.col}  ${d.message}`) });
  }
  return res;
}

/** Underline the identifier at each error position instead of one character. */
function widen(file: string, list: vscode.Diagnostic[]) {
  const doc = vscode.workspace.textDocuments.find((d) => same(d.uri.fsPath, file));
  if (!doc) return list;
  return list.map((d) => {
    const r = doc.getWordRangeAtPosition(d.range.start);
    if (r) d.range = r;
    return d;
  });
}

function updateStatus() {
  if (!active) return statusItem.hide();
  const res = lastBuild.get(active);
  const name = path.basename(active);
  if (building) statusItem.text = `$(sync~spin) ${name}`;
  else if (!res) statusItem.text = `$(play) ${name}`;
  else if (res.ok) statusItem.text = `$(check) ${name}`;
  else statusItem.text = `$(error) ${res.diagnostics.length}`;
  statusItem.tooltip = `TextToScratch: ${active}\n${res ? (res.ok ? "Build OK" : `${res.diagnostics.length} build error(s)`) : "Not built yet"}. Click to open the game viewer.`;
  statusItem.backgroundColor = res && !res.ok && !building ? new vscode.ThemeColor("statusBarItem.errorBackground") : undefined;
  statusItem.show();
}

// ---------------- viewer ----------------

class Viewer {
  static type = "texttoscratch.viewer";
  static current: Viewer | undefined;
  constructor(public panel: vscode.WebviewPanel, public dir: string) {
    const media = vscode.Uri.joinPath(ext.extensionUri, "media");
    panel.webview.options = { enableScripts: true, localResourceRoots: [media] };
    panel.iconPath = vscode.Uri.joinPath(media, "icon128.png");
    const uri = (f: string) => panel.webview.asWebviewUri(vscode.Uri.joinPath(media, f)).toString();
    panel.webview.html = fs.readFileSync(path.join(ext.extensionPath, "media", "viewer.html"), "utf8")
      .replace(/'self'/g, panel.webview.cspSource)
      .replace('href="viewer.css"', `href="${uri("viewer.css")}"`)
      .replace('src="viewer.js"', `src="${uri("viewer.js")}"`);
    panel.webview.onDidReceiveMessage((m) => {
      viewerMessages.push(m);
      if (m.type === "setting") cfg().update(m.key === "autoreload" ? "autoReload" : "keepRunning", m.value, vscode.ConfigurationTarget.Global);
      if (m.type === "error") output.appendLine("Viewer: " + m.message);
    });
    panel.onDidDispose(() => { if (Viewer.current === this) Viewer.current = undefined; });
  }
  post(m: any) { this.panel.webview.postMessage(m); }
  static show(dir: string) {
    if (Viewer.current) {
      Viewer.current.dir = dir;
      Viewer.current.panel.title = "Scratch: " + path.basename(dir);
      Viewer.current.panel.reveal(vscode.ViewColumn.Beside, true);
      return Viewer.current;
    }
    const panel = vscode.window.createWebviewPanel(Viewer.type, "Scratch: " + path.basename(dir), { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, { enableScripts: true, retainContextWhenHidden: true });
    return (Viewer.current = new Viewer(panel, dir));
  }
  static revive(panel: vscode.WebviewPanel) {
    if (!active) return panel.dispose();
    Viewer.current = new Viewer(panel, active);
    runBuild(active, "build");
  }
}

// ---------------- commands ----------------

async function chooseTarget(suggested: string): Promise<string | undefined> {
  const parent = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, openLabel: "Create project here", title: "Where should the project folder go?", defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri });
  if (!parent) return;
  const name = await vscode.window.showInputBox({ prompt: "Project folder name", value: suggested, validateInput: (v) => (/^[^<>:"/\\|?*]+$/.test(v) ? (fs.existsSync(path.join(parent[0].fsPath, v)) ? "That folder already exists" : null) : "Not a valid folder name") });
  return name ? path.join(parent[0].fsPath, name) : undefined;
}

async function newProject() {
  const templates = fs.readdirSync(path.join(ext.extensionPath, "templates"));
  const pick = await vscode.window.showQuickPick([
    { label: "$(file) Empty project", description: "Stage + a starter sprite", value: "empty" },
    { label: "$(cloud-download) From a Scratch project", description: ".sb3 file or scratch.mit.edu link", value: "import" },
    { label: "Templates", kind: vscode.QuickPickItemKind.Separator, value: "" },
    ...templates.map((t) => ({ label: "$(game) " + t, description: "example game", value: "t:" + t })),
  ], { title: "New TextToScratch project" });
  if (!pick) return;
  if (pick.value === "import") return importProject();
  const dir = await chooseTarget(pick.value === "empty" ? "my-game" : pick.value.slice(2));
  if (!dir) return;
  if (pick.value === "empty") init(dir);
  else {
    fs.cpSync(path.join(ext.extensionPath, "templates", pick.value.slice(2)), dir, { recursive: true });
    scaffold(dir);
  }
  await finishProject(dir, path.join(dir, "src", pick.value === "empty" ? "Player.ts" : "Stage.ts"));
}

async function importProject(from?: string, into?: string) {
  if (!from) {
    const pick = await vscode.window.showQuickPick([
      { label: "$(file) .sb3 file on this computer", value: "file" },
      { label: "$(globe) Shared project on scratch.mit.edu", description: "link or project id", value: "url" },
    ], { title: "Import a Scratch project" });
    if (!pick) return;
    if (pick.value === "file") {
      const f = await vscode.window.showOpenDialog({ filters: { "Scratch 3 project": ["sb3"] }, title: "Import .sb3" });
      from = f?.[0].fsPath;
    } else from = await vscode.window.showInputBox({ prompt: "Scratch project link or id", placeHolder: "https://scratch.mit.edu/projects/1387527973", validateInput: (v) => (scratchId(v) ? null : "Paste a scratch.mit.edu/projects/… link") });
    if (!from) return;
  }
  const id = fs.existsSync(from) ? null : scratchId(from);
  let data: any, title = id ? id : path.basename(from, path.extname(from));
  try {
    data = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: id ? "Downloading Scratch project…" : "Reading .sb3…" }, async () => {
      if (!id) return new Uint8Array(fs.readFileSync(from!));
      const r = await fetchScratchProject(id);
      title = r.title;
      return r.sb3;
    });
  } catch (e: any) {
    return vscode.window.showErrorMessage(`Import failed: ${e.message}`);
  }
  const dir = into ?? (await chooseTarget(title.replace(/[<>:"/\\|?*]/g, "").trim() || "scratch-project"));
  if (!dir) return;
  const { warnings, decompiled } = await importSb3(data, dir);
  showImportWarnings(dir, warnings);
  if (warnings.length) vscode.window.showWarningMessage(`Imported with ${warnings.length} decompiler warning(s): see the Problems panel.`);
  else vscode.window.showInformationMessage(decompiled ? "Imported: every script was decompiled to TypeScript." : "Imported the TextToScratch sources stored in the project.");
  await finishProject(dir, path.join(dir, "src", "Stage.ts"));
  return dir;
}

/** "Player.ts:12: msg" -> warning on that line */
function showImportWarnings(dir: string, warnings: string[]) {
  const byFile = new Map<string, vscode.Diagnostic[]>();
  for (const w of warnings) {
    const m = w.match(/^([^:]+\.ts)(?::(\d+))?: (.*)$/);
    const file = path.join(dir, "src", m ? m[1] : "Stage.ts");
    const line = m?.[2] ? Number(m[2]) - 1 : 0;
    const d = new vscode.Diagnostic(new vscode.Range(line, 0, line, 1000), m ? m[3] : w, vscode.DiagnosticSeverity.Warning);
    d.source = "TextToScratch import";
    byFile.set(file, [...(byFile.get(file) ?? []), d]);
  }
  for (const [f, list] of byFile) importDiags.set(vscode.Uri.file(f), list);
}

/** Open the new project: in this window if it's inside the workspace, else in a new window that opens the viewer. */
async function finishProject(dir: string, file: string) {
  if (vscode.workspace.workspaceFolders?.some((w) => inside(dir, w.uri.fsPath))) {
    await findProjects();
    active = dir;
    await vscode.window.showTextDocument(vscode.Uri.file(file));
    Viewer.show(dir);
    await runBuild(dir, "run");
    return;
  }
  await ext.globalState.update("openViewer", dir);
  await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(dir), { forceNewWindow: !!vscode.workspace.workspaceFolders?.length });
}

async function addSprite() {
  const dir = await pickProject();
  if (!dir) return;
  const name = await vscode.window.showInputBox({
    prompt: "Sprite name (also the file name)", placeHolder: "Enemy",
    validateInput: (v) => (!/^[A-Za-z_][\w ]*$/.test(v) ? "Use letters, digits, spaces and _" : fs.existsSync(path.join(dir, "src", v + ".ts")) ? "That sprite already exists" : null),
  });
  if (!name) return;
  fs.writeFileSync(path.join(dir, "src", name + ".ts"), NEW_SPRITE);
  fs.mkdirSync(path.join(dir, "src", name), { recursive: true });
  await ensureTypings(dir);
  tree.refresh();
  await vscode.window.showTextDocument(vscode.Uri.file(path.join(dir, "src", name + ".ts")));
  vscode.window.showInformationMessage(`Added ${name}. Put its costume images (svg/png/jpg) and sounds (wav/mp3) in src/${name}/.`);
}

async function exportSb3() {
  const dir = await pickProject();
  if (!dir) return;
  const to = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(path.join(dir, "dist", path.basename(dir) + ".sb3")), filters: { "Scratch 3 project": ["sb3"] } });
  if (!to) return;
  const res = await buildDir(dir, L, to.fsPath);
  if (res.ok) vscode.window.showInformationMessage(`Exported ${to.fsPath}`, "Reveal").then((r) => r && vscode.commands.executeCommand("revealFileInOS", to));
  else vscode.window.showErrorMessage(`Export failed: ${res.diagnostics.length} error(s). See the Problems panel.`);
}

async function openInScratch() {
  const dir = await pickProject();
  if (!dir) return;
  const res = await runBuild(dir);
  if (!res?.ok) return vscode.window.showErrorMessage("Fix the build errors first.");
  const pick = await vscode.window.showQuickPick([
    { label: "Scratch", description: "scratch.mit.edu editor", url: "https://scratch.mit.edu/projects/editor/" },
    { label: "TurboWarp", description: "turbowarp.org editor", url: "https://turbowarp.org/editor" },
  ], { title: "Open the built .sb3 in…" });
  if (!pick) return;
  await vscode.env.clipboard.writeText(res.target!);
  await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(res.target!));
  await vscode.env.openExternal(vscode.Uri.parse(pick.url));
  vscode.window.showInformationMessage(`In ${pick.label}: File → Load from your computer → pick ${res.target} (path copied to the clipboard).`);
}

// ---------------- sprites view ----------------

type Node = { kind: "project"; dir: string } | { kind: "sprite"; dir: string; name: string } | { kind: "asset"; dir: string; sprite: string; name: string; file?: string; sound: boolean };

class SpritesView implements vscode.TreeDataProvider<Node> {
  private changed = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this.changed.event;
  private cache = new Map<string, Promise<Awaited<ReturnType<typeof readDir>> | null>>();
  refresh() { this.cache.clear(); this.changed.fire(); }
  private read(dir: string) {
    if (!this.cache.has(dir)) this.cache.set(dir, readDir(dir).catch(() => null));
    return this.cache.get(dir)!;
  }
  async getChildren(n?: Node): Promise<Node[]> {
    if (!n) return projects.length === 1 ? this.getChildren({ kind: "project", dir: projects[0] }) : projects.map((dir) => ({ kind: "project", dir }));
    if (n.kind === "project") {
      const d = await this.read(n.dir);
      if (!d) return [];
      const names = new Set<string>(["Stage"]);
      Object.keys(d.sources).filter((f) => !f.includes("/")).forEach((f) => names.add(f.replace(/\.ts$/, "")));
      Object.keys(d.images).forEach((p) => names.add(p.split("/")[0]));
      d.base.json.targets.forEach((t: any) => !t.isStage && names.add(t.name));
      return [...names].map((name) => ({ kind: "sprite", dir: n.dir, name }));
    }
    if (n.kind === "sprite") {
      const d = await this.read(n.dir);
      if (!d) return [];
      const out: Node[] = [];
      const seen = new Set<string>();
      const ext = (p: string) => p.split(".").pop()!.toLowerCase();
      for (const p of Object.keys(d.images).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
        const [folder, file] = p.split("/");
        if (folder !== n.name) continue;
        const name = file.replace(/\.[^.]+$/, "");
        const sound = SOUND_EXT.includes(ext(p));
        seen.add((sound ? "s:" : "c:") + name);
        out.push({ kind: "asset", dir: n.dir, sprite: n.name, name, file: path.join(n.dir, "src", p), sound });
      }
      const t = d.base.json.targets.find((t: any) => (n.name === "Stage" ? t.isStage : t.name === n.name));
      for (const c of t?.costumes ?? []) if (!seen.has("c:" + c.name)) out.push({ kind: "asset", dir: n.dir, sprite: n.name, name: c.name, sound: false });
      for (const s of t?.sounds ?? []) if (!seen.has("s:" + s.name)) out.push({ kind: "asset", dir: n.dir, sprite: n.name, name: s.name, sound: true });
      return out.sort((a: any, b: any) => Number(a.sound) - Number(b.sound));
    }
    return [];
  }
  getTreeItem(n: Node): vscode.TreeItem {
    if (n.kind === "project") {
      const item = new vscode.TreeItem(path.basename(n.dir), vscode.TreeItemCollapsibleState.Expanded);
      item.iconPath = new vscode.ThemeIcon("game");
      item.description = vscode.workspace.asRelativePath(n.dir);
      return item;
    }
    if (n.kind === "sprite") {
      const file = path.join(n.dir, "src", n.name + ".ts");
      const item = new vscode.TreeItem(n.name, vscode.TreeItemCollapsibleState.Collapsed);
      item.iconPath = new vscode.ThemeIcon(n.name === "Stage" ? "symbol-namespace" : "symbol-class");
      item.description = fs.existsSync(file) ? "" : "no script";
      if (fs.existsSync(file)) item.command = { command: "vscode.open", title: "Open", arguments: [vscode.Uri.file(file)] };
      item.resourceUri = vscode.Uri.file(file);
      item.tooltip = file;
      return item;
    }
    const item = new vscode.TreeItem(n.name, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(n.sound ? "unmute" : "symbol-color");
    item.description = (n.sound ? "sound" : n.sprite === "Stage" ? "backdrop" : "costume") + (n.file ? "" : " · in project.sb3");
    if (n.file) {
      item.command = { command: "vscode.open", title: "Open", arguments: [vscode.Uri.file(n.file)] };
      item.tooltip = n.file;
    } else item.tooltip = "Stored in project.sb3 (edit it in Scratch, or add a file with this name to override it)";
    return item;
  }
}

