// Writes Blaster Arena's SVG costumes. Run from examples/blaster-arena: node scripts/art.mjs
import fs from "node:fs";

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const put = (path, text) => fs.writeFileSync(`src/${path}`, text);

// Top-down robot facing right (direction 90). Centre (28,28).
function robot(body, dark, head, extra = "") {
  return svg(56, 56, `
<rect x="10" y="5" width="32" height="11" rx="5" fill="#2B2F3A"/><rect x="10" y="40" width="32" height="11" rx="5" fill="#2B2F3A"/>
<g stroke="#555C6E" stroke-width="2"><line x1="15" y1="6" x2="15" y2="15"/><line x1="22" y1="6" x2="22" y2="15"/><line x1="29" y1="6" x2="29" y2="15"/><line x1="36" y1="6" x2="36" y2="15"/>
<line x1="15" y1="41" x2="15" y2="50"/><line x1="22" y1="41" x2="22" y2="50"/><line x1="29" y1="41" x2="29" y2="50"/><line x1="36" y1="41" x2="36" y2="50"/></g>
<rect x="27" y="23.5" width="27" height="9" rx="3" fill="#B8C2D6" stroke="#3A3F4B" stroke-width="2"/><rect x="48" y="22" width="6" height="12" rx="2" fill="#3A3F4B"/>
<circle cx="26" cy="28" r="16" fill="${body}" stroke="${dark}" stroke-width="3"/>
<circle cx="26" cy="28" r="9" fill="${head}" stroke="${dark}" stroke-width="2"/>
<rect x="28" y="24" width="6" height="8" rx="2" fill="#1B1F2A"/><rect x="30" y="25.5" width="3" height="2.5" rx="1" fill="#7CF5FF"/>
<circle cx="20" cy="21" r="3" fill="#FFFFFF" opacity=".55"/>${extra}`);
}
put("Me/me.svg", robot("#4C97FF", "#1D4E9E", "#9CC6FF", `<path d="M14 28 l2.5 -5 l2.5 5 l-2.5 5z" fill="#FFE14D" stroke="#8A6D00" stroke-width="1"/>`));
put("Me/hitbox.svg", svg(56, 56, `<circle cx="28" cy="28" r="15" fill="#4C97FF"/>`));
put("Others/robot.svg", robot("#4C97FF", "#1D4E9E", "#9CC6FF"));
put("Bot/bot.svg", robot("#E5484D", "#7A1720", "#FF9EA2", `<path d="M10 14 l6 4 M10 42 l6 -4" stroke="#7A1720" stroke-width="3" stroke-linecap="round"/><path d="M27 23 l8 3" stroke="#1B1F2A" stroke-width="2.5" stroke-linecap="round"/>`));
put("Bot/hitbox.svg", svg(56, 56, `<circle cx="28" cy="28" r="15" fill="#E5484D"/>`));

const ball = (core, glow) => svg(16, 16, `<circle cx="8" cy="8" r="7.5" fill="${glow}" opacity=".45"/><circle cx="8" cy="8" r="5" fill="${core}" stroke="#FFFFFF" stroke-width="1.5"/>`);
put("Bullet/bullet.svg", ball("#FFD84D", "#FFF3A0"));
put("EnemyBullet/bullet.svg", ball("#FF5FA2", "#FFB0D2"));
put("Spark/spark.svg", svg(12, 12, `<path d="M6 0 L7.6 4.4 L12 6 L7.6 7.6 L6 12 L4.4 7.6 L0 6 L4.4 4.4Z" fill="#FFB43D" stroke="#FFF1B0" stroke-width=".8"/>`));
put("HUD/dot.svg", svg(2, 2, `<rect width="2" height="2" fill="#FFFFFF" opacity="0"/>`));

// Arena backdrop. Crates are solid #8B5A2B (collision colour); keep details inset.
const crate = (sx, sy) => {
  const x = sx + 240 - 25, y = 180 - sy - 25;
  return `<rect x="${x + 4}" y="${y + 6}" width="50" height="50" rx="4" fill="#0E1A24" opacity=".45"/>
<rect x="${x}" y="${y}" width="50" height="50" rx="3" fill="#8B5A2B"/>
<rect x="${x + 7}" y="${y + 7}" width="36" height="36" fill="none" stroke="#B57A3E" stroke-width="3"/>
<path d="M${x + 9} ${y + 9} L${x + 41} ${y + 41} M${x + 41} ${y + 9} L${x + 9} ${y + 41}" stroke="#B57A3E" stroke-width="3"/>`;
};
let grid = "";
for (let x = 0; x <= 480; x += 40) grid += `<line x1="${x}" y1="0" x2="${x}" y2="360"/>`;
for (let y = 0; y <= 360; y += 40) grid += `<line x1="0" y1="${y}" x2="480" y2="${y}"/>`;
const chat = ["1 Hi!", "2 Good game!", "3 Follow me!", "4 Nice!", "5 Oops!", "6 Bye!"];
put("Stage/arena.svg", svg(480, 360, `
<rect width="480" height="360" fill="#1E3A4C"/>
<g stroke="#27506A" stroke-width="2">${grid}</g>
<circle cx="240" cy="180" r="60" fill="none" stroke="#3FD0C9" stroke-width="4" opacity=".35"/>
<circle cx="240" cy="180" r="8" fill="#3FD0C9" opacity=".35"/>
<rect x="3" y="3" width="474" height="354" rx="10" fill="none" stroke="#3FD0C9" stroke-width="6" opacity=".7"/>
${crate(-120, 60)}${crate(120, 60)}${crate(-120, -70)}${crate(120, -70)}
<rect x="40" y="338" width="400" height="18" rx="9" fill="#0E1A24" opacity=".6"/>
<text x="240" y="351" font-family="Sans Serif" font-size="11" font-weight="bold" fill="#BFEFFF" text-anchor="middle">QUICK CHAT:  ${chat.join("   ")}</text>`));

