// Generates Dead Zone's art. Run from examples/dead-zone: node scripts/art.mjs
// - View/w0001..w0960.png : wall texture column slices (6 textures x 5 aspect ratios x 32 columns)
// - View/y###_*.svg       : billboards (zombies, soldiers, pickups, fx) and HUD pieces
// - Gun, Stage, Chat, Thumbnail costumes
import fs from "node:fs";
import zlib from "node:zlib";

const out = (p, data) => {
  fs.mkdirSync("src/" + p.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.writeFileSync("src/" + p, data);
};
const svg = (W, H, body, defs = "") => svgRaw(W, H, body.replace(/--(\d)/g, "$1"), defs);
const svgRaw = (W, H, body, defs) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
for (const d of ["View", "Gun", "Stage", "Chat", "Thumbnail"]) fs.rmSync("src/" + d, { recursive: true, force: true });

// ---------------------------------------------------------------- PNG encoder
const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, px) { // px(x, y) -> [r,g,b,a]
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a] = px(x, y);
    raw.set([r, g, b, a].map((v) => Math.max(0, Math.min(255, Math.round(v)))), y * (w * 4 + 1) + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- textures (32 x 64 RGBA)
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const TW = 32, TH = 64;
function valueNoise(scale) { // smooth noise grid, tiles horizontally
  const gw = Math.ceil(TW / scale) + 1, gh = Math.ceil(TH / scale) + 1;
  const g = Array.from({ length: gw * gh }, rnd);
  return (x, y) => {
    const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const at = (a, b) => g[(a % (gw - 1)) + Math.min(b, gh - 1) * gw];
    const s = (t) => t * t * (3 - 2 * t);
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * s(tx), bot = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * s(tx);
    return top + (bot - top) * s(ty);
  };
}
const make = (f) => Array.from({ length: TW * TH }, (_, i) => f(i % TW, Math.floor(i / TW)));
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k, c[3] ?? 255];

function brick() {
  const n1 = valueNoise(6), n2 = valueNoise(3);
  const shade = Array.from({ length: 40 }, () => 0.8 + rnd() * 0.35);
  const hue = Array.from({ length: 40 }, () => rnd());
  return make((x, y) => {
    const row = Math.floor(y / 8), off = row % 2 ? 8 : 0, bx = Math.floor(((x + off) % 32) / 16), id = row * 2 + bx;
    const mortar = y % 8 >= 7 || (x + off) % 16 === 15;
    const grime = Math.max(0, (y - 44) / 20) * 0.4 + (n1(x, y) < 0.3 ? 0.15 : 0);
    if (mortar) return mul([92, 86, 78], (0.85 + rnd() * 0.2) * (1 - grime));
    const base = hue[id] < 0.2 ? [104, 56, 44] : hue[id] < 0.35 ? [138, 72, 50] : [124, 60, 44];
    const edge = y % 8 === 0 ? 1.12 : y % 8 === 6 ? 0.85 : 1;
    const moss = n1(x + 3, y) > 0.72 && y > 30 ? [70, 84, 50] : null;
    const c = moss ?? base;
    return mul(c, shade[id] * edge * (0.88 + n2(x, y) * 0.24) * (1 - grime) * (0.94 + rnd() * 0.12));
  });
}
function concrete() {
  const n1 = valueNoise(8), n2 = valueNoise(2.5);
  const streaks = Array.from({ length: 6 }, () => [Math.floor(rnd() * 32), 10 + rnd() * 40, 0.75 + rnd() * 0.15]);
  let cx = 20; const crack = new Set();
  for (let y = 6; y < 40; y++) { cx += Math.round(rnd() * 2 - 1); crack.add(`${cx},${y}`); }
  return make((x, y) => {
    let k = 0.82 + n1(x, y) * 0.22 + (n2(x, y) - 0.5) * 0.1 + (rnd() - 0.5) * 0.08;
    for (const [sx, len, d] of streaks) if (Math.abs(x - sx) < 1.5 && y < len) k *= d + (y / len) * (1 - d);
    if (y === 31 || y === 32) k *= y === 31 ? 0.65 : 1.12;
    if (y === 0 || y === 63) k *= 0.7;
    for (const [hx, hy] of [[8, 15], [24, 15], [8, 47], [24, 47]]) if ((x - hx) ** 2 + (y - hy) ** 2 < 2.5) k *= 0.45;
    if (crack.has(`${x},${y}`)) k *= 0.45;
    if (y > 52) k *= 1 - (y - 52) / 40;
    return mul([128, 126, 118], k);
  });
}
function metal() {
  const rust = valueNoise(5), n2 = valueNoise(2);
  return make((x, y) => {
    let k = 0.78 + 0.22 * Math.cos((x / 8) * Math.PI * 2) + (n2(x, y) - 0.5) * 0.1;
    let c = [82, 92, 100];
    if (rust(x, y) > 0.76) { c = [118, 66, 36]; k = 0.75 + rnd() * 0.3; } else if (rust(x, y) > 0.7) c = [98, 80, 70];
    if (y >= 29 && y <= 34) k *= y === 29 ? 1.3 : y === 34 ? 0.55 : 0.8;
    if ((y === 3 || y === 60 || y === 31) && x % 8 === 4) { c = [150, 156, 160]; k = 1.1; }
    if ((y === 4 || y === 61 || y === 32) && x % 8 === 4) k *= 0.4;
    if (x === 0 || x === 31) k *= 0.5;
    return mul(c, k * (0.95 + rnd() * 0.1));
  });
}
function wood(x, y, base, grain) {
  const g = 0.85 + 0.15 * Math.sin(y * 1.7 + grain(x, y) * 9) + (rnd() - 0.5) * 0.08;
  return mul(base, g);
}
function barricade(damaged) {
  const grain = valueNoise(4);
  const planks = damaged ? [[24, 35, 0]] : [[4, 15, 0], [24, 35, 1], [44, 55, 2]];
  const diag = (x, y) => Math.abs(y - (60 - x * 1.75)) < 5.5;
  return make((x, y) => {
    for (const [a, b, i] of planks) {
      const tilt = damaged ? Math.round(x * 0.15) : 0;
      if (y - tilt >= a && y - tilt <= b) {
        const base = [[126, 92, 58], [108, 78, 50], [134, 100, 64]][i];
        if (y - tilt === a || y - tilt === b) return mul(base, 0.55);
        if ((x === 2 || x === 29) && (y - tilt === a + 3 || y - tilt === b - 3)) return [60, 60, 64, 255];
        return wood(x, y, base, grain);
      }
    }
    if (diag(x, y) && (!damaged || x < 14)) {
      if (damaged && x === 13) return [180, 150, 100, 255];
      return wood(x + 7, y, [118, 86, 54], grain);
    }
    if (damaged && y > 56 && x % 5 < 3 && rnd() < 0.6) return wood(x, y, [100, 74, 46], grain); // splinters at the bottom
    return [0, 0, 0, 0];
  });
}
function crate() {
  const grain = valueNoise(5);
  return make((x, y) => {
    const frame = x < 3 || x > 28 || y < 5 || y > 58 || (y > 29 && y < 34);
    const brace = Math.abs(((y < 32 ? y : y - 32) - 5) - (x - 3) * (24 / 26)) < 2.2 && !frame;
    let k = 1;
    if (frame) k = 0.72; else if (brace) k = 0.86; else if (x % 6 === 0) k = 0.55;
    if ((x === 1 || x === 30) && (y % 16 === 8)) return [70, 70, 74, 255];
    const c = wood(x * 0.7, y, [150, 112, 66], grain);
    return mul(c, k * (y > 56 ? 0.8 : 1));
  });
}
// chalk outline of a weapon on concrete (wall buys)
function chalk(kind) {
  const base = concrete();
  const on = new Set();
  const line = (x1, y1, x2, y2) => { const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2 + 1; for (let i = 0; i <= n; i++) on.add(`${Math.round(x1 + ((x2 - x1) * i) / n)},${Math.round(y1 + ((y2 - y1) * i) / n)}`); };
  const box = (x1, y1, x2, y2) => { line(x1, y1, x2, y1); line(x2, y1, x2, y2); line(x2, y2, x1, y2); line(x1, y2, x1, y1); };
  if (kind === "shotgun") { box(2, 26, 29, 29); box(16, 30, 22, 32); line(2, 30, 2, 36); line(2, 36, 8, 30); line(24, 30, 26, 36); }
  if (kind === "smg") { box(6, 25, 25, 30); box(12, 31, 15, 42); line(20, 31, 21, 37); line(25, 27, 29, 27); line(6, 27, 3, 33); }
  if (kind === "rifle") { box(4, 25, 27, 29); box(13, 30, 16, 40); line(27, 26, 30, 26); line(4, 27, 1, 34); line(1, 34, 4, 34); line(10, 23, 18, 23); }
  box(0, 18, 31, 47);
  return base.map((c, i) => { const x = i % TW, y = Math.floor(i / TW); return on.has(`${x},${y}`) ? [226, 224, 205, 255] : c; });
}
function door() {
  const grain = valueNoise(4);
  return make((x, y) => {
    if (x < 2 || x > 29 || y < 2) return mul([70, 72, 76], 0.9 + rnd() * 0.15);
    const diag1 = Math.abs(y - (8 + x * 1.6)) < 3, diag2 = Math.abs(y - (58 - x * 1.6)) < 3;
    if (diag1 || diag2) return wood(x + 9, y, [150, 112, 70], grain);
    if (x % 7 === 2) return [40, 28, 18, 255];
    if (y > 54) return mul([86, 80, 72], 0.7 + rnd() * 0.4); // rubble at the bottom
    return wood(x, y, [96, 66, 40], grain);
  });
}
const TEX = [brick(), concrete(), metal(), barricade(false), crate(), chalk("shotgun"), chalk("smg"), chalk("rifle"), door(), barricade(true)];
const RATIOS = [2, 4, 8, 16, 32];
let idx = 0;
for (let t = 0; t < TEX.length; t++)
  for (const r of RATIOS)
    for (let s = 0; s < 32; s++) {
      idx++;
      const w = 64 / r;
      out(`View/w${String(idx).padStart(4, "0")}.png`, png(w, 64, (_x, y) => TEX[t][s + y * TW]));
    }

