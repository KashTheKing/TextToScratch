// Dead Zone: first-person co-op zombie defense. The View sprite runs the game and draws the 3D view
// (a raycaster that stamps wall slices and billboards onto the pen layer); Gun draws the weapon on top.

/** Host -> clients zombie/world packets (tts/net already uses 7 of Scratch's 10 cloud variables). */
/** @cloud */
export const zcloud = { z1: 0, z2: 0 };

export const game = {
  phase: 0, // 0 title / waiting, 1 playing, 2 game over
  weapon: 0, // 0 pistol, 1 shotgun, 2 rifle
  shotSeq: 0,
  reloadSeq: 0,
  emptySeq: 0,
  switchSeq: 0,
  fireAt: 0,
  reloading: false,
  bob: 0,
  down: false,
  started: false,
  titleDone: false,
};

whenFlag(() => {
  switchBackdrop("night");
  game.phase = 0;
  game.started = false;
  game.titleDone = false;
  forever(() => {
    playSoundUntilDone("wind");
  });
});
