// Writes every costume/backdrop SVG for Burger Tycoon into src/<Sprite>/. Run: node scripts/art.mjs
import fs from "node:fs";

const out = {};
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const put = (dir, name, w, h, body) => ((out[`src/${dir}/${name}.svg`] = svg(w, h, body)));
const OL = `stroke="#3B2414" stroke-width="3" stroke-linejoin="round"`;
const txt = (x, y, s, size, fill = "#FFE14D", stroke = "#3B2414", sw = 6) =>
  `<text x="${x}" y="${y}" font-family="Marker" font-size="${size}" text-anchor="middle" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke">${s}</text>`;

// ---------- food icons (drawn around 0,0, ~36px) ----------
const burger = `<path d="M-17 -2 Q-17 -17 0 -17 Q17 -17 17 -2 Z" fill="#F2A33A" ${OL}/><circle cx="-6" cy="-10" r="1.5" fill="#FFF3C4"/><circle cx="5" cy="-12" r="1.5" fill="#FFF3C4"/><circle cx="9" cy="-7" r="1.5" fill="#FFF3C4"/><path d="M-19 -1 l5 4 5 -4 5 4 5 -4 5 4 5 -4 5 4 4 -4" fill="none" stroke="#5CBF4C" stroke-width="4" stroke-linecap="round"/><rect x="-18" y="3" width="36" height="7" rx="3.5" fill="#7A3E14" ${OL}/><path d="M-17 11 h34 q0 7 -6 7 h-22 q-6 0 -6 -7z" fill="#E8913A" ${OL}/>`;
const fries = `<g><rect x="-11" y="-17" width="4" height="20" fill="#FFD84D" stroke="#C98A12" stroke-width="1.5" transform="rotate(-10)"/><rect x="-4" y="-20" width="4" height="22" fill="#FFD84D" stroke="#C98A12" stroke-width="1.5"/><rect x="3" y="-18" width="4" height="20" fill="#FFD84D" stroke="#C98A12" stroke-width="1.5" transform="rotate(8)"/><rect x="8" y="-14" width="4" height="18" fill="#FFD84D" stroke="#C98A12" stroke-width="1.5" transform="rotate(16)"/></g><path d="M-14 -4 h28 l-4 22 h-20z" fill="#E5333B" ${OL}/><path d="M-6 6 q6 5 12 0" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round"/>`;
const drink = `<rect x="2" y="-24" width="4" height="14" fill="#FFFFFF" stroke="#3B2414" stroke-width="2" transform="rotate(14)"/><path d="M-12 -12 h24 l-3 30 h-18z" fill="#4CA6FF" ${OL}/><rect x="-14" y="-15" width="28" height="6" rx="3" fill="#FFFFFF" ${OL}/><path d="M-9 0 h18" stroke="#FFFFFF" stroke-width="3" opacity=".7"/>`;
const shake = `<circle cx="0" cy="-17" r="4" fill="#E5333B" stroke="#3B2414" stroke-width="2"/><path d="M-13 -9 q0 -9 13 -9 q13 0 13 9z" fill="#FFF4F8" ${OL}/><path d="M-11 -8 h22 l-4 26 h-14z" fill="#FF8FB8" ${OL}/><path d="M-8 2 h16" stroke="#FFFFFF" stroke-width="3" opacity=".7"/>`;
const ICONS = { burger, fries, drink, shake };

