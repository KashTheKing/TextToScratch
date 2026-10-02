// Dev server. /extension/* gets the CSP Chrome applies to MV3 extension pages; /test/harness.html is a fake Scratch editor.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".ttf": "font/ttf" };
const port = Number(process.env.PORT ?? 5180);

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x").pathname;
  if (url === "/") return res.writeHead(302, { Location: "/extension/editor.html" }).end();
  const file = path.join(root, decodeURIComponent(url));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  const headers = { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" };
  if (url.startsWith("/extension/")) headers["Content-Security-Policy"] = "script-src 'self'; object-src 'self'";
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Editor: http://localhost:${port}  Harness: http://localhost:${port}/test/harness.html`));
