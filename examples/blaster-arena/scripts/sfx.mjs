// Synthesizes Blaster Arena's sounds into the sprite folders (16-bit mono, 22050 Hz).
// Run from examples/blaster-arena: node scripts/sfx.mjs
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

/** Notes: [startSec, durSec, freqStart, freqEnd, wave, volume] mixed together. wave "noise" ignores freq. */
function synth(len, notes, sustain = false) {
  const out = new Float32Array(Math.round(len * RATE));
  for (const [start, dur, f0, f1, wave, vol] of notes) {
    let phase = 0;
    const n = Math.round(dur * RATE);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      phase += ((f0 + (f1 - f0) * t) / RATE) * 2 * Math.PI;
      const env = Math.min(1, i / 60) * (sustain ? Math.min(1, (n - i) / 300) : (1 - t) ** 2);
      const v = wave === "noise" ? Math.random() * 2 - 1 : wave === "square" ? Math.sign(Math.sin(phase)) * 0.5 : wave === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase);
      const j = Math.round(start * RATE) + i;
      if (j < out.length) out[j] += v * env * vol;
    }
  }
  return [...out];
}

// Short chiptune loop: 4 bars at 140 bpm, bass + arpeggio.
function music() {
  const beat = 60 / 140 / 2; // eighth notes
  const notes = [];
  const chords = [[110, 220, 262, 330], [87.3, 175, 220, 262], [98, 196, 247, 294], [82.4, 165, 208, 247]];
  chords.forEach(([bass, ...arp], bar) => {
    for (let k = 0; k < 8; k++) {
      const t = (bar * 8 + k) * beat;
      notes.push([t, beat * 0.9, bass, bass, "tri", 0.35]);
      notes.push([t, beat * 0.6, arp[k % 3] * 2, arp[k % 3] * 2, "square", 0.07]);
      if (k % 4 === 0) notes.push([t, 0.05, 0, 0, "noise", 0.12]);
      if (k % 4 === 2) notes.push([t, 0.03, 0, 0, "noise", 0.05]);
    }
  });
  return synth(32 * beat, notes);
}

const sounds = {
  Me: {
    shoot: synth(0.12, [[0, 0.12, 1200, 300, "square", 0.3]]),
    hurt: synth(0.18, [[0, 0.18, 300, 120, "square", 0.35], [0, 0.08, 0, 0, "noise", 0.2]]),
    explode: synth(0.6, [[0, 0.6, 0, 0, "noise", 0.6], [0, 0.4, 140, 40, "square", 0.35]]),
    respawn: synth(0.4, [[0, 0.4, 300, 1200, "tri", 0.4], [0.1, 0.3, 600, 1800, "sine", 0.2]]),
    chat: synth(0.12, [[0, 0.05, 880, 880, "tri", 0.4], [0.06, 0.06, 1320, 1320, "tri", 0.4]]),
  },
  Others: {
    pew: synth(0.12, [[0, 0.12, 1000, 260, "square", 0.22]]),
    boom: synth(0.5, [[0, 0.5, 0, 0, "noise", 0.5], [0, 0.35, 120, 40, "square", 0.3]]),
    blip: synth(0.12, [[0, 0.05, 660, 660, "tri", 0.4], [0.06, 0.06, 990, 990, "tri", 0.4]]),
  },
  Bot: {
    zap: synth(0.14, [[0, 0.14, 700, 200, "tri", 0.35], [0, 0.06, 0, 0, "noise", 0.08]]),
    clank: synth(0.1, [[0, 0.1, 900, 500, "square", 0.25], [0, 0.04, 0, 0, "noise", 0.25]]),
    boom: synth(0.5, [[0, 0.5, 0, 0, "noise", 0.5], [0, 0.35, 120, 40, "square", 0.3]]),
  },
  Bullet: {
    plink: synth(0.06, [[0, 0.06, 1800, 900, "tri", 0.25]]),
  },
  Stage: {
    music: music(),
    kill: synth(0.35, [[0, 0.1, 988, 988, "square", 0.25], [0.08, 0.27, 1319, 1319, "square", 0.25]]),
    start: synth(0.7, [[0, 0.15, 392, 392, "square", 0.25], [0.15, 0.15, 523, 523, "square", 0.25], [0.3, 0.4, 784, 784, "square", 0.3]]),
  },
  Title: {
    win: synth(1.2, [[0, 0.15, 523, 523, "square", 0.3], [0.15, 0.15, 659, 659, "square", 0.3], [0.3, 0.15, 784, 784, "square", 0.3], [0.45, 0.7, 1047, 1047, "tri", 0.45], [0.45, 0.7, 523, 523, "tri", 0.3]]),
    lose: synth(1.2, [[0, 0.3, 392, 392, "tri", 0.45], [0.28, 0.3, 330, 330, "tri", 0.45], [0.56, 0.6, 262, 196, "tri", 0.45]]),
    click: synth(0.1, [[0, 0.1, 600, 900, "tri", 0.4]]),
  },
};

for (const [sprite, set] of Object.entries(sounds)) {
  fs.mkdirSync(`src/${sprite}`, { recursive: true });
  for (const [name, s] of Object.entries(set)) fs.writeFileSync(`src/${sprite}/${name}.wav`, wav(s));
}
console.log("wrote sounds");
