// Synthesizes the game's sounds (16-bit mono, 22050 Hz) into the sprite folders.
import fs from "node:fs";

const RATE = 22050;
const D = new URL("../src/", import.meta.url);

function wav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  return buf;
}

/** Notes: [startSec, durSec, freqStart, freqEnd, wave, volume] mixed together. */
function synth(len, notes) {
  const out = new Float32Array(Math.round(len * RATE));
  for (const [start, dur, f0, f1, wave, vol] of notes) {
    let phase = 0;
    const n = Math.round(dur * RATE);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      phase += ((f0 + (f1 - f0) * t) / RATE) * 2 * Math.PI;
      const env = Math.min(1, i / 60) * (1 - t) ** 2;
      const v = wave === "square" ? Math.sign(Math.sin(phase)) * 0.5 : wave === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : wave === "noise" ? Math.random() * 2 - 1 : Math.sin(phase);
      const j = Math.round(start * RATE) + i;
      if (j < out.length) out[j] += v * env * vol;
    }
  }
  return [...out];
}

// Seamless engine loop: whole cycles of 55/110 Hz over 0.4 s, no envelope.
function engine() {
  const n = Math.round(0.4 * RATE), out = [];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const saw = ((t * 55) % 1) * 2 - 1;
    out.push(0.22 * saw + 0.18 * Math.sign(Math.sin(2 * Math.PI * 110 * t)) * 0.5 + 0.08 * Math.sin(2 * Math.PI * 165 * t));
  }
  return out;
}

const files = {
  "Player/engine": engine(),
  "Player/boost": synth(0.6, [[0, 0.6, 180, 900, "square", 0.3], [0, 0.5, 0, 0, "noise", 0.2]]),
  "Player/bump": synth(0.18, [[0, 0.15, 140, 60, "square", 0.5], [0, 0.08, 0, 0, "noise", 0.4]]),
  "Player/skid": synth(0.3, [[0, 0.3, 0, 0, "noise", 0.25], [0, 0.3, 1400, 1200, "tri", 0.08]]),
  "Player/lap": synth(0.5, [[0, 0.12, 784, 784, "tri", 0.45], [0.1, 0.12, 988, 988, "tri", 0.45], [0.2, 0.3, 1319, 1319, "tri", 0.45]]),
  "Countdown/beep": synth(0.25, [[0, 0.25, 660, 660, "square", 0.35]]),
  "Countdown/go": synth(0.6, [[0, 0.6, 1320, 1320, "square", 0.35], [0, 0.6, 660, 660, "tri", 0.3]]),
  "Panel/win": synth(1.4, [[0, 0.15, 523, 523, "square", 0.25], [0.15, 0.15, 659, 659, "square", 0.25], [0.3, 0.15, 784, 784, "square", 0.25], [0.45, 0.3, 1047, 1047, "square", 0.25], [0.75, 0.15, 784, 784, "square", 0.25], [0.9, 0.5, 1047, 1047, "tri", 0.45]]),
  "Panel/lose": synth(1.0, [[0, 0.25, 523, 523, "tri", 0.45], [0.25, 0.25, 440, 440, "tri", 0.45], [0.5, 0.5, 392, 330, "tri", 0.45]]),
  "Panel/select": synth(0.15, [[0, 0.15, 600, 1200, "tri", 0.4]]),
};
for (const [name, s] of Object.entries(files)) fs.writeFileSync(new URL(name + ".wav", D), wav(s));
console.log("wrote", Object.keys(files).join(", "));
