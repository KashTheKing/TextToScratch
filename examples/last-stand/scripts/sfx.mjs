// Synthesizes Last Stand's sound effects into the sprite folders (16-bit mono, 22050 Hz).
// Run from examples/last-stand: node scripts/sfx.mjs
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

// music: 4-bar bass + arp loop, 120 bpm, quiet
const bass = [110, 110, 131, 98];
const arp = [440, 523, 659, 523];
const music = [];
for (let bar = 0; bar < 4; bar++) {
  for (let b = 0; b < 8; b++) {
    const t = bar * 2 + b * 0.25;
    music.push([t, 0.22, bass[bar], bass[bar], "tri", 0.35]);
    music.push([t + 0.125, 0.1, arp[(b + bar) % 4] * (b % 2 ? 1 : 0.75), arp[(b + bar) % 4], "square", 0.06]);
  }
  music.push([bar * 2, 0.05, 2000, 200, "noise", 0.12]);
  music.push([bar * 2 + 1, 0.05, 2000, 200, "noise", 0.12]);
}

const sounds = {
  "Bullet/shoot": synth(0.1, [[0, 0.08, 900, 300, "square", 0.25], [0, 0.04, 0, 0, "noise", 0.15]]),
  "Enemy/hit": synth(0.07, [[0, 0.07, 400, 250, "tri", 0.45]]),
  "Enemy/pop": synth(0.25, [[0, 0.2, 300, 60, "square", 0.3], [0, 0.15, 0, 0, "noise", 0.3]]),
  "Hero/hurt": synth(0.3, [[0, 0.28, 220, 80, "square", 0.4], [0, 0.1, 0, 0, "noise", 0.25]]),
  "Pickup/powerup": synth(0.35, [[0, 0.1, 523, 523, "tri", 0.45], [0.07, 0.1, 784, 784, "tri", 0.45], [0.14, 0.2, 1047, 1319, "sine", 0.4]]),
  "Pickup/drop": synth(0.12, [[0, 0.12, 700, 1200, "sine", 0.3]]),
  "Card/choose": synth(0.5, [[0, 0.12, 659, 659, "square", 0.22], [0.08, 0.12, 784, 784, "square", 0.22], [0.16, 0.12, 988, 988, "square", 0.22], [0.24, 0.25, 1319, 1319, "tri", 0.4]]),
  "Card/appear": synth(0.3, [[0, 0.3, 300, 900, "tri", 0.3]]),
  "Banner/wave": synth(0.9, [[0, 0.25, 196, 196, "square", 0.3], [0.25, 0.25, 196, 196, "square", 0.3], [0.5, 0.4, 294, 294, "square", 0.35], [0, 0.9, 98, 98, "tri", 0.4]]),
  "Stage/gameover": synth(1.3, [[0, 0.3, 392, 392, "tri", 0.45], [0.25, 0.3, 330, 330, "tri", 0.45], [0.5, 0.8, 262, 150, "tri", 0.45]]),
  "Stage/music": synth(8, music),
  "Thumbnail/start": synth(0.45, [[0, 0.15, 392, 392, "square", 0.25], [0.1, 0.15, 523, 523, "square", 0.25], [0.2, 0.25, 784, 784, "tri", 0.45]]),
};
for (const [name, s] of Object.entries(sounds)) {
  fs.mkdirSync("src/" + name.split("/")[0], { recursive: true });
  fs.writeFileSync(`src/${name}.wav`, wav(s));
}
console.log("wrote", Object.keys(sounds).join(", "));
