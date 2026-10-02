// Synthesizes Burger Tycoon's sounds (16-bit mono 22050 Hz WAVs) into the sprite folders. Run: node scripts/sfx.mjs
import fs from "node:fs";

const RATE = 22050;

function wav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  return buf;
}

/** Notes: [startSec, durSec, freqStart, freqEnd, wave, volume] mixed together. wave "noise" = white noise. */
function synth(len, notes) {
  const out = new Float32Array(Math.round(len * RATE));
  for (const [start, dur, f0, f1, wave, vol] of notes) {
    let phase = 0;
    const n = Math.round(dur * RATE);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      phase += ((f0 + (f1 - f0) * t) / RATE) * 2 * Math.PI;
      const env = Math.min(1, i / 60) * (1 - t) ** 2;
      const v = wave === "noise" ? Math.random() * 2 - 1 : wave === "square" ? Math.sign(Math.sin(phase)) * 0.5 : wave === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase);
      const j = Math.round(start * RATE) + i;
      if (j < out.length) out[j] += v * env * vol;
    }
  }
  return [...out];
}

// sizzle: crackly noise bursts
const sizzleNotes = [];
for (let i = 0; i < 14; i++) sizzleNotes.push([i * 0.045, 0.06, 0, 0, "noise", 0.18 + Math.random() * 0.12]);
// bubbling fryer
const bubbleNotes = [];
for (let i = 0; i < 9; i++) bubbleNotes.push([i * 0.06, 0.05, 300 + Math.random() * 300, 700 + Math.random() * 300, "sine", 0.35]);

const s = {
  pop: synth(0.1, [[0, 0.09, 600, 1100, "tri", 0.5]]),
  ding: synth(0.5, [[0, 0.5, 1568, 1568, "sine", 0.4], [0, 0.4, 3136, 3136, "sine", 0.12]]),
  sizzle: synth(0.65, sizzleNotes),
  bubble: synth(0.55, bubbleNotes),
  pour: synth(0.6, [[0, 0.6, 0, 0, "noise", 0.12], [0, 0.6, 400, 900, "sine", 0.15]]),
  blend: synth(0.8, [[0, 0.8, 140, 220, "square", 0.18], [0, 0.8, 0, 0, "noise", 0.06]]),
  burnt: synth(0.5, [[0, 0.25, 300, 200, "square", 0.25], [0.2, 0.3, 220, 140, "square", 0.25]]),
  trash: synth(0.3, [[0, 0.25, 0, 0, "noise", 0.3], [0, 0.2, 200, 80, "tri", 0.4]]),
  deny: synth(0.18, [[0, 0.17, 180, 140, "square", 0.25]]),
  bell: synth(0.6, [[0, 0.6, 1318, 1318, "sine", 0.35], [0.12, 0.5, 1046, 1046, "sine", 0.3]]),
  cash: synth(0.7, [[0, 0.08, 0, 0, "noise", 0.3], [0.02, 0.1, 2093, 2093, "square", 0.18], [0.1, 0.5, 2637, 2637, "sine", 0.35], [0.1, 0.55, 3136, 3136, "sine", 0.25], [0.1, 0.3, 1318, 1318, "tri", 0.2]]),
  grumble: synth(0.5, [[0, 0.5, 160, 110, "square", 0.22], [0, 0.5, 163, 108, "tri", 0.3]]),
  buy: synth(0.5, [[0, 0.1, 784, 784, "square", 0.22], [0.08, 0.1, 988, 988, "square", 0.22], [0.16, 0.3, 1568, 1568, "tri", 0.4]]),
  daystart: synth(0.9, [[0, 0.15, 523, 523, "tri", 0.4], [0.12, 0.15, 659, 659, "tri", 0.4], [0.24, 0.15, 784, 784, "tri", 0.4], [0.36, 0.5, 1047, 1047, "tri", 0.45], [0.36, 0.5, 523, 523, "square", 0.12]]),
  dayover: synth(1.0, [[0, 0.2, 784, 784, "tri", 0.4], [0.18, 0.2, 659, 659, "tri", 0.4], [0.36, 0.2, 784, 784, "tri", 0.4], [0.54, 0.45, 1047, 1047, "tri", 0.45], [0.54, 0.45, 1319, 1319, "sine", 0.25]]),
  gameover: synth(1.2, [[0, 0.3, 392, 392, "tri", 0.45], [0.25, 0.3, 330, 330, "tri", 0.45], [0.5, 0.7, 262, 196, "tri", 0.45]]),
  win: synth(1.6, [[0, 0.15, 523, 523, "square", 0.2], [0.13, 0.15, 659, 659, "square", 0.2], [0.26, 0.15, 784, 784, "square", 0.2], [0.39, 0.3, 1047, 1047, "square", 0.2], [0.6, 0.15, 784, 784, "tri", 0.4], [0.73, 0.9, 1047, 1047, "tri", 0.45], [0.73, 0.9, 1319, 1319, "sine", 0.25]]),
};

// Music loop: bouncy diner bass + melody, 8 beats at 140bpm.
const beat = 60 / 140;
const music = [];
const bass = [131, 196, 165, 196, 147, 220, 175, 220, 131, 196, 165, 196, 196, 247, 147, 196];
bass.forEach((f, i) => music.push([i * beat / 2, beat / 2 * 0.9, f, f, "tri", 0.22]));
const mel = [523, 0, 659, 784, 659, 0, 523, 587, 0, 698, 880, 698, 0, 587, 659, 0, 523, 0, 659, 784, 880, 784, 659, 587, 523, 0, 494, 523, 0, 0, 0, 0];
mel.forEach((f, i) => f && music.push([i * beat / 4, beat / 4 * 0.85, f, f, "square", 0.07]));
for (let i = 0; i < 16; i++) music.push([i * beat / 2, 0.03, 0, 0, "noise", i % 2 ? 0.08 : 0.04]);
const loop = synth(8 * beat, music);

const where = {
  Grill: ["sizzle", "ding", "burnt", "pop", "deny", "trash"],
  Fryer: ["bubble", "ding", "burnt", "pop", "deny", "trash"],
  Soda: ["pour", "ding", "pop", "deny"],
  Shake: ["blend", "ding", "pop", "deny"],
  Trash: ["trash", "deny"],
  Customer: ["bell", "cash", "grumble", "deny"],
  ShopButton: ["buy", "deny", "pop"],
  Stage: ["daystart", "dayover", "gameover", "win"],
};
for (const [dir, names] of Object.entries(where)) {
  fs.mkdirSync(`src/${dir}`, { recursive: true });
  for (const n of names) fs.writeFileSync(`src/${dir}/${n}.wav`, wav(s[n]));
}
fs.writeFileSync("src/Stage/music.wav", wav(loop));
console.log("sounds written");