// ---------------------------------------------------------------- billboards (SVG)
const Y = []; // ordered list of non-wall View costumes
const addY = (name, body) => { Y.push(name); out(`View/y${String(Y.length).padStart(3, "0")}_${name}.svg`, body); };
const shadeGrad = (id, light, dark) => `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${dark}"/><stop offset=".55" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
const radial = (id, inner, outer, o1 = 1, o2 = 0) => `<radialGradient id="${id}"><stop offset="0" stop-color="${inner}" stop-opacity="${o1}"/><stop offset="1" stop-color="${outer}" stop-opacity="${o2}"/></radialGradient>`;
const jag = (x1, x2, y, n, amp) => { let d = ""; for (let i = 0; i <= n; i++) d += ` L${(x1 + ((x2 - x1) * i) / n).toFixed(1)} ${(y + (i % 2 ? amp : 0)).toFixed(1)}`; return d; };

const ZT = {
  walker: { skin: "#8E9C7C", skinD: "#4F5C45", shirt: "#4E6A86", shirtD: "#2B3C50", pants: "#5B4A3A", pantsD: "#33291F", hair: "#2E2A24", w: 1, hunch: 0 },
  runner: { skin: "#9AA387", skinD: "#556048", shirt: "#8A3A34", shirtD: "#4A1E1C", pants: "#3A3F48", pantsD: "#1F2228", hair: "#5A4630", w: 0.86, hunch: 6 },
  brute: { skin: "#7F8C6E", skinD: "#45503C", shirt: "#8C8B80", shirtD: "#4C4B44", pants: "#3E4A34", pantsD: "#232A1E", hair: null, w: 1.32, hunch: 2 },
};
function zombieBody(k, view, pose) {
  const z = ZT[k], W = z.w, cx = 80;
  const sx = (v) => (cx + (v - cx) * W).toFixed(1);
  const g = `g_${k}_${view}_${pose}`;
  const defs = shadeGrad(g + "s", z.skin, z.skinD) + shadeGrad(g + "c", z.shirt, z.shirtD) + shadeGrad(g + "p", z.pants, z.pantsD) +
    radial(g + "e", "#F2F7B0", "#C8D060", 1, 0.2);
  const step = pose === "b" ? -1 : 1, walk = pose === "a" || pose === "b";
  const L = walk ? 5 * step : 0;
  let s = `<ellipse cx="80" cy="156" rx="${30 * W}" ry="5" fill="#000" opacity=".35"/>`;
  // legs
  const leg = (x, dy, lift) => `<path d="M${sx(x - 8)} 96 L${sx(x + 8)} 96 L${sx(x + 7 + lift)} ${150 - dy} L${sx(x - 7 + lift)} ${150 - dy}Z" fill="url(#${g}p)" stroke="${z.pantsD}" stroke-width="1.5"/>` +
    `<path d="M${sx(x - 8 + lift)} ${148 - dy} h${(16 * W).toFixed(1)} l${3 * W} ${8 - dy * 0.2} h-${(20 * W).toFixed(1)}z" fill="#2A2622"/>` +
    `<path d="M${sx(x - 7 + lift)} ${142 - dy}${jag(+sx(x - 7 + lift), +sx(x + 7 + lift), 142 - dy, 4, 4).replace(/^ L/, " L")}" stroke="${z.pantsD}" stroke-width="1" fill="none"/>`;
  s += leg(70, walk ? Math.max(0, L) : 0, walk ? -L * 0.3 : 0) + leg(90, walk ? Math.max(0, -L) : 0, walk ? L * 0.3 : 0);
  const hy = z.hunch, top = 46 + hy;
  // torso with torn hem
  const torso = `<path d="M${sx(58)} ${top} Q80 ${top - 6} ${sx(102)} ${top} L${sx(100)} 100${jag(+sx(100), +sx(60), 100, 7, 5)} Z" fill="url(#${g}c)" stroke="${z.shirtD}" stroke-width="2"/>` +
    (view === "front" ? `<path d="M${sx(72)} ${top + 18} l5 9 l-4 6 l7 -2 l2 -10z" fill="${z.skin}" opacity=".9"/><path d="M${sx(90)} ${top + 34} l6 5 l-2 7 l-6 -3z" fill="${z.skinD}"/>` +
      `<path d="M80 ${top} v52" stroke="${z.shirtD}" stroke-width="1" opacity=".6"/>` : `<path d="M${sx(66)} ${top + 10} q14 6 28 0" stroke="${z.shirtD}" stroke-width="1.5" fill="none"/><path d="M${sx(84)} ${top + 26} l8 4 l-3 8z" fill="${z.skinD}"/>`);
  // arms
  const armUp = pose === "atk";
  const arm = (side) => {
    const sh = side < 0 ? +sx(60) : +sx(100);
    if (view === "back") return `<path d="M${sh - 6 * side} ${top + 2} q${10 * side} 8 ${8 * side} 26 l${-8 * side} 2 q${-2 * side} -14 ${-8 * side} -24z" fill="url(#${g}c)" stroke="${z.shirtD}" stroke-width="1.5"/>`;
    if (armUp) return `<path d="M${sh} ${top + 4} L${sh + 16 * side} ${top - 26} L${sh + 26 * side} ${top - 22} L${sh + 8 * side} ${top + 12}Z" fill="url(#${g}s)" stroke="${z.skinD}" stroke-width="1.5"/>` +
      `<path d="M${sh + 14 * side} ${top - 30} l${4 * side} -8 m${2 * side} 8 l${5 * side} -7 m${1 * side} 9 l${6 * side} -5" stroke="${z.skinD}" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="${sh + 20 * side}" cy="${top - 27}" r="6" fill="${z.skin}" stroke="${z.skinD}" stroke-width="1.5"/>`;
    // reaching forward (foreshortened): sleeve then forearm and hand toward viewer
    const sw = walk ? side * step * 3 : 0;
    return `<path d="M${sh} ${top + 2} q${8 * side} 6 ${4 * side} 20 l${-12 * side} 4 q${-2 * side} -14 ${-2 * side} -22z" fill="url(#${g}c)" stroke="${z.shirtD}" stroke-width="1.5"/>` +
      `<path d="M${sh - 2 * side} ${top + 20 + sw} L${sh - 14 * side} ${top + 30 + sw} L${sh - 18 * side} ${top + 24 + sw} L${sh - 6 * side} ${top + 14 + sw}Z" fill="url(#${g}s)" stroke="${z.skinD}" stroke-width="1.2"/>` +
      `<ellipse cx="${sh - 18 * side}" cy="${top + 28 + sw}" rx="7" ry="6" fill="${z.skin}" stroke="${z.skinD}" stroke-width="1.5"/>` +
      `<path d="M${sh - 22 * side} ${top + 31 + sw} l-${2 * side} 5 m${4 * side} -4 l0 6 m${4 * side} -6 l${1 * side} 5" stroke="${z.skinD}" stroke-width="2" stroke-linecap="round"/>`;
  };
  // head
  const hx = 80 + (k === "runner" ? 3 : 0), hyc = top - 16;
  let head = `<rect x="${hx - 5}" y="${hyc + 10}" width="10" height="10" fill="${z.skinD}"/>` +
    `<ellipse cx="${hx}" cy="${hyc}" rx="${k === "brute" ? 15 : 13}" ry="15" fill="url(#${g}s)" stroke="${z.skinD}" stroke-width="2"/>`;
  if (view === "front") {
    head += `<ellipse cx="${hx - 5}" cy="${hyc - 2}" rx="4.2" ry="3.6" fill="#1E2418"/><ellipse cx="${hx + 5}" cy="${hyc - 1}" rx="4.2" ry="3.6" fill="#1E2418"/>` +
      `<circle cx="${hx - 5}" cy="${hyc - 2}" r="1.8" fill="url(#${g}e)"/><circle cx="${hx + 5}" cy="${hyc - 1}" r="1.8" fill="url(#${g}e)"/>` +
      `<path d="M${hx - 3} ${hyc + 3} l3 2 l2 -2" stroke="${z.skinD}" stroke-width="1.2" fill="none"/>` +
      (pose === "atk"
        ? `<ellipse cx="${hx}" cy="${hyc + 9}" rx="5.5" ry="4.5" fill="#1A1410"/><path d="M${hx - 4} ${hyc + 6} l2 2 l2 -2 l2 2 l2 -2" stroke="#C8C0A0" stroke-width="1.2" fill="none"/>`
        : `<path d="M${hx - 6} ${hyc + 9} q6 3 12 -1 l-1 3 q-5 2 -10 0z" fill="#1A1410"/><path d="M${hx - 4} ${hyc + 9} v2 m3 -1 v2 m3 -2 v2" stroke="#BDB596" stroke-width="1"/>`) +
      `<path d="M${hx - 13} ${hyc - 6} q5 4 3 10" stroke="${z.skinD}" stroke-width="1" fill="none" opacity=".7"/>`;
    if (z.hair) head += `<path d="M${hx - 13} ${hyc - 4} q2 -14 13 -12 q10 -1 13 9 l-3 -3 l-2 4 l-3 -6 l-4 3 l-3 -5 l-4 4 l-3 -3z" fill="${z.hair}"/>`;
  } else {
    if (z.hair) head += `<path d="M${hx - 13} ${hyc + 2} q-1 -16 13 -16 q14 0 13 16 q-4 4 -7 0 l-3 4 l-4 -3 l-4 4 l-3 -4 l-4 3z" fill="${z.hair}"/>`;
    head += `<ellipse cx="${hx - 13}" cy="${hyc}" rx="2" ry="4" fill="${z.skinD}"/><ellipse cx="${hx + 13}" cy="${hyc}" rx="2" ry="4" fill="${z.skinD}"/>`;
  }
  // brute extras: belly and shoulder bulk
  const extra = k === "brute" && view === "front" ? `<ellipse cx="80" cy="${top + 38}" rx="17" ry="12" fill="${z.skin}" opacity=".55"/><path d="M68 ${top + 34} q12 8 24 0" stroke="${z.skinD}" stroke-width="1.5" fill="none"/>` : "";
  const body = view === "back" ? arm(-1) + arm(1) + torso + extra + head : torso + extra + head + arm(-1) + arm(1);
  return { defs, body: s + body };
}
function zombieSvg(k, view, pose) {
  const { defs, body } = zombieBody(k, view, pose);
  let b = body;
  if (pose === "f1") b = `<g transform="rotate(16 80 156) translate(0 14)">${body}</g>`;
  if (pose === "f2") b = `<g transform="translate(0 150) rotate(-84 80 0) translate(-80 -150) translate(80 4)">${body.replace(/<ellipse cx="80" cy="156"[^>]*>/, "")}</g><ellipse cx="80" cy="154" rx="70" ry="6" fill="#000" opacity=".3"/>`;
  return svg(160, 160, b, defs);
}
for (const k of ["walker", "runner", "brute"]) {
  addY(`${k}_fa`, zombieSvg(k, "front", "a"));
  addY(`${k}_fb`, zombieSvg(k, "front", "b"));
  addY(`${k}_ba`, zombieSvg(k, "back", "a"));
  addY(`${k}_bb`, zombieSvg(k, "back", "b"));
  addY(`${k}_atk`, zombieSvg(k, "front", "atk"));
  addY(`${k}_f1`, zombieSvg(k, "front", "f1"));
  addY(`${k}_f2`, zombieSvg(k, "front", "f2"));
}
// soldiers (other players): front, back, left, right, down
function soldier(view) {
  const defs = shadeGrad("su", "#6E7A4E", "#3A4228") + shadeGrad("sv", "#A08C62", "#5E5238") + shadeGrad("sk", "#D9A57C", "#9A6A4A") + shadeGrad("sh", "#5C6644", "#2E3422");
  let b = `<ellipse cx="80" cy="156" rx="28" ry="5" fill="#000" opacity=".35"/>`;
  const side = view === "left" ? -1 : view === "right" ? 1 : 0;
  // legs and boots
  b += `<path d="M66 98 h12 l-1 52 h-11z M82 98 h12 l1 52 h-12z" fill="url(#su)" stroke="#2A301C" stroke-width="1.5"/><path d="M63 146 h16 v10 h-18z M81 146 h16 l2 10 h-18z" fill="#2A2420"/>`;
  b += `<path d="M60 50 Q80 42 100 50 L98 102 H62Z" fill="url(#su)" stroke="#2A301C" stroke-width="2"/>`;
  if (view !== "back") b += `<path d="M64 56 h32 v34 h-32z" fill="url(#sv)" stroke="#4A3F2A" stroke-width="1.5"/><path d="M68 64 h10 v8 h-10z M82 64 h10 v8 h-10z" fill="#7E6E4C" stroke="#4A3F2A"/>`;
  else b += `<path d="M64 56 h32 v38 h-32z" fill="url(#sv)" stroke="#4A3F2A" stroke-width="1.5"/><rect x="68" y="60" width="24" height="26" rx="3" fill="#56603E" stroke="#2A301C"/>`;
  // arms + rifle
  if (view === "back") b += `<path d="M58 52 l-6 34 l8 2 l6 -30z M102 52 l6 34 l-8 2 l-6 -30z" fill="url(#su)" stroke="#2A301C" stroke-width="1.5"/>`;
  else if (side) b += `<path d="M${80 - 22 * side} 54 l${8 * side} 26 l${24 * side} -4 l0 -6 l${-18 * side} 0 l${-6 * side} -18z" fill="url(#su)" stroke="#2A301C" stroke-width="1.5"/><path d="M${80 - 10 * side} 70 h${58 * side} v6 h${-58 * side}z" fill="#222428"/><rect x="${side > 0 ? 100 : 46}" y="76" width="7" height="12" fill="#222428"/>`;
  else b += `<path d="M58 52 l-4 30 l14 -4 l0 -6 z M102 52 l4 30 l-14 -4 l0 -6z" fill="url(#su)" stroke="#2A301C" stroke-width="1.5"/><rect x="60" y="72" width="40" height="8" rx="2" fill="#222428"/><rect x="76" y="66" width="8" height="22" fill="#2C2E32"/><circle cx="56" cy="80" r="5" fill="url(#sk)"/><circle cx="104" cy="80" r="5" fill="url(#sk)"/>`;
  // head + helmet
  b += `<rect x="75" y="38" width="10" height="10" fill="#9A6A4A"/><ellipse cx="80" cy="30" rx="12" ry="13" fill="url(#sk)" stroke="#7A5038" stroke-width="1.5"/>`;
  if (view === "front") b += `<rect x="72" y="28" width="16" height="5" rx="2" fill="#1C1E22" opacity=".85"/><path d="M76 38 q4 2 8 0" stroke="#7A5038" stroke-width="1.5" fill="none"/>`;
  b += `<path d="M66 28 Q66 12 80 12 Q94 12 94 28 L98 30 L62 30Z" fill="url(#sh)" stroke="#262B1A" stroke-width="1.5"/>`;
  if (view === "down") b = `<g transform="translate(0 150) rotate(-84 80 0) translate(-80 -150) translate(80 4)">${b.replace(/<ellipse cx="80" cy="156"[^>]*>/, "")}</g>`;
  return svg(160, 160, b, defs);
}
for (const v of ["front", "back", "left", "right", "down"]) addY(`soldier_${v}`, soldier(v));
// pickups (64 x 64, sitting on the bottom edge)
addY("pk_ammo", svg(64, 64, `<ellipse cx="32" cy="61" rx="26" ry="3" fill="#000" opacity=".4"/><path d="M8 30 h48 v30 h-48z" fill="url(#a1)" stroke="#202616" stroke-width="2"/><path d="M6 24 h52 v8 h-52z" fill="#5E6A3E" stroke="#202616" stroke-width="2"/><rect x="27" y="20" width="10" height="5" rx="2" fill="#3A4228"/><text x="32" y="51" font-family="Sans Serif" font-weight="bold" font-size="12" text-anchor="middle" fill="#E8D16A">AMMO</text>`,
  shadeGrad("a1", "#6E7A48", "#3E4628")));
addY("pk_health", svg(64, 64, `<ellipse cx="32" cy="61" rx="26" ry="3" fill="#000" opacity=".4"/><rect x="8" y="26" width="48" height="34" rx="4" fill="url(#h1)" stroke="#555" stroke-width="2"/><rect x="24" y="20" width="16" height="7" rx="2" fill="none" stroke="#555" stroke-width="3"/><path d="M28 32 h8 v8 h8 v8 h-8 v8 h-8 v-8 h-8 v-8 h8z" fill="#D63A32" stroke="#7A1C18" stroke-width="1"/>`,
  shadeGrad("h1", "#F2F2EE", "#B8B8B0")));
addY("pk_shotgun", svg(64, 64, `<ellipse cx="32" cy="61" rx="30" ry="3" fill="#000" opacity=".4"/><path d="M4 52 h56 v8 h-56z" fill="#5A4630" stroke="#2E2418"/><path d="M6 46 L50 40 L52 44 L8 50Z" fill="#2A2C30" stroke="#111"/><path d="M30 43 l14 -2 l1 5 l-14 2z" fill="#8A6038"/><path d="M48 41 l12 -4 l2 6 l-12 3z" fill="#7A5232" stroke="#3A2616"/>`));
addY("pk_rifle", svg(64, 64, `<ellipse cx="32" cy="61" rx="30" ry="3" fill="#000" opacity=".4"/><path d="M4 52 h56 v8 h-56z" fill="#5A4630" stroke="#2E2418"/><path d="M4 44 h40 v6 h-40z" fill="#1E2024" stroke="#000"/><path d="M44 42 h16 l2 8 h-18z" fill="#2A2C30" stroke="#000"/><path d="M26 50 h7 l2 9 h-7z" fill="#2A2C30"/><rect x="18" y="40" width="16" height="4" fill="#3A3C42"/>`));
// fx puffs
addY("fx_dust", svg(64, 64, `<circle cx="32" cy="34" r="22" fill="url(#d1)"/><circle cx="20" cy="28" r="12" fill="url(#d1)"/><circle cx="44" cy="40" r="12" fill="url(#d1)"/>`, radial("d1", "#C8C0B0", "#8A8478", 0.85, 0)));
addY("fx_goo", svg(64, 64, `<circle cx="32" cy="32" r="20" fill="url(#g1)"/><circle cx="14" cy="22" r="6" fill="#9BC53D"/><circle cx="50" cy="20" r="5" fill="#86B02E"/><circle cx="48" cy="48" r="7" fill="#9BC53D"/><circle cx="16" cy="46" r="4" fill="#B5D86A"/><circle cx="32" cy="10" r="3.5" fill="#B5D86A"/>`, radial("g1", "#D8F27A", "#5F8F1A", 0.95, 0.1)));
addY("fx_spark", svg(64, 64, `<path d="M32 8 L36 28 L56 32 L36 36 L32 56 L28 36 L8 32 L28 28Z" fill="#FFE9A0"/><circle cx="32" cy="32" r="8" fill="#FFF"/>`));

// HUD pieces
const T = (x, y, size, text, fill = "#F4F1E6", anchor = "middle", extra = "", family = "Sans Serif") =>
  `<text x="${x}" y="${y}" font-family="${family}" font-weight="bold" font-size="${size}" text-anchor="${anchor}" fill="${fill}" stroke="#0A0C0E" stroke-width="${size / 7}" paint-order="stroke" ${extra}>${text}</text>`;
for (let d = 0; d <= 9; d++) addY(`d${d}`, svg(20, 28, T(10, 24, 26, d)));
addY("dslash", svg(20, 28, T(10, 24, 26, "/", "#B8B4A8")));
addY("dinf", svg(20, 28, `<path d="M3 15 c0 -6 6 -6 7 0 c1 6 7 6 7 0 c0 -6 -6 -6 -7 0 c-1 6 -7 6 -7 0z" fill="none" stroke="#0A0C0E" stroke-width="6"/><path d="M3 15 c0 -6 6 -6 7 0 c1 6 7 6 7 0 c0 -6 -6 -6 -7 0 c-1 6 -7 6 -7 0z" fill="none" stroke="#F4F1E6" stroke-width="2.6"/>`));
const panel = (w, h, inner) => svg(w, h, `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="8" fill="#0B0E10" opacity=".6" stroke="#C8C2A8" stroke-opacity=".35" stroke-width="2"/>${inner}`);
addY("hud_hp", panel(170, 40, `<path d="M16 12 h8 v8 h8 v8 h-8 v8 h-8 v-8 h-8 v-8 h8z" transform="translate(0 -4)" fill="#E04A3C" stroke="#0A0C0E" stroke-width="1.5"/>`));
addY("hud_ammo", panel(150, 40, `<g transform="translate(14 8)"><path d="M0 24 v-14 q3 -9 6 0 v14z M9 24 v-14 q3 -9 6 0 v14z M18 24 v-14 q3 -9 6 0 v14z" fill="#E2B84A" stroke="#0A0C0E" stroke-width="1.2"/></g>`));
addY("hud_wave", panel(118, 40, T(36, 27, 17, "WAVE", "#D8E86A")));
addY("hud_score", panel(150, 40, T(42, 27, 15, "POINTS", "#D8E86A")));
addY("crosshair", svg(40, 40, `<g stroke="#0A0C0E" stroke-width="4" stroke-linecap="round"><path d="M20 4 v9 M20 27 v9 M4 20 h9 M27 20 h9"/></g><g stroke="#F4F1E6" stroke-width="2" stroke-linecap="round"><path d="M20 4 v9 M20 27 v9 M4 20 h9 M27 20 h9"/></g><circle cx="20" cy="20" r="1.6" fill="#E04A3C"/>`));
addY("big_wave", svg(240, 70, T(120, 56, 56, "WAVE", "#D8E86A", "middle", 'letter-spacing="6"')));
addY("msg_cleared", svg(360, 50, T(180, 38, 34, "WAVE CLEARED", "#9BE07A")));
addY("msg_repair", svg(260, 30, T(130, 22, 18, "HOLD E TO REPAIR BARRICADE", "#F2D16A")));
addY("msg_down", svg(380, 70, T(190, 30, 30, "YOU ARE DOWN", "#E85A4A") + T(190, 58, 16, "You'll be back next wave - hang on!", "#F4F1E6")));
addY("msg_gameover", svg(420, 260, `<rect x="4" y="4" width="412" height="252" rx="18" fill="#0B0E10" opacity=".78" stroke="#8A2A22" stroke-width="4"/>` +
  T(210, 78, 58, "GAME OVER", "#E85A4A", "middle", "", "Marker") + T(140, 140, 22, "WAVE", "#D8E86A") + T(280, 140, 22, "SCORE", "#D8E86A") +
  T(210, 232, 17, "Click or press SPACE to play again", "#F4F1E6")));
addY("vignette", svg(480, 360, `<rect width="480" height="360" fill="url(#vg)"/>`, `<radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#B01810" stop-opacity="0"/><stop offset="1" stop-color="#9A0E08" stop-opacity=".85"/></radialGradient>`));
addY("msg_wait", svg(380, 40, T(190, 28, 20, "Waiting for the host to start...", "#F4F1E6")));
addY("msg_reload", svg(160, 30, T(80, 22, 18, "RELOADING", "#F2D16A")));
addY("msg_noammo", svg(220, 30, T(110, 22, 18, "NO AMMO - FIND A CRATE", "#E85A4A")));
addY("hud_players", panel(84, 30, `<path d="M14 22 q0 -8 7 -8 q7 0 7 8z" fill="#9AA86E"/><circle cx="21" cy="10" r="4" fill="#9AA86E"/>`));
addY("hud_weapon_pistol", svg(110, 20, T(55, 16, 14, "PISTOL", "#C8C2A8")));
addY("hud_weapon_shotgun", svg(110, 20, T(55, 16, 14, "SHOTGUN", "#C8C2A8")));
addY("hud_weapon_rifle", svg(110, 20, T(55, 16, 14, "RIFLE", "#C8C2A8")));
addY("hud_weapon_smg", svg(110, 20, T(55, 16, 14, "SMG", "#C8C2A8")));
const prompt = (t) => svg(340, 30, T(170, 22, 17, t, "#F2D16A"));
addY("buy_shotgun", prompt("Press E to buy SHOTGUN [750]"));
addY("buy_rifle", prompt("Press E to buy ASSAULT RIFLE [1400]"));
addY("buy_smg", prompt("Press E to buy SMG [1000]"));
addY("ammo_shotgun", prompt("Press E for SHOTGUN ammo [375]"));
addY("ammo_rifle", prompt("Press E for RIFLE ammo [700]"));
addY("ammo_smg", prompt("Press E for SMG ammo [500]"));
addY("buy_door", prompt("Press E to clear debris [1000]"));
addY("msg_nopoints", svg(340, 30, T(170, 22, 18, "Not enough points!", "#E85A4A")));
const btn = (y, label) => `<rect x="120" y="${y}" width="240" height="44" rx="10" fill="#1E2414" stroke="#B8D850" stroke-width="3"/>` + T(240, y + 30, 20, label, "#D8F27A");
const menuBg = (inner) => svg(480, 360, `<rect width="480" height="360" fill="#05070A" opacity=".55"/>` +
  `<text x="240" y="70" font-family="Marker" font-weight="bold" font-size="56" text-anchor="middle" fill="#9CC832" stroke="#0B0D08" stroke-width="8" paint-order="stroke">DEAD ZONE</text>` + inner);
