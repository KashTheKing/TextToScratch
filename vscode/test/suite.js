// Runs inside the VS Code extension host (see run.mjs).
const vscode = require("vscode");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let api;
async function until(what, fn, ms = 20000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(100)) if (await fn()) return;
  throw new Error("timed out waiting for " + what + "; viewer said " + JSON.stringify(api && api.viewerMessages));
}
/** TTS_SHOTS=1: capture the screen (the test window) for the README */
function shot(name) {
  if (!process.env.TTS_SHOTS) return;
  const out = path.join(__dirname, "..", "media", "screenshots", name + ".png");
  // only the test VS Code window (PrintWindow works even when it is covered), never the rest of the desktop
  const ps = `Add-Type -AssemblyName System.Drawing; Add-Type 'using System;using System.Runtime.InteropServices;public class W{[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);[DllImport("user32.dll")]public static extern bool PrintWindow(IntPtr h,IntPtr dc,uint f);public struct R{public int L,T,Ri,B;}}'; $p=Get-Process Code | Where-Object { $_.Path -like '*.vscode-test*' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1; $h=$p.MainWindowHandle; $r=New-Object W+R; [W]::GetWindowRect($h,[ref]$r)|Out-Null; $bmp=New-Object System.Drawing.Bitmap ($r.Ri-$r.L),($r.B-$r.T); $g=[System.Drawing.Graphics]::FromImage($bmp); $dc=$g.GetHdc(); [W]::PrintWindow($h,$dc,2)|Out-Null; $g.ReleaseHdc($dc); $bmp.Save('${out}')`;
  execFileSync("powershell", ["-NoProfile", "-Command", ps]);
}

exports.run = async () => {
  const ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const dir = path.join(ws, "platformer");
  const ext = vscode.extensions.getExtension("kashtheking.texttoscratch");
  api = await ext.activate();
  await until("project detection", () => api.projects().length === 1);
  console.log("projects:", api.projects());

  // typings + tsconfig generated on activation
  assert.ok(fs.existsSync(path.join(dir, "tsconfig.json")));
  assert.match(fs.readFileSync(path.join(dir, ".tts", "sprites.d.ts"), "utf8"), /"coin"/);

  // Build
  await vscode.commands.executeCommand("texttoscratch.build");
  const out = path.join(dir, "dist", "platformer.sb3");
  await until("dist sb3", () => fs.existsSync(out));
  console.log("built", out, fs.statSync(out).size, "bytes");

  // new costume file -> CostumeName union updates
  fs.copyFileSync(path.join(dir, "src", "Coin", "coin.svg"), path.join(dir, "src", "Coin", "sparkle.svg"));
  await until("sprites.d.ts update", () => fs.readFileSync(path.join(dir, ".tts", "sprites.d.ts"), "utf8").includes('"sparkle"'));

  // compiler-only error -> TextToScratch diagnostic on save
  const coin = vscode.Uri.file(path.join(dir, "src", "Coin.ts"));
  const doc = await vscode.workspace.openTextDocument(coin);
  const editor = await vscode.window.showTextDocument(doc);
  await editor.edit((e) => e.insert(new vscode.Position(0, 0), "const [qa, qb] = [1, 2];\n"));
  await doc.save();
  await until("tts diagnostic", () => vscode.languages.getDiagnostics(coin).some((d) => d.source === "TextToScratch"));
  console.log("diagnostic:", vscode.languages.getDiagnostics(coin).find((d) => d.source === "TextToScratch").message);
  await editor.edit((e) => e.delete(new vscode.Range(0, 0, 1, 0)));
  await doc.save();
  await until("diagnostic cleared", () => !vscode.languages.getDiagnostics(coin).some((d) => d.source === "TextToScratch"));

  // hover docs from scratch.d.ts
  const pos = doc.getText().indexOf("whenFlag");
  if (pos >= 0) {
    let hovers = [];
    await until("hover", async () => {
      hovers = await vscode.commands.executeCommand("vscode.executeHoverProvider", coin, doc.positionAt(pos));
      return hovers.some((h) => h.contents.some((c) => String(c.value ?? c).includes("green flag")));
    }, 30000);
    console.log("hover:", hovers.map((h) => h.contents.map((c) => c.value ?? c).join(" ")).join(" | ").replace(/\s+/g, " ").slice(0, 160));
  }

  // Run in viewer: webview loads the real scratch-vm and reports back
  await vscode.commands.executeCommand("texttoscratch.run");
  await until("viewer loaded", () => api.viewerMessages.some((m) => m.type === "loaded"), 60000);
  console.log("viewer:", JSON.stringify(api.viewerMessages));
  await sleep(2500);
  shot("viewer");

  // Show Blocks for the active sprite file: scratch-blocks renders the compiled scripts and reports the count
  await vscode.window.showTextDocument(vscode.Uri.file(path.join(dir, "src", "Player.ts")), { viewColumn: vscode.ViewColumn.One });
  await vscode.commands.executeCommand("texttoscratch.showBlocks");
  await until("blocks rendered", () => api.viewerMessages.some((m) => m.type === "rendered" && m.target === "Player"), 60000);
  const rendered = api.viewerMessages.find((m) => m.type === "rendered" && m.target === "Player");
  assert.ok(rendered.blocks > 50 && rendered.scripts > 0, JSON.stringify(rendered));
  console.log("blocks:", JSON.stringify(rendered));
  await sleep(1500);
  shot("blocks");

  // Import a non-TextToScratch .sb3 (source comments stripped) into the workspace
  const JSZip = require(path.join(__dirname, "..", "..", "node_modules", "jszip"));
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(ws, "burger.sb3")));
  const json = JSON.parse(await zip.file("project.json").async("string"));
  for (const t of json.targets) t.comments = {};
  zip.file("project.json", JSON.stringify(json));
  fs.writeFileSync(path.join(ws, "plain.sb3"), await zip.generateAsync({ type: "nodebuffer" }));
  const before = api.viewerMessages.length;
  const imported = await vscode.commands.executeCommand("texttoscratch.importSb3", path.join(ws, "plain.sb3"), path.join(ws, "burger"));
  assert.ok(fs.existsSync(path.join(imported, "src", "Chef.ts")));
  assert.ok(fs.existsSync(path.join(imported, "project.sb3")));
  await until("imported project built", () => fs.existsSync(path.join(imported, "dist", "burger.sb3")));
  await until("imported project in viewer", () => api.viewerMessages.slice(before).some((m) => m.type === "loaded"), 60000);
  await until("both projects detected", () => api.projects().length === 2);
  await sleep(3000);
  shot("import");
  for (const [uri, list] of vscode.languages.getDiagnostics()) for (const d of list) if (d.severity === 0) console.log("problem:", path.basename(uri.fsPath), d.range.start.line + 1, d.message);
  console.log("SMOKE TEST PASSED");
};
