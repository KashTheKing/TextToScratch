// tts/scene: simple game states (menu, playing, game over...).
//
//   Scene.go("playing");                     // anywhere
//   onMessage("scene playing", () => { ... }) // in each sprite that cares
//   if (Scene.is("playing")) { ... }

export const scene = { current: "" };

/** Switch scene and broadcast "scene <name>". */
/** @warp */
export function go(name: string) {
  scene.current = name;
  broadcast("scene " + name);
}

/** @warp */
export function is(name: string): boolean {
  return scene.current === name;
}