addY("menu_main", menuBg(btn(140, "SINGLE PLAYER") + btn(204, "ONLINE CO-OP") +
  T(240, 286, 12, "WASD move  -  Arrows turn  -  Click/Space shoot  -  R reload", "#C8C2A8") +
  T(240, 304, 12, "Q / 1 / 2 swap weapon  -  E buy, open debris, repair  -  Z X C V B N quick chat", "#C8C2A8") +
  T(240, 322, 12, "Earn points by hitting and killing zombies. Spend them on wall weapons and doors.", "#C8C2A8")));
addY("menu_connecting", menuBg(T(240, 190, 24, "Connecting to the session...", "#F4F1E6")));
addY("menu_found", menuBg(T(240, 128, 22, "GAME IN PROGRESS", "#F2D16A") + T(190, 162, 18, "WAVE", "#D8E86A") + T(300, 162, 18, "PLAYERS", "#D8E86A") +
  btn(204, "JOIN GAME") + btn(262, "START NEW GAME")));
addY("menu_none", menuBg(T(240, 150, 22, "No game running right now", "#F4F1E6") + btn(204, "START NEW GAME")));
addY("msg_got_shotgun", svg(300, 30, T(150, 22, 20, "SHOTGUN! (Q to switch)", "#9BE07A")));
addY("msg_got_rifle", svg(300, 30, T(150, 22, 20, "ASSAULT RIFLE! (Q to switch)", "#9BE07A")));
addY("minimap_dot", svg(4, 4, `<rect width="4" height="4" fill="#fff"/>`));

