// TextToScratch ambient API. Every function here compiles to a Scratch block.
// SpriteName / CostumeName / BackdropName / SoundName come from the generated sprites.d.ts.

type Key =
  | "space" | "up arrow" | "down arrow" | "left arrow" | "right arrow" | "any"
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z"
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type GraphicEffect = "color" | "fisheye" | "whirl" | "pixelate" | "mosaic" | "brightness" | "ghost";
type SoundEffect = "pitch" | "pan";
type PenParam = "color" | "saturation" | "brightness" | "transparency";
type Value = string | number | boolean;

// ---------- events (top level only) ----------
/** when green flag clicked */
declare function whenFlag(body: () => void): void;
/** when [key] key pressed */
declare function whenKey(key: Key, body: () => void): void;
/** when this sprite (or the stage) clicked */
declare function whenClicked(body: () => void): void;
/** when backdrop switches to [name] */
declare function whenBackdrop(name: BackdropName, body: () => void): void;
/** when [loudness/timer] > value */
declare function whenGreater(sensor: "loudness" | "timer", value: number, body: () => void): void;
/** when I receive [message] */
declare function onMessage(message: string, body: () => void): void;
/** when I start as a clone */
declare function onClone(body: () => void): void;
declare function broadcast(message: string): void;
declare function broadcastAndWait(message: string): void;

// ---------- motion ----------
declare function move(steps: number): void;
declare function turnRight(degrees: number): void;
declare function turnLeft(degrees: number): void;
declare function goTo(x: number, y: number): void;
/** go to sprite, "mouse" or "random" */
declare function goToTarget(target: SpriteName | "mouse" | "random"): void;
declare function glide(secs: number, x: number, y: number): void;
declare function glideToTarget(secs: number, target: SpriteName | "mouse" | "random"): void;
declare function pointInDirection(degrees: number): void;
declare function pointTowards(target: SpriteName | "mouse"): void;
declare function bounceOnEdge(): void;

// ---------- looks ----------
declare function say(message: Value): void;
declare function sayFor(message: Value, secs: number): void;
declare function think(message: Value): void;
declare function thinkFor(message: Value, secs: number): void;
declare function switchCostume(costume: CostumeName | number): void;
declare function nextCostume(): void;
declare function switchBackdrop(backdrop: BackdropName | number): void;
declare function nextBackdrop(): void;
declare function changeEffect(effect: GraphicEffect, by: number): void;
declare function setEffect(effect: GraphicEffect, value: number): void;
declare function clearEffects(): void;
declare function goToFront(): void;
declare function goToBack(): void;
declare function moveForward(layers: number): void;
declare function moveBackward(layers: number): void;

// ---------- sound ----------
declare function playSound(sound: SoundName | number): void;
declare function playSoundUntilDone(sound: SoundName | number): void;
declare function stopAllSounds(): void;
declare function setSoundEffect(effect: SoundEffect, value: number): void;
declare function changeSoundEffect(effect: SoundEffect, by: number): void;
declare function clearSoundEffects(): void;

// ---------- control ----------
declare function wait(secs: number): void;
declare function waitUntil(condition: () => boolean): void;
declare function repeat(times: number, body: () => void): void;
declare function forever(body: () => void): void;
declare function stopAll(): void;
declare function stopThis(): void;
declare function stopOthers(): void;
declare function createClone(target?: SpriteName | "myself"): void;
declare function deleteClone(): void;

// ---------- sensing ----------
declare function touching(target: SpriteName | "edge" | "mouse"): boolean;
declare function touchingColor(color: string): boolean;
declare function distanceTo(target: SpriteName | "mouse"): number;
declare function askAndWait(question: Value): void;
declare function answer(): string;
declare function keyPressed(key: Key): boolean;
declare function mouseDown(): boolean;
declare function mouseX(): number;
declare function mouseY(): number;
declare function loudness(): number;
declare function timer(): number;
declare function resetTimer(): void;
declare function daysSince2000(): number;
declare function username(): string;
declare function current(unit: "year" | "month" | "date" | "dayofweek" | "hour" | "minute" | "second"): number;
/** [property] of [sprite]; property may also be a sprite-local variable name */
declare function valueOf(
  target: SpriteName | "_stage_",
  property: "x position" | "y position" | "direction" | "costume #" | "costume name" | "size" | "volume" | "backdrop #" | "backdrop name" | (string & {})
): Value;

// ---------- operators ----------
/** pick random from..to (integers unless a decimal is passed) */
declare function random(from: number, to: number): number;
declare function sin(degrees: number): number;
declare function cos(degrees: number): number;
declare function tan(degrees: number): number;
declare function asin(x: number): number;
declare function acos(x: number): number;
declare function atan(x: number): number;

// ---------- variables / lists ----------
declare function showVariable(variable: Value | Value[]): void;
declare function hideVariable(variable: Value | Value[]): void;
interface Array<T> {
  /** insert at 0-based index */
  insert(index: number, item: T): void;
  /** delete at 0-based index */
  remove(index: number): void;
  includes(item: T): boolean;
}
interface String {
  includes(text: string): boolean;
}

// ---------- pen ----------
declare function penDown(): void;
declare function penUp(): void;
declare function penClear(): void;
declare function stamp(): void;
declare function setPenColor(color: string): void;
declare function setPenSize(size: number): void;
declare function changePenSize(by: number): void;
declare function setPenParam(param: PenParam, value: number): void;
declare function changePenParam(param: PenParam, by: number): void;

// ---------- this sprite ----------
declare const me: {
  x: number;
  y: number;
  direction: number;
  size: number;
  volume: number;
  visible: boolean;
  draggable: boolean;
  rotationStyle: "all around" | "left-right" | "don't rotate";
  readonly costumeNumber: number;
  readonly costumeName: string;
  readonly backdropNumber: number;
  readonly backdropName: string;
};
