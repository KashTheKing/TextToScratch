// Dev server. /extension/* gets the CSP Chrome applies to MV3 extension pages; /test/harness.html is a fake Scratch editor.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".ttf": "font/ttf" };
const port = Number(process.env.PORT ?? 5180);

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x").pathname;
  // PUT /__shot/<name>.png saves a screenshot taken by a test page (into test/fixtures/shots, gitignored)
  if (req.method === "PUT" && url.startsWith("/__shot/")) {
    const name = path.basename(url);
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      fs.mkdirSync(path.join(root, "test", "fixtures", "shots"), { recursive: true });
      fs.writeFileSync(path.join(root, "test", "fixtures", "shots", name), Buffer.concat(chunks));
      res.writeHead(204).end();
    });
    return;
  }
  if (url === "/") return res.writeHead(302, { Location: "/extension/editor.html" }).end();
  const file = path.join(root, decodeURIComponent(url));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  const headers = { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" };
  if (url.startsWith("/extension/")) headers["Content-Security-Policy"] = "script-src 'self'; object-src 'self'";
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Editor: http://localhost:${port}  Harness: http://localhost:${port}/test/harness.html`));
