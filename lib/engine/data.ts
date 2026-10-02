// tts/data: text and list utilities, plus save codes (a string the player can copy to restore progress).
// Lists here are per sprite: fill Data.numbers / read Data.parts from the sprite that calls the functions.

/** Output of split(). */
export const parts: string[] = [];
/** Input/output of sortNumbers(), saveCode() and loadCode(). */
export const numbers: number[] = [];

/** Split `text` on a one-character separator into Data.parts. */
/** @warp */
export function split(text: string, separator: string) {
  parts.length = 0;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === separator) {
      parts.push(current);
      current = "";
    } else {
      current = current + text[i];
    }
  }
  parts.push(current);
}

/** Join Data.parts with a separator. */
/** @warp */
export function join(separator: string): string {
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) out = out + separator;
    out = out + parts[i];
  }
  return out;
}

/** Characters [start, start + length) of a string. */
/** @warp */
export function slice(text: string, start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length && i < text.length; i++) out = out + text[i];
  return out;
}

/** Position of `find` in `text` (0-based), or -1. Note: Scratch compares letters case-insensitively. */
/** @warp */
export function indexOf(text: string, find: string): number {
  for (let i = 0; i + find.length <= text.length; i++) {
    let match = true;
    for (let j = 0; j < find.length; j++) if (text[i + j] !== find[j]) match = false;
    if (match) return i;
  }
  return -1;
}

/** Replace every occurrence of `find` (non-empty) in `text`. */
/** @warp */
export function replaceAll(text: string, find: string, replacement: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    let match = i + find.length <= text.length;
    for (let j = 0; j < find.length; j++) if (text[i + j] !== find[j]) match = false;
    if (match) {
      out = out + replacement;
      i += find.length;
    } else {
      out = out + text[i];
      i++;
    }
  }
  return out;
}

/** Left-pad a number with zeros. */
/** @warp */
export function pad(n: number, width: number): string {
  let s = String(n);
  while (s.length < width) s = "0" + s;
  return s;
}

/** Seconds -> "m:ss". */
/** @warp */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = pad(Math.floor(seconds % 60), 2);
  return `${m}:${s}`;
}

/** Sort Data.numbers ascending (insertion sort; fine for a few hundred items). */
/** @warp */
export function sortNumbers() {
  for (let i = 1; i < numbers.length; i++) {
    const v = numbers[i];
    let j = i - 1;
    while (j >= 0 && numbers[j] > v) {
      numbers[j + 1] = numbers[j];
      j--;
    }
    numbers[j + 1] = v;
  }
}

/** Encode Data.numbers (integers) as a save code like "12-5-300-7k", with a checksum. */
/** @warp */
export function saveCode(): string {
  let out = "";
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    out = out + String(Math.round(numbers[i])) + "-";
    sum = (sum * 31 + Math.round(numbers[i]) + i) % 9973;
  }
  return out + "k" + String(sum);
}

/** Restore Data.numbers from a save code; returns false (and leaves the list empty) if it's invalid. */
/** @warp */
export function loadCode(code: string): boolean {
  numbers.length = 0;
  split(code, "-");
  if (parts.length < 1) return false;
  const check = parts[parts.length - 1];
  let sum = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    numbers.push(Number(parts[i]));
    sum = (sum * 31 + Number(parts[i]) + i) % 9973;
  }
  if (check !== "k" + String(sum)) {
    numbers.length = 0;
    return false;
  }
  return true;
}
