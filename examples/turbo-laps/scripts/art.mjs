// Generates the track tiles and other SVG costumes. Waypoints must match src/Stage.ts.
import fs from "node:fs";
const D = new URL("../src/", import.meta.url);
const put = (p, s) => { fs.mkdirSync(new URL(p.split("/")[0] + "/", D), { recursive: true }); fs.writeFileSync(new URL(p, D), s); };
const WX = [0, 380, 570, 590, 450, 220, 150, 280, 80, -280, -540, -600, -430, -560, -580, -380];
const WY = [-420, -420, -320, -120, 0, 30, 190, 360, 450, 450, 370, 170, 40, -130, -320, -420];
const PADS = [[190, -420], [-100, 450], [-570, -225]];
const N = WX.length;
const pts = WX.map((x, i) => `${x},${-WY[i]}`).join(" ");
function segDistOne(i, px, py) {
  const ax = WX[i], ay = WY[i], bx = WX[(i + 1) % N], by = WY[(i + 1) % N];
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
const segDist = (px, py) => Math.min(...WX.map((_, i) => segDistOne(i, px, py)));

// deterministic scenery
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let scenery = "";
for (let k = 0; k < 500; k++) {
  const x = -720 + rnd() * 1440, y = -540 + rnd() * 1080;
  if (segDist(x, y) < 110) continue;
  if (rnd() < 0.45) scenery += `<g transform="translate(${x.toFixed(0)} ${(-y).toFixed(0)})"><circle r="22" fill="#2E8B3A"/><circle r="15" cx="-5" cy="-5" fill="#3FAE4A"/><circle r="6" cx="-9" cy="-9" fill="#6CD06A"/></g>`;
  else scenery += `<circle cx="${x.toFixed(0)}" cy="${(-y).toFixed(0)}" r="${(3 + rnd() * 4).toFixed(0)}" fill="${rnd() < 0.5 ? "#F7D84A" : "#FF8AD8"}" stroke="#fff" stroke-width="2"/>`;
}
// tire stacks outside corners
let tires = "";
for (const i of [2, 3, 7, 8, 9, 10, 11, 14]) {
  const cx = WX[i] + Math.sign(WX[i]) * 100, cy = WY[i] + Math.sign(WY[i]) * 100;
  if (segDist(cx, cy) < 90) continue;
  for (let j = -2; j <= 2; j++) tires += `<circle cx="${cx + j * 14}" cy="${-cy}" r="7" fill="#222" stroke="${j % 2 ? "#E53935" : "#fff"}" stroke-width="3"/>`;
}
const [sx, sy] = [WX[0], -WY[0]];
let finish = "";
for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) finish += `<rect x="${sx + r * 9}" y="${sy - 64 + c * 16}" width="9" height="16" fill="${(r + c) % 2 ? "#111" : "#fff"}"/>`;
let pads = "";
for (const [x, y] of PADS) {
  let ang = 0;
  for (let i = 0; i < N; i++) if (segDistOne(i, x, y) < 1) ang = Math.atan2(-(WY[(i + 1) % N] - WY[i]), WX[(i + 1) % N] - WX[i]) * 180 / Math.PI;
  pads += `<g transform="translate(${x} ${-y}) rotate(${ang.toFixed(1)})"><rect x="-30" y="-26" width="60" height="52" rx="8" fill="#FF9F1C" stroke="#FFF3B0" stroke-width="3"/><path d="M-20 -16 L-4 0 L-20 16 M-2 -16 L14 0 L-2 16" fill="none" stroke="#FFF3B0" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}
const world = `<rect x="-760" y="-580" width="1520" height="1160" fill="#5DBB4C"/>` +
  Array.from({ length: 18 }, (_, i) => `<rect x="-760" y="${-580 + i * 66}" width="1520" height="33" fill="#55B044"/>`).join("") +
  `<rect x="-724" y="-544" width="1448" height="1088" fill="none" stroke="#8B5A2B" stroke-width="10" stroke-dasharray="30 10"/>` +
  scenery + tires +
  `<polygon points="${pts}" fill="none" stroke="#E53935" stroke-width="150" stroke-linejoin="round"/>` +
  `<polygon points="${pts}" fill="none" stroke="#fff" stroke-width="150" stroke-linejoin="round" stroke-dasharray="18 18"/>` +
  `<polygon points="${pts}" fill="none" stroke="#565B66" stroke-width="128" stroke-linejoin="round"/>` +
  `<polygon points="${pts}" fill="none" stroke="#626875" stroke-width="100" stroke-linejoin="round"/>` +
  `<polygon points="${pts}" fill="none" stroke="#F4F4F4" stroke-width="4" stroke-dasharray="26 22" stroke-linejoin="round" opacity=".8"/>` +
  finish + pads;
let k = 1;
for (const ty of [360, 0, -360]) for (const tx of [-480, 0, 480]) {
  // Scratch sizes a costume by its geometry bounds, so the oversized world drawing is wrapped in an <image>.
  const inner = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="${tx - 240} ${-ty - 180} 480 360">${world}</svg>`;
  put(`Track/tile${k++}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="480" height="360" viewBox="0 0 480 360"><image width="480" height="360" xlink:href="data:image/svg+xml;base64,${Buffer.from(inner).toString("base64")}"/></svg>`);
}

