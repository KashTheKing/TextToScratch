// Smoke test: launches VS Code with the extension on a temp copy of examples/platformer and runs test/suite.js.
import { runTests } from "@vscode/test-electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ws = fs.mkdtempSync(path.join(os.tmpdir(), "tts-vscode-"));
fs.cpSync(path.join(here, "..", "..", "examples", "platformer", "src"), path.join(ws, "platformer", "src"), { recursive: true });
fs.copyFileSync(path.join(here, "..", "..", "examples", "burger-tycoon", "dist", "burger-tycoon.sb3"), path.join(ws, "burger.sb3"));
console.log("workspace:", ws);
await runTests({
  extensionDevelopmentPath: path.join(here, ".."),
  extensionTestsPath: path.join(here, "suite.js"),
  launchArgs: [ws, "--disable-extensions", "--disable-workspace-trust", "--skip-welcome", "--skip-release-notes"],
  extensionTestsEnv: { TTS_SHOTS: process.env.TTS_SHOTS ?? "" },
});