// write the index table for the code
let ids = "// Generated by scripts/art.mjs: View costume numbers.\n";
Y.forEach((n, i) => (ids += `export const C_${n.toUpperCase()} = ${idx + 1 + i};\n`));
out("lib/ids.ts", ids);

// ---------------------------------------------------------------- Gun (first-person weapons seen from behind, 200 x 200)
const flash = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="40" fill="url(#fl)"/><path d="M0 -34 L8 -10 L30 -18 L12 0 L32 14 L8 10 L0 34 L-8 10 L-30 16 L-12 0 L-28 -18 L-8 -10Z" fill="#FFB43A" opacity=".9"/><path d="M0 -20 L5 -6 L18 -10 L7 0 L18 8 L5 6 L0 20 L-5 6 L-18 8 L-7 0 L-18 -10 L-5 -6Z" fill="#FFF2B0"/><circle r="7" fill="#FFF"/></g>`;
const gdefs = shadeGrad("m1", "#5A5F68", "#1E2024") + shadeGrad("m2", "#33363C", "#0E0F12") + shadeGrad("wd", "#8E5E36", "#4A2E18") +
  shadeGrad("gl", "#46463A", "#1C1C16") + radial("fl", "#FFE8A0", "#FF9020", 0.6, 0) +
  `<linearGradient id="top" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#1A1C20"/><stop offset="1" stop-color="#4E535C"/></linearGradient>`;