// ---------- HUD (stamped with the pen) ----------
for (let d = 0; d <= 9; d++) put("HUD", `d${d}`, 22, 30, txt(11, 25, String(d), 26, "#FFFFFF", "#3B2414", 6));
put("HUD", "dollar", 22, 30, txt(11, 25, "$", 26, "#7CFF6B", "#1E4D16", 6));
put("HUD", "plus", 22, 30, txt(11, 25, "+", 26, "#FFE14D", "#3B2414", 6));
put("HUD", "x", 22, 30, txt(11, 25, "x", 22, "#FFFFFF", "#3B2414", 6));
for (const [k, body] of Object.entries(ICONS)) put("HUD", `i_${k}`, 44, 44, `<g transform="translate(22 23)">${body}</g>`);
put("HUD", "bubble", 120, 62, `<path d="M8 4 h104 a6 6 0 0 1 6 6 v34 a6 6 0 0 1 -6 6 h-46 l-6 9 -6 -9 h-46 a6 6 0 0 1 -6 -6 v-34 a6 6 0 0 1 6 -6z" fill="#FFFFFF" ${OL}/>`);
const starPath = "M0 -11 L3.2 -3.5 L11 -3.4 L5 1.8 L7 10 L0 5.5 L-7 10 L-5 1.8 L-11 -3.4 L-3.2 -3.5Z";
put("HUD", "star", 26, 26, `<path transform="translate(13 13.5)" d="${starPath}" fill="#FFD500" stroke="#7A4E00" stroke-width="2" stroke-linejoin="round"/>`);
put("HUD", "star_off", 26, 26, `<path transform="translate(13 13.5)" d="${starPath}" fill="#6B5444" stroke="#2A190D" stroke-width="2" stroke-linejoin="round"/>`);
put("HUD", "lock", 86, 80, `<rect x="6" y="18" width="74" height="54" rx="8" fill="#5A3A22" ${OL}/><path d="M6 30 l74 0 M6 46 l74 0 M6 62 l74 0" stroke="#7A5232" stroke-width="3"/>${txt(43, 54, "SOON", 20, "#FFE14D")}<rect x="22" y="2" width="42" height="18" rx="4" fill="#E5333B" ${OL}/>${txt(43, 16, "CLOSED", 11, "#FFFFFF", "#3B2414", 3)}`);
put("HUD", "max", 60, 30, txt(30, 23, "MAX", 22, "#7CFF6B", "#1E4D16", 6));
put("HUD", "dot", 2, 2, `<rect width="2" height="2" fill="#000" opacity="0.01"/>`);

// ---------- customers ----------
const bust = (body, head, mad) => {
  const brow = mad ? `<path d="M-14 -24 l9 4 M14 -24 l-9 4" stroke="#3B2414" stroke-width="3.5" stroke-linecap="round"/>` : "";
  const eyes = `<circle cx="-8" cy="-14" r="${mad ? 3 : 4}" fill="#3B2414"/><circle cx="8" cy="-14" r="${mad ? 3 : 4}" fill="#3B2414"/><circle cx="-6.5" cy="-15.5" r="1.3" fill="#FFF"/><circle cx="9.5" cy="-15.5" r="1.3" fill="#FFF"/>`;
  const mouth = mad ? `<path d="M-7 3 q7 -6 14 0" fill="none" stroke="#3B2414" stroke-width="3" stroke-linecap="round"/>` : `<path d="M-8 -1 q8 8 16 0" fill="#C2185B" stroke="#3B2414" stroke-width="3" stroke-linecap="round"/>`;
  const steam = mad ? `<path d="M22 -42 q4 -6 0 -12 M28 -38 q5 -6 1 -12" fill="none" stroke="#E5333B" stroke-width="3" stroke-linecap="round"/><circle cx="-22" cy="-30" r="4" fill="#FF6B6B" opacity=".7"/>` : `<circle cx="-16" cy="-4" r="4" fill="#FF8FA3" opacity=".6"/><circle cx="16" cy="-4" r="4" fill="#FF8FA3" opacity=".6"/>`;
  return `<g transform="translate(40 52)">${body}${head}${eyes}${brow}${mouth}${steam}</g>`;
};
const shirt = (c) => `<path d="M-26 36 q0 -22 26 -22 q26 0 26 22z" fill="${c}" ${OL}/>`;
const CUSTOMERS = {
  cat: [shirt("#4C97FF"), `<path d="M-22 -22 l-4 -18 l14 8z M22 -22 l4 -18 l-14 8z" fill="#FFAB19" ${OL}/><ellipse cx="0" cy="-10" rx="24" ry="21" fill="#FFAB19" ${OL}/><path d="M-30 -6 l10 2 M-30 1 l10 -1 M30 -6 l-10 2 M30 1 l-10 -1" stroke="#3B2414" stroke-width="2"/><path d="M-3 -7 h6 l-3 3z" fill="#E5336B"/>`],
  bear: [shirt("#5CBF4C"), `<circle cx="-18" cy="-28" r="8" fill="#9C6B3F" ${OL}/><circle cx="18" cy="-28" r="8" fill="#9C6B3F" ${OL}/><ellipse cx="0" cy="-10" rx="24" ry="21" fill="#9C6B3F" ${OL}/><ellipse cx="0" cy="-4" rx="9" ry="7" fill="#E8C49A"/><ellipse cx="0" cy="-7" rx="3.5" ry="2.5" fill="#3B2414"/>`],
  frog: [shirt("#FF8C1A"), `<ellipse cx="0" cy="-8" rx="26" ry="19" fill="#59C059" ${OL}/><circle cx="-11" cy="-22" r="10" fill="#59C059" ${OL}/><circle cx="11" cy="-22" r="10" fill="#59C059" ${OL}/><circle cx="-11" cy="-22" r="6" fill="#FFFFFF"/><circle cx="11" cy="-22" r="6" fill="#FFFFFF"/>`],
  robot: [shirt("#9966FF"), `<line x1="0" y1="-32" x2="0" y2="-42" stroke="#3B2414" stroke-width="3"/><circle cx="0" cy="-44" r="4" fill="#E5333B" ${OL}/><rect x="-23" y="-32" width="46" height="38" rx="9" fill="#B8C7D9" ${OL}/><rect x="-17" y="-22" width="34" height="14" rx="5" fill="#E6F3FF"/>`],
};
for (const [k, [b, h]] of Object.entries(CUSTOMERS)) {
  put("Customer", k, 80, 90, bust(b, h, false));
  put("Customer", `${k}_mad`, 80, 90, bust(b, h, true));
}

