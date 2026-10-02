// Generates Last Stand's SVG costumes and backdrops. Run from examples/last-stand: node scripts/art.mjs
import fs from "node:fs";
const w = (p, W, H, body) => {
  fs.mkdirSync("src/" + p.split("/")[0], { recursive: true });
  fs.writeFileSync("src/" + p, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`);
};
const D = "#2A1B3D";

// Hero (top-down, faces right = direction 90)
const hero = (body, boots) => `<g stroke="${D}" stroke-width="3" stroke-linejoin="round">
<rect x="28" y="30" width="24" height="9" rx="3" fill="#6B7A8F"/><rect x="46" y="28" width="8" height="13" rx="2" fill="#FFD23F"/>
<ellipse cx="22" cy="12" rx="9" ry="6" fill="${boots}"/><ellipse cx="22" cy="44" rx="9" ry="6" fill="${boots}"/>
<circle cx="24" cy="28" r="17" fill="${body}"/><circle cx="26" cy="28" r="10" fill="#FFC9A0"/>
<path d="M17 20 q9 -8 17 0 l-2 4 q-7 -4 -13 0z" fill="#E8590C"/></g>
<circle cx="31" cy="24" r="2" fill="${D}"/><circle cx="31" cy="32" r="2" fill="${D}"/>`;
w("Hero/hero.svg", 56, 56, hero("#4DABF7", "#3B5BDB"));
w("Hero/hurt.svg", 56, 56, hero("#FF6B6B", "#C92A2A"));

w("Bullet/bullet.svg", 22, 12, `<ellipse cx="11" cy="6" rx="10" ry="5" fill="#FFF3BF" stroke="#F59F00" stroke-width="2.5"/><ellipse cx="14" cy="6" rx="4" ry="2.5" fill="#FFFFFF"/>`);

// Enemies
const slime = (sq, col, dark) => `<g stroke="${D}" stroke-width="3" stroke-linejoin="round"><path d="M${6 + sq} 38 Q${6 + sq} ${8 + sq * 2} 22 ${8 + sq * 2} Q${38 - sq} ${8 + sq * 2} ${38 - sq} 38 Z" fill="${col}"/></g>
<ellipse cx="17" cy="${18 + sq * 2}" rx="4" ry="2.5" fill="#FFFFFF" opacity=".6"/>
<circle cx="16" cy="${26 + sq}" r="4" fill="#FFF" stroke="${D}" stroke-width="2"/><circle cx="28" cy="${26 + sq}" r="4" fill="#FFF" stroke="${D}" stroke-width="2"/>
<circle cx="17" cy="${27 + sq}" r="2" fill="${D}"/><circle cx="29" cy="${27 + sq}" r="2" fill="${D}"/>
<path d="M18 ${33 + sq / 2} q4 3 8 0" stroke="${D}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M4 38 h36" stroke="${dark}" stroke-width="3" stroke-linecap="round"/>`;
w("Enemy/slime1.svg", 44, 42, slime(0, "#69DB7C", "#2B8A3E"));
w("Enemy/slime2.svg", 44, 42, slime(3, "#69DB7C", "#2B8A3E"));
const robot = (leg) => `<g stroke="${D}" stroke-width="3" stroke-linejoin="round">
<line x1="20" y1="8" x2="20" y2="2"/><circle cx="20" cy="3" r="3" fill="#FF6B6B"/>
<rect x="${10 + leg}" y="32" width="6" height="8" fill="#868E96"/><rect x="${24 - leg}" y="32" width="6" height="8" fill="#868E96"/>
<rect x="5" y="8" width="30" height="26" rx="6" fill="#ADB5BD"/><rect x="10" y="13" width="20" height="10" rx="4" fill="#343A40"/></g>
<rect x="13" y="16" width="5" height="4" rx="1" fill="#FF8787"/><rect x="22" y="16" width="5" height="4" rx="1" fill="#FF8787"/>
<path d="M12 28 h16" stroke="${D}" stroke-width="2" stroke-dasharray="3 2"/>`;
w("Enemy/robot1.svg", 40, 42, robot(0));
w("Enemy/robot2.svg", 40, 42, robot(3));
const brute = (sq) => `<g stroke="${D}" stroke-width="3.5" stroke-linejoin="round"><path d="M${6 + sq} 60 Q${2 + sq} ${14 + sq * 2} 34 ${10 + sq * 2} Q${66 - sq} ${14 + sq * 2} ${62 - sq} 60 Z" fill="#B197FC"/>
<path d="M14 ${20 + sq * 2} l-6 -10 l12 4z M54 ${20 + sq * 2} l6 -10 l-12 4z" fill="#FFD43B"/></g>
<path d="M18 ${30 + sq} l10 4 M50 ${30 + sq} l-10 4" stroke="${D}" stroke-width="3" stroke-linecap="round"/>
<circle cx="25" cy="${38 + sq}" r="5" fill="#FFF" stroke="${D}" stroke-width="2"/><circle cx="43" cy="${38 + sq}" r="5" fill="#FFF" stroke="${D}" stroke-width="2"/>
<circle cx="26" cy="${39 + sq}" r="2.5" fill="${D}"/><circle cx="42" cy="${39 + sq}" r="2.5" fill="${D}"/>
<path d="M24 ${50 + sq / 2} h20" stroke="${D}" stroke-width="3" stroke-linecap="round"/><path d="M28 ${50 + sq / 2} v3 M40 ${50 + sq / 2} v3" stroke="#FFF" stroke-width="2.5"/>`;
w("Enemy/brute1.svg", 68, 64, brute(0));
w("Enemy/brute2.svg", 68, 64, brute(3));
let star = "";
for (let i = 0; i < 16; i++) {
  const a = (i * Math.PI) / 8, r = i % 2 ? 10 : 22;
  star += `${i ? "L" : "M"}${(24 + Math.cos(a) * r).toFixed(1)} ${(24 + Math.sin(a) * r).toFixed(1)} `;
}
w("Enemy/pop.svg", 48, 48, `<path d="${star}Z" fill="#FFE066" stroke="#F76707" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="7" fill="#FFF"/>`);

// Pickups
const badge = (col, inner) => `<circle cx="18" cy="18" r="16" fill="${col}" stroke="${D}" stroke-width="3"/><circle cx="18" cy="18" r="12" fill="none" stroke="#FFF" stroke-width="2" opacity=".5"/>${inner}`;
w("Pickup/health.svg", 36, 36, badge("#FFF0F6", `<path d="M18 27 C8 20 8 11 13.5 11 C16 11 18 13 18 15 C18 13 20 11 22.5 11 C28 11 28 20 18 27Z" fill="#FA5252" stroke="${D}" stroke-width="2.5" stroke-linejoin="round"/>`));
w("Pickup/rapid.svg", 36, 36, badge("#FFF9DB", `<path d="M20 6 L11 20 h6 l-2 10 l10 -15 h-6 z" fill="#FCC419" stroke="${D}" stroke-width="2.5" stroke-linejoin="round"/>`));
w("Pickup/spread.svg", 36, 36, badge("#E7F5FF", `<g fill="#4DABF7" stroke="${D}" stroke-width="2"><circle cx="18" cy="10" r="4"/><circle cx="10" cy="15" r="4"/><circle cx="26" cy="15" r="4"/></g><path d="M18 28 v-10 M18 28 L11 19 M18 28 L25 19" stroke="${D}" stroke-width="2" stroke-linecap="round"/>`));

// Upgrade cards
const card = (col, icon, title, sub) => `<rect x="4" y="6" width="120" height="160" rx="14" fill="${D}" opacity=".35"/><rect x="2" y="2" width="120" height="160" rx="14" fill="#FFF" stroke="${D}" stroke-width="4"/>
<rect x="10" y="10" width="104" height="84" rx="10" fill="${col}"/>${icon}
<text x="62" y="122" font-family="Marker" font-size="20" text-anchor="middle" fill="${D}">${title}</text>
<text x="62" y="146" font-family="Sans Serif" font-weight="bold" font-size="12" text-anchor="middle" fill="#495057">${sub}</text>`;
const big = (inner) => `<g transform="translate(62 52) scale(2.2) translate(-18 -18)">${inner}</g>`;
w("Card/damage.svg", 128, 170, card("#FF8787", big(`<path d="M18 4 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1z" fill="#FFE066" stroke="${D}" stroke-width="2" stroke-linejoin="round"/>`), "POWER", "+1 bullet damage"));
w("Card/firerate.svg", 128, 170, card("#FFD43B", big(`<path d="M20 4 L9 20 h7 l-3 12 l12 -17 h-7 z" fill="#FFF" stroke="${D}" stroke-width="2" stroke-linejoin="round"/>`), "QUICK DRAW", "shoot 20% faster"));
w("Card/maxhp.svg", 128, 170, card("#F783AC", big(`<path d="M18 30 C4 21 4 8 12 8 C15 8 18 11 18 13 C18 11 21 8 24 8 C32 8 32 21 18 30Z" fill="#FA5252" stroke="${D}" stroke-width="2" stroke-linejoin="round"/><path d="M18 14 v10 M13 19 h10" stroke="#FFF" stroke-width="3" stroke-linecap="round"/>`), "BIG HEART", "+1 max health"));
w("Card/speed.svg", 128, 170, card("#63E6BE", big(`<path d="M8 22 q2 -14 14 -14 q8 0 8 8 l-4 6z" fill="#FFF" stroke="${D}" stroke-width="2" stroke-linejoin="round"/><path d="M2 14 h6 M0 19 h7 M3 24 h5" stroke="${D}" stroke-width="2" stroke-linecap="round"/><rect x="8" y="22" width="22" height="6" rx="2" fill="#495057" stroke="${D}" stroke-width="2"/>`), "SNEAKERS", "move 15% faster"));
w("Card/multishot.svg", 128, 170, card("#74C0FC", big(`<g fill="#FFF3BF" stroke="${D}" stroke-width="2"><ellipse cx="18" cy="8" rx="4" ry="6"/><ellipse cx="7" cy="12" rx="4" ry="6" transform="rotate(-30 7 12)"/><ellipse cx="29" cy="12" rx="4" ry="6" transform="rotate(30 29 12)"/></g><path d="M18 32 v-16 M18 32 L8 18 M18 32 L28 18" stroke="${D}" stroke-width="2"/>`), "TWIN SHOT", "+1 extra bullet"));
w("Card/heal.svg", 128, 170, card("#8CE99A", big(`<rect x="6" y="10" width="24" height="20" rx="4" fill="#FFF" stroke="${D}" stroke-width="2"/><path d="M18 13 v14 M11 20 h14" stroke="#FA5252" stroke-width="4" stroke-linecap="round"/><rect x="13" y="6" width="10" height="5" rx="2" fill="none" stroke="${D}" stroke-width="2"/>`), "PATCH UP", "heal to full"));

// Banner texts
const ban = (t, col) => `<text x="170" y="58" font-family="Marker" font-size="50" text-anchor="middle" fill="${D}" opacity=".45" transform="translate(4 5)">${t}</text><text x="170" y="58" font-family="Marker" font-size="50" text-anchor="middle" fill="${col}" stroke="${D}" stroke-width="9" stroke-linejoin="round" paint-order="stroke">${t}</text>`;
w("Banner/wave.svg", 340, 80, ban("WAVE INCOMING!", "#FFD43B"));
w("Banner/choose.svg", 340, 80, ban("PICK AN UPGRADE", "#74C0FC"));
w("HUD/dot.svg", 2, 2, `<rect width="2" height="2" fill="#000" opacity="0"/>`);

// Arena
let tiles = "";
for (let x = 0; x < 480; x += 40) for (let y = 0; y < 360; y += 40) if ((x / 40 + y / 40) % 2) tiles += `<rect x="${x}" y="${y}" width="40" height="40" fill="#E9D8A6"/>`;
let rocks = "";
[[30, 30], [450, 40], [40, 330], [440, 320], [240, 20], [20, 180], [460, 190], [240, 345]].forEach(([x, y], i) => (rocks += `<ellipse cx="${x}" cy="${y}" rx="${14 + (i % 3) * 3}" ry="10" fill="#A68A64" stroke="#7F5539" stroke-width="3"/>`));
let tufts = "";
for (let i = 0; i < 26; i++) {
  const x = ((i * 97) % 470) + 5, y = ((i * 61) % 350) + 5;
  tufts += `<path d="M${x} ${y} l3 -8 l3 8 l3 -6 l2 6" stroke="#52B788" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
}
const arena = `<rect width="480" height="360" fill="#F2E3BC"/>${tiles}<circle cx="240" cy="180" r="150" fill="none" stroke="#DDB892" stroke-width="10"/><circle cx="240" cy="180" r="40" fill="none" stroke="#DDB892" stroke-width="6" stroke-dasharray="12 10"/>${tufts}${rocks}<rect width="480" height="360" fill="none" stroke="#7F5539" stroke-width="12"/>`;
w("Stage/arena.svg", 480, 360, arena);
w("Stage/gameover.svg", 480, 360, `${arena}<rect width="480" height="360" fill="${D}" opacity=".7"/>
<text x="240" y="150" font-family="Marker" font-size="72" text-anchor="middle" fill="#000" opacity=".4" transform="translate(5 6)">GAME OVER</text>
<text x="240" y="150" font-family="Marker" font-size="72" text-anchor="middle" fill="#FF6B6B" stroke="#FFF" stroke-width="10" stroke-linejoin="round" paint-order="stroke">GAME OVER</text>
<rect x="110" y="250" width="260" height="44" rx="22" fill="#FFD43B" stroke="#FFF" stroke-width="4"/><text x="240" y="279" font-family="Sans Serif" font-weight="bold" font-size="18" text-anchor="middle" fill="${D}">Click to play again</text>`);

// Title card
w("Thumbnail/thumbnail.svg", 480, 360, `${arena}<rect width="480" height="360" fill="#FFF" opacity=".25"/>
<g transform="translate(60 200) scale(1.7)">${slime(0, "#69DB7C", "#2B8A3E")}</g><g transform="translate(380 180) scale(1.6)">${robot(0)}</g><g transform="translate(320 230) scale(1.2)">${brute(0)}</g>
<g transform="translate(180 190) scale(1.9)">${hero("#4DABF7", "#3B5BDB")}</g>
<g fill="#FFF3BF" stroke="#F59F00" stroke-width="2.5"><ellipse cx="300" cy="248" rx="10" ry="5"/><ellipse cx="275" cy="248" rx="10" ry="5"/></g>
<g transform="rotate(-5 240 80)"><text x="240" y="92" font-family="Marker" font-size="82" text-anchor="middle" fill="${D}" opacity=".45" transform="translate(5 6)">LAST STAND</text>
<text x="240" y="92" font-family="Marker" font-size="82" text-anchor="middle" fill="#FFD43B" stroke="${D}" stroke-width="12" stroke-linejoin="round" paint-order="stroke">LAST STAND</text>
<text x="240" y="142" font-family="Marker" font-size="28" text-anchor="middle" fill="#FFF" stroke="${D}" stroke-width="7" stroke-linejoin="round" paint-order="stroke">survive the slime waves!</text></g>
<rect x="10" y="316" width="216" height="34" rx="17" fill="#FFF" stroke="${D}" stroke-width="3"/><text x="118" y="338" font-family="Sans Serif" font-weight="bold" font-size="13" text-anchor="middle" fill="${D}">Click to start! WASD + mouse</text>
<g transform="translate(236 314)"><rect width="234" height="34" rx="17" fill="#855CD6" stroke="#FFFFFF" stroke-width="3"/><rect x="11" y="8" width="26" height="18" rx="5" fill="#FFFFFF"/><text x="24" y="22" font-family="Sans Serif" font-weight="bold" font-size="13" fill="#855CD6" text-anchor="middle">{ }</text><text x="138" y="23" font-family="Sans Serif" font-weight="bold" font-size="14" fill="#FFFFFF" text-anchor="middle">Made with TextToScratch</text></g>`);
console.log("art done");
