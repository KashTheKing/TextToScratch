// HUD + input: redraws the pen layer every frame (numbers, health bars, range preview) and handles clicks.
import { game, WAVES, SLOTS, eon, ex, ey, ehp, emax, etall, grid } from "./Stage";

const COST: number[] = [50, 90, 70];
const RANGE: number[] = [95, 110, 125, 85, 95, 110, 75, 90, 105];
const BTN_X: number[] = [50, 100, 150];

let wasDown = 0;
let hoverCell = -1;

/** @warp */
function drawNum(text: string, x: number, y: number) {
  me.size = 100;
  setEffect("ghost", 0);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "/") switchCostume("slash");
    else if (ch === "$") switchCostume("dollar");
    else if (ch === "+") switchCostume("plus");
    else switchCostume(("d" + ch) as any);
    goTo(x + i * 12, y);
    stamp();
  }
}

/** @warp */
function ring(x: number, y: number, r: number, color: string) {
  setPenColor(color);
  setPenParam("transparency", 78);
  setPenSize(r * 2);
  goTo(x, y);
  penDown();
  penUp();
  setPenParam("transparency", 0);
  setPenSize(2);
  penUp();
  goTo(x + r, y);
  penDown();
  for (let a = 10; a <= 360; a += 10) goTo(x + r * cos(a), y + r * sin(a));
  penUp();
}

/** @warp */
function box(x: number, y: number, w: number, h: number, size: number, color: string) {
  setPenColor(color);
  setPenSize(size);
  penUp();
  goTo(x - w / 2, y - h / 2);
  penDown();
  goTo(x + w / 2, y - h / 2);
  goTo(x + w / 2, y + h / 2);
  goTo(x - w / 2, y + h / 2);
  goTo(x - w / 2, y - h / 2);
  penUp();
}

/** @warp */
function stampTower(t: number, x: number, y: number, size: number, ghost: number) {
  if (t === 1) switchCostume("parrow");
  if (t === 2) switchCostume("pcannon");
  if (t === 3) switchCostume("pfrost");
  me.size = size;
  setEffect("ghost", ghost);
  goTo(x, y);
  stamp();
  setEffect("ghost", 0);
}

/** @warp */
function draw() {
  penClear();
  setPenParam("transparency", 0);
  drawNum(String(game.lives), -205, 158);
  drawNum(String(game.money), -134, 158);
  drawNum(game.wave + "/" + WAVES, -43, 158);
  for (let b = 0; b < 3; b++) {
    stampTower(b + 1, BTN_X[b], 166, 55, game.money >= COST[b] ? 0 : 60);
  }
  box(BTN_X[game.sel - 1], 160, 46, 35, 3, "#FFE14D");
  if (game.waveActive === 1) {
    setPenColor("#22306E");
    setPenParam("transparency", 45);
    setPenSize(30);
    penUp(); goTo(194, 160); penDown(); goTo(220, 160); penUp();
    setPenParam("transparency", 0);
  }
  // tower level pips
  setPenSize(5);
  for (let c = 0; c < 96; c++) {
    if (grid[c] >= 10) {
      const lv = grid[c] % 10;
      const cx = -220 + (c % 12) * 40;
      const cy = 120 - Math.floor(c / 12) * 40;
      setPenColor("#FFE14D");
      for (let p = 0; p < lv; p++) {
        goTo(cx - (lv - 1) * 4 + p * 8, cy - 22);
        penDown();
        penUp();
      }
    }
  }
  // health bars
  for (let i = 0; i < SLOTS; i++) {
    if (eon[i] === 1 && ehp[i] < emax[i]) {
      const bx = ex[i] - 14;
      const by = ey[i] + etall[i];
      setPenSize(5);
      setPenColor("#3A1020");
      penUp(); goTo(bx, by); penDown(); goTo(bx + 28, by); penUp();
      setPenSize(3);
      setPenColor("#5CFF6A");
      goTo(bx, by); penDown(); goTo(bx + Math.max(0, (28 * ehp[i]) / emax[i]), by); penUp();
    }
  }
  // hover preview
  if (hoverCell >= 0 && game.over === 0) {
    const hx = -220 + (hoverCell % 12) * 40;
    const hy = 120 - Math.floor(hoverCell / 12) * 40;
    const g = grid[hoverCell];
    if (g === 0) {
      const ok = game.money >= COST[game.sel - 1];
      ring(hx, hy, RANGE[(game.sel - 1) * 3], ok ? "#FFFFFF" : "#FF4D4D");
      stampTower(game.sel, hx, hy, 100, ok ? 45 : 75);
    } else if (g >= 10) {
      const t = Math.floor(g / 10);
      const lv = g % 10;
      ring(hx, hy, RANGE[(t - 1) * 3 + lv - 1], "#FFE14D");
      if (lv < 3) drawNum("+$" + upgradeCost(t, lv), hx - 18, hy + 30);
    } else {
      box(hx, hy, 38, 38, 3, "#FF4D4D");
    }
  }
}

function upgradeCost(t: number, lv: number): number {
  return Math.round(COST[t - 1] * lv * 0.75);
}

function click() {
  const mx = mouseX();
  const my = mouseY();
  if (my > 140) {
    for (let b = 0; b < 3; b++) {
      if (Math.abs(mx - BTN_X[b]) < 23) {
        game.sel = b + 1;
        playSound("click");
      }
    }
    if (mx > 178 && mx < 236) {
      if (game.waveActive === 0 && game.over === 0) {
        game.wave++;
        game.waveActive = 1;
        game.spawning = 1;
        playSound("click");
        broadcast("start wave");
      } else {
        playSound("deny");
      }
    }
    return;
  }
  if (hoverCell < 0) return;
  const g = grid[hoverCell];
  if (g === 0) {
    const cost = COST[game.sel - 1];
    if (game.money >= cost) {
      game.money -= cost;
      game.placeType = game.sel;
      game.placeCell = hoverCell;
      grid[hoverCell] = game.sel * 10 + 1;
      broadcast("place");
    } else {
      playSound("deny");
    }
  } else if (g >= 10 && g % 10 < 3) {
    const price = upgradeCost(Math.floor(g / 10), g % 10);
    if (game.money >= price && game.upgradeCell < 0) {
      game.money -= price;
      game.upgradeCell = hoverCell;
    } else {
      playSound("deny");
    }
  } else {
    playSound("deny");
  }
}

whenFlag(() => {
  me.visible = false;
  penClear();
  wait(0.1);
  forever(() => {
    hoverCell = -1;
    const c = Math.round((mouseX() + 220) / 40);
    const r = Math.round((120 - mouseY()) / 40);
    if (mouseY() < 140 && c >= 0 && c < 12 && r >= 0 && r < 8) hoverCell = r * 12 + c;
    if (mouseDown()) {
      if (wasDown === 0 && game.over === 0) click();
      wasDown = 1;
    } else {
      wasDown = 0;
    }
    draw();
  });
});