// ---------- stations (90x90, centred) ----------
const station = (dir, name, inner, label, labelColor) =>
  put(dir, name, 92, 96, `<rect x="4" y="22" width="84" height="68" rx="10" fill="#C9D3DE" ${OL}/><rect x="4" y="76" width="84" height="14" rx="6" fill="#8796A8" ${OL}/>${inner}${txt(46, 88, label, 14, labelColor, "#3B2414", 4)}`);
const grillTop = `<rect x="10" y="16" width="72" height="34" rx="6" fill="#3A3A44" ${OL}/><path d="M16 24 h60 M16 33 h60 M16 42 h60" stroke="#6B6B78" stroke-width="3"/><circle cx="24" cy="64" r="5" fill="#E5333B" ${OL}/><circle cx="46" cy="64" r="5" fill="#FFAB19" ${OL}/><circle cx="68" cy="64" r="5" fill="#5CBF4C" ${OL}/>`;
const patty = (c) => `<ellipse cx="46" cy="32" rx="22" ry="9" fill="${c}" ${OL}/>`;
const flame = `<path d="M24 48 q-4 -10 4 -16 q0 8 6 8 q2 -6 -2 -12 q10 6 6 20z M58 48 q-4 -10 4 -16 q0 8 6 8 q2 -6 -2 -12 q10 6 6 20z" fill="#FF6B1A" stroke="#C93A00" stroke-width="1.5"/>`;
const steam = `<path d="M34 12 q-5 -6 0 -11 M46 10 q-5 -6 0 -11 M58 12 q-5 -6 0 -11" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".9"/>`;
const smoke = `<circle cx="36" cy="10" r="8" fill="#555"/><circle cx="50" cy="6" r="10" fill="#444"/><circle cx="60" cy="13" r="7" fill="#666"/>`;
const sparkle = `<path transform="translate(80 16) scale(.9)" d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3Z" fill="#FFE14D" stroke="#7A4E00" stroke-width="1.5"/>`;
station("Grill", "grill_empty", grillTop, "GRILL", "#FFFFFF");
station("Grill", "grill_cook", grillTop + flame + patty("#D9826B") + steam, "GRILL", "#FFFFFF");
station("Grill", "grill_ready", grillTop + patty("#7A3E14") + `<path d="M30 30 l6 4 M44 29 l6 4 M58 30 l6 4" stroke="#4A230A" stroke-width="2.5"/>` + steam + sparkle, "READY!", "#7CFF6B");
station("Grill", "grill_burnt", grillTop + patty("#1E1E1E") + smoke, "BURNT!", "#FF6B6B");
const fryTop = (oil) => `<rect x="12" y="20" width="68" height="40" rx="6" fill="#B0BCC9" ${OL}/><rect x="17" y="26" width="58" height="26" rx="4" fill="${oil}"/>`;
const basket = (y, fc) => `<rect x="26" y="${y}" width="40" height="18" rx="3" fill="#D8D8D8" ${OL}/><path d="M66 ${y + 4} h14" stroke="#3B2414" stroke-width="4" stroke-linecap="round"/><g fill="${fc}" stroke="#C98A12" stroke-width="1.2"><rect x="31" y="${y - 6}" width="4" height="12"/><rect x="38" y="${y - 8}" width="4" height="12"/><rect x="45" y="${y - 6}" width="4" height="12"/><rect x="52" y="${y - 7}" width="4" height="12"/><rect x="59" y="${y - 5}" width="4" height="12"/></g>`;
const bubbles = `<circle cx="24" cy="30" r="3" fill="#FFF3A6"/><circle cx="66" cy="34" r="2.5" fill="#FFF3A6"/><circle cx="52" cy="28" r="2" fill="#FFF3A6"/>`;
station("Fryer", "fryer_empty", fryTop("#E8B84A") + basket(8, "none"), "FRYER", "#FFFFFF");
station("Fryer", "fryer_cook", fryTop("#E8B84A") + basket(30, "#FFF0A0") + bubbles + steam, "FRYER", "#FFFFFF");
station("Fryer", "fryer_ready", fryTop("#E8B84A") + basket(8, "#FFC930") + sparkle, "READY!", "#7CFF6B");
station("Fryer", "fryer_burnt", fryTop("#8A6A2A") + basket(8, "#3A2A1A") + smoke, "BURNT!", "#FF6B6B");
const sodaBody = (cup, flow) => `<rect x="14" y="6" width="64" height="30" rx="8" fill="#E5333B" ${OL}/>${txt(46, 28, "SODA", 15, "#FFFFFF", "#3B2414", 3)}<rect x="40" y="36" width="12" height="8" fill="#8796A8" ${OL}/>${flow ? `<rect x="43" y="44" width="6" height="14" fill="#4CA6FF"/>` : ""}${cup}`;
const cup = (fill) => `<path d="M33 52 h26 l-3 22 h-20z" fill="${fill}" ${OL}/>`;
station("Soda", "soda_empty", sodaBody(cup("#FFFFFF"), false), "DRINKS", "#FFFFFF");
station("Soda", "soda_pour", sodaBody(cup("#9FD2FF"), true), "DRINKS", "#FFFFFF");
station("Soda", "soda_ready", sodaBody(`<g transform="translate(46 60)">${drink}</g>`, false) + sparkle, "READY!", "#7CFF6B");
const shakeBody = (inner) => `<rect x="18" y="4" width="56" height="22" rx="8" fill="#FF8FB8" ${OL}/><rect x="40" y="26" width="12" height="10" fill="#8796A8" ${OL}/>${inner}`;
station("Shake", "shake_empty", shakeBody(`<path d="M34 40 h24 l-3 30 h-18z" fill="#FFFFFF" ${OL}/>`), "SHAKES", "#FFFFFF");
station("Shake", "shake_blend", shakeBody(`<path d="M34 40 h24 l-3 30 h-18z" fill="#FFC2D9" ${OL}/><path d="M38 52 q8 -6 16 0 M38 60 q8 6 16 0" stroke="#FF5C9A" stroke-width="3" fill="none"/>`) + steam.replaceAll("#FFFFFF", "#FFC2D9"), "SHAKES", "#FFFFFF");
station("Shake", "shake_ready", shakeBody(`<g transform="translate(46 58)">${shake}</g>`) + sparkle, "READY!", "#7CFF6B");
station("Shake", "shake_locked", shakeBody(`<path d="M34 40 h24 l-3 30 h-18z" fill="#DDDDDD" ${OL}/>`) + `<rect x="10" y="30" width="72" height="26" rx="6" fill="#3B2414" transform="rotate(-12 46 43)"/>` + `<g transform="rotate(-12 46 43)">${txt(46, 50, "LOCKED", 16, "#FFE14D", "#3B2414", 2)}</g>`, "SHAKES", "#BBBBBB");
put("Trash", "trash", 60, 70, `<path d="M10 18 h40 l-4 48 h-32z" fill="#5CBF4C" ${OL}/><path d="M20 26 v32 M30 26 v32 M40 26 v32" stroke="#3E8E33" stroke-width="3"/><rect x="6" y="10" width="48" height="10" rx="4" fill="#4CA03F" ${OL}/><rect x="23" y="4" width="14" height="8" rx="3" fill="#4CA03F" ${OL}/>`);
put("Trash", "trash_open", 60, 70, `<path d="M10 18 h40 l-4 48 h-32z" fill="#5CBF4C" ${OL}/><path d="M20 26 v32 M30 26 v32 M40 26 v32" stroke="#3E8E33" stroke-width="3"/><g transform="rotate(-35 8 18)"><rect x="6" y="10" width="48" height="10" rx="4" fill="#4CA03F" ${OL}/><rect x="23" y="4" width="14" height="8" rx="3" fill="#4CA03F" ${OL}/></g>`);