// cars (facing right)
const carBody = (body, stripe) => `<rect x="6" y="1" width="10" height="5" rx="2" fill="#222"/><rect x="30" y="1" width="10" height="5" rx="2" fill="#222"/><rect x="6" y="22" width="10" height="5" rx="2" fill="#222"/><rect x="30" y="22" width="10" height="5" rx="2" fill="#222"/><path d="M3 7 Q3 4 7 4 H36 Q44 5 44 14 Q44 23 36 24 H7 Q3 24 3 21 Z" fill="${body}" stroke="#1B1B2F" stroke-width="2"/><rect x="4" y="11" width="40" height="6" fill="${stripe}"/><path d="M25 7 L32 9 V19 L25 21 Z" fill="#9FD8FF" stroke="#1B1B2F" stroke-width="1.5"/><rect x="2" y="6" width="4" height="16" rx="1.5" fill="#1B1B2F"/><circle cx="42" cy="8" r="1.6" fill="#FFF7AE"/><circle cx="42" cy="20" r="1.6" fill="#FFF7AE"/>`;
const car = (b, s) => `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="28" viewBox="0 0 46 28">${carBody(b, s)}</svg>`;
put("Player/car.svg", car("#E53935", "#FFFFFF"));
put("Rival/blue.svg", car("#2F6FED", "#FFD23F"));
put("Rival/green.svg", car("#2EB872", "#1B1B2F"));
put("Rival/purple.svg", car("#9B4DFF", "#FF8AD8"));

const big = (t, y, size, fill, stroke = "#1B1B2F", sw = 8, x = "50%") => `<text x="${x}" y="${y}" font-family="Marker" font-size="${size}" text-anchor="middle" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke">${t}</text>`;
const ord = ["1st", "2nd", "3rd", "4th"], col = ["#FFD23F", "#C9D3E0", "#E08A4F", "#8A93A6"];
ord.forEach((o, i) => put(`Place/p${i + 1}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="64" viewBox="0 0 110 64"><rect x="2" y="2" width="106" height="60" rx="14" fill="#1B1B2F" opacity=".75"/>${big(o, 48, 40, col[i], "#1B1B2F", 6, 55)}</svg>`));
for (let l = 1; l <= 3; l++) put(`Lap/lap${l}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="44" viewBox="0 0 130 44"><rect x="2" y="2" width="126" height="40" rx="12" fill="#1B1B2F" opacity=".75"/>${big(`LAP ${l}/3`, 32, 26, "#fff", "#1B1B2F", 4, 65)}</svg>`);
for (const [n, f] of [["3", "#FF5252"], ["2", "#FFB020"], ["1", "#FFE14D"], ["go", "#4CE06A"]])
  put(`Countdown/c${n}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="160" viewBox="0 0 260 160">${big(n === "go" ? "GO!" : n, 130, 130, f, "#1B1B2F", 14, 130)}</svg>`);