const hand = (x, y, s = 1, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})"><path d="M-34 10 q-4 -26 14 -34 q12 -6 26 -2 l22 8 q12 6 8 22 l-6 40 h-60z" fill="url(#gl)" stroke="#0C0C08" stroke-width="2"/>` +
  `<path d="M-22 -14 q10 -4 22 0 M-26 0 q12 -4 26 0 M-26 14 q12 -4 26 0" stroke="#5A5A4C" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M14 -18 q14 4 14 18" stroke="#5A5A4C" stroke-width="2" fill="none"/></g>`;
const pistol = (fire) => { const k = fire ? 6 : 0; return svg(200, 200,
  (fire ? flash(100, 40, 1.1) : "") +
  `<path d="M78 ${150 + k} h44 l6 60 h-56z" fill="url(#m2)" stroke="#000" stroke-width="2"/>` +
  `<path d="M70 ${122 + k} L82 ${62 + k} L118 ${62 + k} L130 ${122 + k}Z" fill="url(#top)" stroke="#000" stroke-width="2"/>` +
  `<path d="M100 ${66 + k} V${120 + k}" stroke="#16181C" stroke-width="3"/><rect x="96" y="${52 + k}" width="8" height="12" rx="1" fill="#0C0D10"/><circle cx="100" cy="${56 + k}" r="1.6" fill="#E8F27A"/>` +
  `<rect x="66" y="${120 + k}" width="68" height="34" rx="5" fill="url(#m1)" stroke="#000" stroke-width="2"/>` +
  `<path d="M74 ${126 + k} v22 M80 ${126 + k} v22 M86 ${126 + k} v22 M114 ${126 + k} v22 M120 ${126 + k} v22 M126 ${126 + k} v22" stroke="#202328" stroke-width="2"/>` +
  `<rect x="76" y="${110 + k}" width="10" height="12" fill="#0C0D10"/><rect x="114" y="${110 + k}" width="10" height="12" fill="#0C0D10"/><circle cx="81" cy="${114 + k}" r="1.6" fill="#E8F27A"/><circle cx="119" cy="${114 + k}" r="1.6" fill="#E8F27A"/>` +
  hand(100, 176, 1.15), gdefs); };
const shotgun = (fire) => { const k = fire ? 10 : 0; return svg(200, 200,
  (fire ? flash(100, 30, 1.5) : "") +
  `<path d="M70 ${150 + k} L88 ${36 + k} L112 ${36 + k} L130 ${150 + k}Z" fill="url(#m1)" stroke="#000" stroke-width="2"/>` +
  `<path d="M100 ${36 + k} V${150 + k}" stroke="#101114" stroke-width="3"/><ellipse cx="94" cy="${38 + k}" rx="5" ry="3" fill="#050506"/><ellipse cx="106" cy="${38 + k}" rx="5" ry="3" fill="#050506"/>` +
  `<path d="M66 ${86 + k} L80 ${84 + k} L120 ${84 + k} L134 ${86 + k} L140 ${118 + k} L60 ${118 + k}Z" fill="url(#wd)" stroke="#2A1A0C" stroke-width="2"/>` +
  `<path d="M70 ${96 + k} h60 M68 ${106 + k} h64" stroke="#3A2414" stroke-width="2.5"/>` +
  `<path d="M56 ${148 + k} h88 l6 60 h-100z" fill="url(#m2)" stroke="#000" stroke-width="2"/><rect x="94" y="${142 + k}" width="12" height="8" fill="#0C0D10"/><circle cx="100" cy="${40 + k}" r="2" fill="#F2C84A"/>` +
  hand(60, 112 + k, 0.95, 1) + hand(130, 186, 1.1, -1), gdefs); };
const rifle = (fire) => { const k = fire ? 4 : 0; return svg(200, 200,
  (fire ? flash(100, 36, 1.0) : "") +
  `<path d="M72 ${140 + k} L90 ${46 + k} L110 ${46 + k} L128 ${140 + k}Z" fill="url(#m2)" stroke="#000" stroke-width="2"/>` +
  `<path d="M82 ${120 + k} L94 ${56 + k} L106 ${56 + k} L118 ${120 + k}Z" fill="#3A3D44"/>` +
  [0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${84 + i * 1.7} ${114 - i * 9 + k} h${32 - i * 3.4}" stroke="#15161A" stroke-width="2"/>`).join("") +
  `<path d="M96 ${34 + k} L100 ${24 + k} L104 ${34 + k} V${48 + k} H96Z" fill="#0C0D10"/>` +
  `<path d="M60 ${132 + k} h80 l4 70 h-88z" fill="url(#m1)" stroke="#000" stroke-width="2"/>` +
  `<circle cx="100" cy="${126 + k}" r="12" fill="none" stroke="#0C0D10" stroke-width="5"/><circle cx="100" cy="${126 + k}" r="2" fill="#E8F27A"/>` +
  `<path d="M54 ${150 + k} l-16 50 h24 l12 -48z" fill="url(#m2)" stroke="#000" stroke-width="2"/>` +
  hand(72, 118 + k, 0.85, 1) + hand(134, 188, 1.05, -1), gdefs); };
out("Gun/a_pistol.svg", pistol(false)); out("Gun/b_pistol_fire.svg", pistol(true));
out("Gun/c_shotgun.svg", shotgun(false)); out("Gun/d_shotgun_fire.svg", shotgun(true));
out("Gun/e_rifle.svg", rifle(false)); out("Gun/f_rifle_fire.svg", rifle(true));
const smg = (fire) => { const k = fire ? 3 : 0; return svg(200, 200,
  (fire ? flash(100, 70, 0.9) : "") +
  `<path d="M76 ${140 + k} L92 ${76 + k} L108 ${76 + k} L124 ${140 + k}Z" fill="url(#m2)" stroke="#000" stroke-width="2"/>` +
  `<rect x="94" y="${66 + k}" width="12" height="12" rx="2" fill="#0C0D10"/><path d="M96 ${66 + k} L100 ${58 + k} L104 ${66 + k}Z" fill="#0C0D10"/>` +
  `<path d="M64 ${132 + k} h72 l4 70 h-80z" fill="url(#m1)" stroke="#000" stroke-width="2"/>` +
  `<path d="M84 ${120 + k} h12 v82 h-12z" fill="url(#m2)" stroke="#000" stroke-width="2"/>` +
  `<rect x="90" y="${124 + k}" width="20" height="8" fill="#0C0D10"/><circle cx="100" cy="${128 + k}" r="2" fill="#E8F27A"/>` +
  hand(74, 150 + k, 0.8, 1) + hand(134, 188, 1.05, -1), gdefs); };
out("Gun/g_smg.svg", smg(false)); out("Gun/h_smg_fire.svg", smg(true));

// ---------------------------------------------------------------- Stage backdrop
let stars = "";
for (let i = 0; i < 60; i++) stars += `<circle cx="${(rnd() * 480).toFixed(0)}" cy="${(rnd() * 140).toFixed(0)}" r="${(0.4 + rnd() * 0.8).toFixed(1)}" fill="#C8D0E0" opacity="${(0.2 + rnd() * 0.5).toFixed(2)}"/>`;
out("Stage/night.svg", svg(480, 360,
  `<rect width="480" height="180" fill="url(#sky)"/>${stars}<circle cx="380" cy="50" r="40" fill="url(#moonglow)"/><circle cx="380" cy="50" r="13" fill="#E6E8D8" opacity=".85"/>` +
  `<rect y="180" width="480" height="180" fill="url(#gnd)"/><rect y="150" width="480" height="60" fill="url(#fog)"/>`,
  `<linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#05070B"/><stop offset=".7" stop-color="#10151C"/><stop offset="1" stop-color="#15191D"/></linearGradient>` +
  `<linearGradient id="gnd" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#121311"/><stop offset=".35" stop-color="#22221C"/><stop offset="1" stop-color="#4C4A3E"/></linearGradient>` +
  `<linearGradient id="fog" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3A4044" stop-opacity="0"/><stop offset=".5" stop-color="#2E3236" stop-opacity=".55"/><stop offset="1" stop-color="#2E3236" stop-opacity="0"/></linearGradient>` +
  radial("moonglow", "#B8C4C8", "#B8C4C8", 0.35, 0)));

// Chat: invisible anchor for quick-chat speech bubbles
out("Chat/anchor.svg", svg(4, 4, `<rect width="4" height="4" fill="#000" opacity="0.01"/>`));

// ---------------------------------------------------------------- Thumbnail (480 x 360 title card)
const zA = zombieBody("walker", "front", "a"), zB = zombieBody("brute", "front", "atk"), zC = zombieBody("runner", "front", "b");
let skyline = "";
for (let x = 0; x < 480; x += 30 + Math.floor(rnd() * 30)) {
  const h = 40 + rnd() * 90, w = 30 + rnd() * 40;
  skyline += `<rect x="${x}" y="${230 - h}" width="${w}" height="${h}" fill="#10141A"/>`;
  for (let wy = 230 - h + 8; wy < 222; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (rnd() < 0.12) skyline += `<rect x="${wx}" y="${wy}" width="5" height="7" fill="#C8A050" opacity=".55"/>`;
}
out("Thumbnail/thumbnail.svg", svg(480, 360,
  `<rect width="480" height="360" fill="url(#tsky)"/><circle cx="400" cy="70" r="70" fill="url(#tmoon)"/><circle cx="400" cy="70" r="26" fill="#E8EADA"/>${skyline}` +
  `<rect y="226" width="480" height="134" fill="url(#tgnd)"/><rect y="200" width="480" height="70" fill="url(#tfog)"/>` +
  `<g transform="translate(270 120) scale(1.35)">${zB.body}</g><g transform="translate(-10 150) scale(1.15)">${zA.body}</g><g transform="translate(340 170) scale(1.05)">${zC.body}</g>` +
  `<path d="M0 300 L480 280 L480 360 L0 360Z" fill="#0A0B0A" opacity=".6"/>` +
  `<g font-family="Marker" font-weight="bold" text-anchor="middle">` +
  `<text x="246" y="140" font-size="84" fill="#000" opacity=".55">DEAD ZONE</text>` +
  `<text x="240" y="134" font-size="84" fill="url(#ttitle)" stroke="#0B0D08" stroke-width="10" paint-order="stroke" stroke-linejoin="round">DEAD ZONE</text></g>` +
  `<text x="240" y="182" font-family="Sans Serif" font-weight="bold" font-size="20" text-anchor="middle" fill="#E8E4D0" stroke="#0B0D08" stroke-width="4" paint-order="stroke" letter-spacing="3">CO-OP ZOMBIE DEFENSE</text>` +
  `<rect x="150" y="296" width="180" height="34" rx="17" fill="#1E2414" stroke="#B8D850" stroke-width="3"/><text x="240" y="319" font-family="Sans Serif" font-weight="bold" font-size="17" text-anchor="middle" fill="#D8F27A">CLICK TO PLAY</text>` +
  `<rect x="318" y="334" width="156" height="20" rx="10" fill="#4C97FF" stroke="#FFF" stroke-width="2"/><text x="396" y="348" font-family="Sans Serif" font-weight="bold" font-size="11" text-anchor="middle" fill="#FFF">Made with TextToScratch</text>`,
  zA.defs + zB.defs + zC.defs +
  `<linearGradient id="tsky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#05070C"/><stop offset="1" stop-color="#2A3238"/></linearGradient>` +
  `<linearGradient id="tgnd" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#22241E"/><stop offset="1" stop-color="#3E3C30"/></linearGradient>` +
  `<linearGradient id="tfog" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5A6468" stop-opacity="0"/><stop offset=".5" stop-color="#5A6468" stop-opacity=".45"/><stop offset="1" stop-color="#5A6468" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="ttitle" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E8FF8A"/><stop offset=".55" stop-color="#9CC832"/><stop offset="1" stop-color="#4E6E12"/></linearGradient>` +
  radial("tmoon", "#C8D4D8", "#C8D4D8", 0.45, 0)));
console.log(`walls: ${idx}, billboards/hud: ${Y.length}`);