// ---------- chef ----------
const chef = (arm) => `<g transform="translate(36 52)"><path d="M-22 40 q0 -26 22 -26 q22 0 22 26z" fill="#FFFFFF" ${OL}/><circle cx="-6" cy="24" r="2" fill="#3B2414"/><circle cx="-6" cy="32" r="2" fill="#3B2414"/><circle cx="0" cy="-4" r="19" fill="#FFCFA0" ${OL}/><path d="M-17 -16 q-8 -18 6 -20 q4 -14 16 -8 q12 -8 16 6 q12 2 2 22z" fill="#FFFFFF" ${OL}/><circle cx="-6" cy="-4" r="3" fill="#3B2414"/><circle cx="6" cy="-4" r="3" fill="#3B2414"/><path d="M-9 4 q-6 2 -10 -2 M9 4 q6 2 10 -2" stroke="#5A3A22" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M-5 8 q5 4 10 0" stroke="#3B2414" stroke-width="2.5" fill="none" stroke-linecap="round"/><g transform="rotate(${arm} 18 22)"><path d="M18 22 l16 -14" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/><path d="M18 22 l16 -14" stroke="#3B2414" stroke-width="2" fill="none" opacity=".0"/><rect x="30" y="-8" width="5" height="18" fill="#8796A8" ${OL} transform="rotate(30 32 0)"/></g></g>`;
put("Chef", "chef1", 80, 100, chef(0));
put("Chef", "chef2", 80, 100, chef(-30));

