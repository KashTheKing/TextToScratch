// Shared game state, enemy slot tables and the wave/win/lose referee.
export const game = {
  money: 0, lives: 0, wave: 0, waveActive: 0, spawning: 0, alive: 0, over: 0,
  sel: 1, placeType: 0, placeCell: 0, upgradeCell: -1, nextId: 0,
};
export const WAVES = 15;

// Enemy slots (index 0..SLOTS-1). Enemies write their position, towers subtract hp.
export const SLOTS = 40;
export const eon: number[] = [];
export const eid: number[] = [];
export const ex: number[] = [];
export const ey: number[] = [];
export const ehp: number[] = [];
export const emax: number[] = [];
export const eprog: number[] = [];
export const eslow: number[] = [];
export const etall: number[] = [];

// Map: 12 x 8 cells of 40px. Cell (c, r) centre = (-220 + 40c, 120 - 40r). 0 grass, 1 path, type*10+level tower.
export const grid: number[] = [];
export const wx: number[] = [-260, 140, 140, -140, -140, 260];
export const wy: number[] = [80, 80, 0, 0, -120, -120];

/** @warp */
function buildMap() {
  grid.length = 0;
  for (let i = 0; i < 96; i++) grid.push(0);
  for (let s = 0; s < 5; s++) {
    const steps = (Math.abs(wx[s + 1] - wx[s]) + Math.abs(wy[s + 1] - wy[s])) / 40;
    for (let k = 0; k <= steps; k++) {
      const x = wx[s] + ((wx[s + 1] - wx[s]) * k) / steps;
      const y = wy[s] + ((wy[s + 1] - wy[s]) * k) / steps;
      const c = Math.round((x + 220) / 40);
      const r = Math.round((120 - y) / 40);
      if (c >= 0 && c < 12 && r >= 0 && r < 8) grid[r * 12 + c] = 1;
    }
  }
  eon.length = 0; eid.length = 0; ex.length = 0; ey.length = 0; ehp.length = 0;
  emax.length = 0; eprog.length = 0; eslow.length = 0; etall.length = 0;
  for (let i = 0; i < SLOTS; i++) {
    eon.push(0); eid.push(0); ex.push(0); ey.push(0); ehp.push(0);
    emax.push(1); eprog.push(0); eslow.push(0); etall.push(0);
  }
}

whenFlag(() => {
  switchBackdrop("map");
  broadcast("setup");
});

onMessage("setup", () => {
  game.money = 120;
  game.lives = 20;
  game.wave = 0;
  game.waveActive = 0;
  game.spawning = 0;
  game.alive = 0;
  game.sel = 1;
  game.upgradeCell = -1;
  buildMap();
  game.over = 0;
  while (game.over === 0) {
    if (game.waveActive === 1 && game.spawning === 0 && game.alive <= 0) {
      game.waveActive = 0;
      if (game.wave >= WAVES) {
        game.over = 1;
        broadcast("win");
      } else {
        game.money += 15 + game.wave * 3;
        broadcast("wave clear");
      }
    }
    if (game.lives <= 0) {
      game.lives = 0;
      game.over = 1;
      broadcast("lose");
    }
    wait(0);
  }
});