put("Panel/menu.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200" viewBox="0 0 360 200"><rect x="4" y="4" width="352" height="192" rx="24" fill="#1B1B2F" opacity=".9" stroke="#FFD23F" stroke-width="5"/>${big("TURBO LAPS", 66, 50, "#FFD23F", "#1B1B2F", 8, 180)}<text x="180" y="104" font-family="Sans Serif" font-weight="bold" font-size="16" fill="#fff" text-anchor="middle">Arrow keys: drive and steer</text><text x="180" y="128" font-family="Sans Serif" font-size="15" fill="#C9D3E0" text-anchor="middle">Orange pads boost you, grass slows you</text><text x="180" y="150" font-family="Sans Serif" font-size="15" fill="#C9D3E0" text-anchor="middle">3 laps. Beat the other cars!</text><text x="180" y="180" font-family="Sans Serif" font-weight="bold" font-size="18" fill="#4CE06A" text-anchor="middle">Press SPACE to start</text></svg>`);
const msg = ["YOU WIN!", "SO CLOSE!", "ON THE PODIUM!", "KEEP PRACTISING!"];
ord.forEach((o, i) => put(`Panel/f${i + 1}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240"><rect x="4" y="4" width="352" height="232" rx="24" fill="#1B1B2F" opacity=".9" stroke="#FFD23F" stroke-width="5"/>${big("FINISHED", 52, 34, "#fff", "#1B1B2F", 6, 180)}${big(o, 140, 96, col[i], "#000", 12, 180)}${big(msg[i], 184, 28, "#FFD23F", "#1B1B2F", 6, 180)}<text x="180" y="220" font-family="Sans Serif" font-weight="bold" font-size="17" fill="#fff" text-anchor="middle">Press SPACE to race again</text></svg>`));

// thumbnail
let tf = ""; for (let r = 0; r < 2; r++) for (let c = 0; c < 30; c++) tf += `<rect x="${c * 16}" y="${276 + r * 10}" width="16" height="10" fill="${(r + c) % 2 ? "#111" : "#fff"}"/>`;
const tcar = (x, y, s, b, st, r) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-23 -14)">${carBody(b, st)}</g>`;
const speed = (x, y) => `<g stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"><line x1="${x}" y1="${y}" x2="${x - 70}" y2="${y}"/><line x1="${x - 10}" y1="${y + 18}" x2="${x - 55}" y2="${y + 18}"/><line x1="${x - 10}" y1="${y - 18}" x2="${x - 48}" y2="${y - 18}"/></g>`;
const title = (t, y) => `<text x="240" y="${y}" font-family="Marker" font-size="80" text-anchor="middle" fill="#1B1B2F" opacity=".45" transform="translate(5 6)">${t}</text><text x="240" y="${y}" font-family="Marker" font-size="80" text-anchor="middle" fill="#FFD23F" stroke="#1B1B2F" stroke-width="12" stroke-linejoin="round" paint-order="stroke">${t}</text>`;
put("Thumbnail/thumbnail.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF7A45"/><stop offset="1" stop-color="#FFC94A"/></linearGradient></defs><rect width="480" height="360" fill="url(#bg)"/><rect y="180" width="480" height="180" fill="#5DBB4C"/><path d="M-40 360 L150 180 H330 L520 360 Z" fill="#626875"/><path d="M-40 360 L150 180" stroke="#E53935" stroke-width="14" stroke-dasharray="14 14"/><path d="M520 360 L330 180" stroke="#E53935" stroke-width="14" stroke-dasharray="14 14"/><path d="M240 186 V360" stroke="#fff" stroke-width="6" stroke-dasharray="22 18"/>${tf}${speed(120, 236)}${tcar(150, 240, 3, "#2F6FED", "#FFD23F", -10)}${speed(300, 312)}${tcar(340, 312, 3.6, "#E53935", "#FFFFFF", 4)}<g transform="rotate(-6 240 90)">${title("TURBO", 92)}${title("LAPS!", 166)}</g><g transform="translate(236 314)"><rect width="234" height="34" rx="17" fill="#855CD6" stroke="#FFFFFF" stroke-width="3"/><rect x="11" y="8" width="26" height="18" rx="5" fill="#FFFFFF"/><text x="24" y="22" font-family="Sans Serif" font-weight="bold" font-size="13" fill="#855CD6" text-anchor="middle">{ }</text><text x="138" y="23" font-family="Sans Serif" font-weight="bold" font-size="14" fill="#FFFFFF" text-anchor="middle">Made with TextToScratch</text></g></svg>`);
put("Stage/grass.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#5DBB4C"/></svg>`);
console.log("art ok");