// ---------- decor ----------
const plant = (x) => `<g transform="translate(${x} 0)"><path d="M-14 62 h28 l-4 20 h-20z" fill="#C46A2B" ${OL}/><path d="M0 62 q-20 -20 -12 -42 q10 14 12 42 q2 -30 16 -40 q6 24 -16 40" fill="#4CBF56" ${OL}/></g>`;
const lights = () => {
  let s = `<path d="M0 6 q60 12 120 0 q60 12 120 0 q60 12 120 0 q60 12 120 0" fill="none" stroke="#3B2414" stroke-width="2"/>`;
  const cols = ["#FF5C5C", "#FFE14D", "#4CA6FF", "#7CFF6B", "#FF8FB8"];
  for (let i = 0; i < 24; i++) {
    const x = 10 + i * 20, t = (x % 120) / 120, y = 6 + 12 * 2 * t * (1 - t);
    s += `<circle cx="${x}" cy="${y + 4}" r="5" fill="${cols[i % 5]}" stroke="#3B2414" stroke-width="1.5"/>`;
  }
  return s;
};
const plants = `<g transform="translate(0 86)">${plant(22) + plant(458)}</g>`;
put("Decor", "decor1", 480, 170, plants);
put("Decor", "decor2", 480, 170, plants + `<g transform="translate(0 142)">${lights()}</g>`);

// ---------- coin particle ----------
put("Coin", "coin", 16, 16, `<circle cx="8" cy="8" r="6.5" fill="#FFD500" stroke="#B07A00" stroke-width="2"/><path d="M8 4 v8" stroke="#B07A00" stroke-width="2"/>`);

// ---------- shop buttons (100x84) ----------
const button = (name, color, icon, label) =>
  put("ShopButton", name, 104, 88, `<rect x="4" y="6" width="96" height="78" rx="12" fill="#3B2414" opacity=".35" transform="translate(2 3)"/><rect x="4" y="4" width="96" height="78" rx="12" fill="${color}" ${OL}/><rect x="10" y="9" width="84" height="14" rx="7" fill="#FFFFFF" opacity=".35"/>${icon}${txt(52, 74, label, 15, "#FFFFFF", "#3B2414", 4)}`);