// Title cards
const title = (lines, fill, stroke, size, y0) =>
  lines.map((t, i) => `<text x="240" y="${y0 + i * size * 0.95}" font-family="Marker" font-size="${size}" text-anchor="middle" fill="${stroke}" opacity=".45" transform="translate(5 6)">${t}</text><text x="240" y="${y0 + i * size * 0.95}" font-family="Marker" font-size="${size}" text-anchor="middle" fill="${fill}" stroke="${stroke}" stroke-width="11" stroke-linejoin="round" paint-order="stroke">${t}</text>`).join("");
const badge = `<g transform="translate(236 314)"><rect width="234" height="34" rx="17" fill="#855CD6" stroke="#FFFFFF" stroke-width="3"/><rect x="11" y="8" width="26" height="18" rx="5" fill="#FFFFFF"/><text x="24" y="22" font-family="Sans Serif" font-weight="bold" font-size="13" fill="#855CD6" text-anchor="middle">{ }</text><text x="138" y="23" font-family="Sans Serif" font-weight="bold" font-size="14" fill="#FFFFFF" text-anchor="middle">Made with TextToScratch</text></g>`;
const bg = `<defs><radialGradient id="g" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#3B6E8F"/><stop offset="1" stop-color="#14283A"/></radialGradient></defs><rect width="480" height="360" fill="url(#g)"/>`;
const rays = (c) => { let s = ""; for (let a = 0; a < 360; a += 20) s += `<path d="M240 180 L${240 + 400 * Math.cos((a * Math.PI) / 180)} ${180 + 400 * Math.sin((a * Math.PI) / 180)} L${240 + 400 * Math.cos(((a + 8) * Math.PI) / 180)} ${180 + 400 * Math.sin(((a + 8) * Math.PI) / 180)}Z" fill="${c}" opacity=".08"/>`; return s; };
const bot = (x, y, s, r, col, dark, head) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-28 -28)">${robot(col, dark, head).replace(/<\/?svg[^>]*>/g, "")}</g>`;
const shot = (x, y, c) => `<circle cx="${x}" cy="${y}" r="9" fill="${c}" opacity=".4"/><circle cx="${x}" cy="${y}" r="5" fill="${c}" stroke="#fff" stroke-width="2"/>`;
const robots = bot(90, 245, 2, -20, "#4C97FF", "#1D4E9E", "#9CC6FF") + bot(390, 240, 2, 200, "#E5484D", "#7A1720", "#FF9EA2") + bot(240, 290, 1.4, -90, "#4CBF56", "#1E6B27", "#A8F0AE") + shot(160, 220, "#FFD84D") + shot(195, 205, "#FFD84D") + shot(320, 225, "#FF5FA2");

const thumb = svg(480, 360, bg + rays("#FFFFFF") + robots + `<g transform="rotate(-5 240 90)">${title(["BLASTER", "ARENA!"], "#FFE14D", "#7A1720", 72, 88)}</g>` + badge);
put("Thumbnail/thumbnail.svg", thumb);
put("Title/menu.svg", svg(480, 360, bg + rays("#FFFFFF") + robots.replace(/bot\(.*?\)/, "") + `<g transform="rotate(-4 240 70)">${title(["BLASTER ARENA"], "#FFE14D", "#7A1720", 58, 78)}</g>
<rect x="70" y="112" width="340" height="96" rx="14" fill="#0E1A24" opacity=".7"/>
<text font-family="Sans Serif" font-size="15" font-weight="bold" fill="#FFFFFF" text-anchor="middle"><tspan x="240" y="138">WASD / arrows: move   Mouse: aim   Click: blast</tspan><tspan x="240" y="162">Keys 1-6: quick chat</tspan><tspan x="240" y="186" fill="#FFE14D">First to 10 blasts wins! Bots join when you're alone.</tspan></text>
<rect x="150" y="300" width="180" height="40" rx="20" fill="#4CBF56" stroke="#FFFFFF" stroke-width="3"/><text x="240" y="327" font-family="Sans Serif" font-size="20" font-weight="bold" fill="#FFFFFF" text-anchor="middle">CLICK TO PLAY</text>`));
put("Title/win.svg", svg(480, 360, `<rect width="480" height="360" fill="#14283A" opacity=".75"/>` + rays("#FFE14D") + `<g transform="rotate(-4 240 150)">${title(["YOU WIN!"], "#FFE14D", "#1D4E9E", 84, 170)}</g><text x="240" y="250" font-family="Sans Serif" font-size="20" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Arena champion! Click to play again</text>`));
put("Title/lose.svg", svg(480, 360, `<rect width="480" height="360" fill="#14283A" opacity=".75"/>` + `<g transform="rotate(-4 240 150)">${title(["DEFEATED"], "#FF9EA2", "#5A0F18", 84, 170)}</g><text x="240" y="250" font-family="Sans Serif" font-size="20" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Someone reached 10 first. Click to try again</text>`));
console.log("wrote art");
