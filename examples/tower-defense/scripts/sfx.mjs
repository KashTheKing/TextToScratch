// Synthesizes the game sound effects into the sprite folders (16-bit mono, 22050 Hz). Run from examples/tower-defense.
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

/** Notes: [startSec, durSec, freqStart, freqEnd, wave, volume] mixed together. */
function synth(len, notes) {
  const out = new Float32Array(Math.round(len * RATE));
  for (const [start, dur, f0, f1, wave, vol] of notes) {
    let phase = 0;
    const n = Math.round(dur * RATE);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      phase += ((f0 + (f1 - f0) * t) / RATE) * 2 * Math.PI;
      const env = Math.min(1, i / 60) * (1 - t) ** 2; // quick attack, smooth decay
      const v = wave === "square" ? Math.sign(Math.sin(phase)) * 0.5 : wave === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase);
      const j = Math.round(start * RATE) + i;
      if (j < out.length) out[j] += v * env * vol;
    }
  }
  return [...out];
}


function noise(len, vol, f = 1) {
  const out = []; let v = 0;
  for (let i = 0; i < len * RATE; i++) { if (i % f === 0) v = Math.random() * 2 - 1; out.push(v * vol * (1 - i / (len * RATE)) ** 2); }
  return out;
}
const mix = (a, b) => a.map((v, i) => v + (b[i] || 0));

const sounds = {
  Tower: {
    arrow: synth(0.09, [[0, 0.09, 1400, 600, "tri", 0.35]]),
    cannon: mix(synth(0.3, [[0, 0.25, 140, 50, "square", 0.4]]), noise(0.3, 0.35, 3)),
    frost: synth(0.25, [[0, 0.2, 1800, 2400, "sine", 0.25], [0.05, 0.2, 2600, 2000, "sine", 0.2]]),
    boom: mix(noise(0.4, 0.5, 6), synth(0.4, [[0, 0.35, 90, 40, "sine", 0.6]])),
    place: synth(0.2, [[0, 0.08, 330, 330, "square", 0.25], [0.07, 0.12, 494, 494, "square", 0.25]]),
    upgrade: synth(0.4, [[0, 0.1, 523, 523, "tri", 0.4], [0.08, 0.1, 659, 659, "tri", 0.4], [0.16, 0.22, 1047, 1047, "tri", 0.4]]),
  },
  Enemy: {
    pop: synth(0.12, [[0, 0.12, 300, 900, "sine", 0.45]]),
    coin: synth(0.18, [[0, 0.06, 988, 988, "square", 0.18], [0.05, 0.13, 1319, 1319, "square", 0.18]]),
    leak: synth(0.35, [[0, 0.35, 400, 120, "square", 0.3]]),
    bossdie: mix(noise(0.9, 0.4, 8), synth(0.9, [[0, 0.9, 200, 40, "square", 0.3]])),
  },
  HUD: {
    click: synth(0.05, [[0, 0.05, 900, 700, "tri", 0.4]]),
    deny: synth(0.18, [[0, 0.18, 180, 140, "square", 0.25]]),
  },
  Banner: {
    wave: synth(0.5, [[0, 0.12, 392, 392, "square", 0.25], [0.12, 0.12, 523, 523, "square", 0.25], [0.24, 0.25, 659, 659, "square", 0.25]]),
    boss: synth(1.2, [[0, 0.4, 110, 104, "square", 0.35], [0.4, 0.4, 104, 98, "square", 0.35], [0.8, 0.4, 98, 82, "square", 0.35]]),
    win: synth(1.4, [[0, 0.2, 523, 523, "tri", 0.4], [0.18, 0.2, 659, 659, "tri", 0.4], [0.36, 0.2, 784, 784, "tri", 0.4], [0.54, 0.8, 1047, 1047, "tri", 0.45], [0.54, 0.8, 523, 523, "sine", 0.3]]),
    lose: synth(1.2, [[0, 0.3, 392, 392, "tri", 0.45], [0.28, 0.3, 330, 330, "tri", 0.45], [0.56, 0.6, 262, 196, "tri", 0.45]]),
  },
};
for (const [sprite, set] of Object.entries(sounds)) {
  fs.mkdirSync(`src/${sprite}`, { recursive: true });
  for (const [name, s] of Object.entries(set)) fs.writeFileSync(`src/${sprite}/${name}.wav`, wav(s));
}
console.log("wrote sounds");