const flameIcon = `<g transform="translate(52 38) scale(1.2)"><path d="M0 14 q-14 -2 -12 -16 q2 -8 8 -14 q0 8 6 10 q4 -10 -2 -18 q16 8 14 24 q-2 12 -14 14z" fill="#FF6B1A" ${OL}/><path d="M0 10 q-6 -2 -4 -8 q4 2 6 -4 q6 6 -2 12z" fill="#FFE14D"/></g>`;
const stoolIcon = `<g transform="translate(52 40)"><ellipse cx="0" cy="-12" rx="20" ry="7" fill="#E5333B" ${OL}/><path d="M-10 -6 l-6 26 M10 -6 l6 26 M0 -6 v26" stroke="#3B2414" stroke-width="4" stroke-linecap="round"/><path d="M-12 10 h24" stroke="#3B2414" stroke-width="3"/></g>`;
const chefIcon = `<g transform="translate(52 44) scale(.55) translate(-36 -52)">${chef(0)}</g>`;
const decorIcon = `<g transform="translate(52 36) scale(.5) translate(0 -42)">${plant(0)}</g><circle cx="30" cy="22" r="5" fill="#FF5C5C" ${OL.replace("3", "2")}/><circle cx="74" cy="22" r="5" fill="#4CA6FF" ${OL.replace("3", "2")}/>`;
const shakeIcon = `<g transform="translate(52 42) scale(1.1)">${shake}</g>`;
button("b_grill", "#FF8C1A", flameIcon, "FAST GRILL");
button("b_seat", "#4C97FF", stoolIcon, "NEW SEAT");
button("b_chef", "#9966FF", chefIcon, "AUTO-CHEF");
button("b_decor", "#59C059", decorIcon, "DECOR");
button("b_shake", "#FF5C9A", shakeIcon, "SHAKES");
put("ShopButton", "b_next", 200, 60, `<rect x="6" y="8" width="188" height="48" rx="24" fill="#3B2414" opacity=".35"/><rect x="4" y="4" width="188" height="48" rx="24" fill="#FFD500" ${OL}/><rect x="16" y="9" width="164" height="12" rx="6" fill="#FFFFFF" opacity=".45"/>${txt(98, 40, "OPEN SHOP! &#9654;", 24, "#FFFFFF", "#3B2414", 6)}`);

// ---------- backdrops ----------
const topBar = `<rect width="480" height="36" fill="#3B2414"/><rect y="33" width="480" height="4" fill="#E5333B"/>${txt(372, 27, "DAY", 22, "#FFE14D", "#000", 0)}`;
let wall = `<rect y="36" width="480" height="140" fill="#FFF1D6"/>`;
for (let x = 0; x < 480; x += 40) wall += `<rect x="${x}" y="36" width="20" height="140" fill="#FFE2B3"/>`;
wall += `<rect y="124" width="480" height="8" fill="#E5333B"/><rect y="132" width="480" height="44" fill="#F7C873"/>`;
// menu board + window
wall += `<rect x="190" y="44" width="100" height="18" rx="4" fill="#3B2414"/>${txt(240, 58, "BURGER BARN", 13, "#FFE14D", "#000", 0)}`;
const counter = `<rect y="168" width="480" height="12" fill="#C46A2B" stroke="#3B2414" stroke-width="3"/><rect y="180" width="480" height="18" fill="#E5333B" stroke="#3B2414" stroke-width="3"/>` + [75, 185, 295, 405].map((x) => `<ellipse cx="${x}" cy="174" rx="34" ry="4" fill="#FFFFFF" opacity=".5"/>`).join("");
let floor = `<rect y="198" width="480" height="132" fill="#F4F4F4"/>`;
for (let y = 198, r = 0; y < 330; y += 22, r++) for (let x = (r % 2) * 22; x < 480; x += 44) floor += `<rect x="${x}" y="${y}" width="22" height="22" fill="#D9E3EE"/>`;
const trayStrip = `<rect y="328" width="480" height="32" fill="#3B2414"/><rect x="150" y="331" width="180" height="27" rx="13" fill="#C9D3DE" stroke="#8796A8" stroke-width="3"/>${txt(100, 352, "TRAY", 18, "#FFE14D", "#000", 0)}${txt(400, 352, "click to serve!", 13, "#C9A27A", "#000", 0)}`;
const diner = topBar + wall + counter + floor + trayStrip;
put("Stage", "diner", 480, 360, diner);
const panel = (title, color, lines) =>
  `<rect width="480" height="360" fill="#000" opacity=".55"/><rect x="34" y="40" width="412" height="300" rx="20" fill="#3B2414" opacity=".4" transform="translate(4 6)"/><rect x="34" y="40" width="412" height="300" rx="20" fill="#FFF6E0" stroke="#3B2414" stroke-width="5"/><rect x="34" y="40" width="412" height="56" rx="20" fill="${color}" stroke="#3B2414" stroke-width="5"/>${txt(240, 82, title, 34, "#FFFFFF", "#3B2414", 8)}${lines}`;
const label = (x, y, s) => `<text x="${x}" y="${y}" font-family="Sans Serif" font-weight="bold" font-size="17" fill="#3B2414">${s}</text>`;
put("Stage", "summary", 480, 360, diner + panel("DAY COMPLETE!", "#FF8C1A", label(60, 126, "Served") + label(60, 156, "Earned today") + label(250, 126, "Missed") + label(250, 156, "Bank")));
put("Stage", "closed", 480, 360, diner + panel("CLOSED DOWN!", "#E5333B", `${txt(240, 150, "Too many grumpy guests...", 22, "#FFE14D")}` + label(150, 205, "Days run") + label(150, 240, "Total cash") + `${txt(240, 312, "click to try again", 20, "#FFFFFF")}`));
put("Stage", "win", 480, 360, diner + panel("BURGER EMPIRE!", "#59C059", `${txt(240, 150, "You hit $800 in the bank!", 22, "#FFE14D")}` + label(150, 205, "Days taken") + label(150, 240, "Total cash") + `${txt(240, 312, "click to play again", 20, "#FFFFFF")}`));

// ---------- thumbnail ----------
const bigBurger = `<g transform="translate(240 236) scale(3.2)">${burger}</g>`;
const thumb = `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9A3C"/><stop offset="1" stop-color="#FFE0A3"/></linearGradient></defs><rect width="480" height="360" fill="url(#bg)"/>` +
  Array.from({ length: 12 }, (_, i) => `<path d="M240 236 L${240 + 600 * Math.cos((i * 30 * Math.PI) / 180)} ${236 + 600 * Math.sin((i * 30 * Math.PI) / 180)} L${240 + 600 * Math.cos(((i * 30 + 14) * Math.PI) / 180)} ${236 + 600 * Math.sin(((i * 30 + 14) * Math.PI) / 180)}Z" fill="#FFFFFF" opacity=".18"/>`).join("") +
  `<g transform="translate(80 250) scale(1.9) rotate(-12)">${fries}</g><g transform="translate(400 250) scale(1.9) rotate(12)">${drink}</g>` + bigBurger +
  [[70, 140], [410, 130], [150, 300], [330, 300]].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(1.4)"><circle r="9" fill="#FFD500" stroke="#B07A00" stroke-width="2.5"/><path d="M0 -5 v10" stroke="#B07A00" stroke-width="2.5"/></g>`).join("") +
  `<g transform="rotate(-5 240 90)"><text x="240" y="86" font-family="Marker" font-size="72" text-anchor="middle" fill="#7A1F00" opacity=".45" transform="translate(5 6)">BURGER</text>${txt(240, 86, "BURGER", 72, "#FFE14D", "#7A1F00", 12)}<text x="240" y="148" font-family="Marker" font-size="64" text-anchor="middle" fill="#7A1F00" opacity=".45" transform="translate(5 6)">TYCOON</text>${txt(240, 148, "TYCOON", 64, "#FFFFFF", "#7A1F00", 12)}</g>` +
  `<g transform="translate(236 314)"><rect width="234" height="34" rx="17" fill="#855CD6" stroke="#FFFFFF" stroke-width="3"/><rect x="11" y="8" width="26" height="18" rx="5" fill="#FFFFFF"/><text x="24" y="22" font-family="Sans Serif" font-weight="bold" font-size="13" fill="#855CD6" text-anchor="middle">{ }</text><text x="138" y="23" font-family="Sans Serif" font-weight="bold" font-size="14" fill="#FFFFFF" text-anchor="middle">Made with TextToScratch</text></g>` +
  `<g transform="translate(14 318)"><rect width="150" height="30" rx="15" fill="#3B2414"/>${txt(75, 22, "click to start!", 17, "#FFE14D", "#000", 0)}</g>`;
put("Thumbnail", "thumbnail", 480, 360, thumb);

for (const [p, s] of Object.entries(out)) {
  fs.mkdirSync(p.slice(0, p.lastIndexOf("/")), { recursive: true });
  fs.writeFileSync(p, s);
}
console.log("wrote", Object.keys(out).length, "svgs");
