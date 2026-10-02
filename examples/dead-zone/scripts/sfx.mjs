// Synthesizes Dead Zone's sound effects (16-bit mono, 22050 Hz). Run from examples/dead-zone after art.mjs:
//   node scripts/sfx.mjs
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
let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const buf = (len) => new Float32Array(Math.round(len * RATE));
/** one-pole lowpass with a cutoff that can change over time: cut(t) in Hz */
function lowpass(x, cut) {
  let y = 0;
  return x.map((v, i) => (y += (v - y) * Math.min(1, (2 * Math.PI * cut(i / RATE)) / RATE)));
}
function noise(len, decay, cut, vol = 1, attack = 0.002) {
  const n = buf(len).map((_, i) => rnd());
  return lowpass(n, cut).map((v, i) => { const t = i / RATE; return v * vol * Math.min(1, t / attack) * Math.exp(-t / decay); });
}
function tone(len, f0, f1, decay, vol, wave = "sine", start = 0) {
  let ph = 0;
  return buf(len).map((_, i) => {
    const t = i / RATE - start;
    if (t < 0) return 0;
    const f = f0 * Math.pow(f1 / f0, Math.min(1, t / len));
    ph += (2 * Math.PI * f) / RATE;
    const s = wave === "saw" ? ((ph / Math.PI) % 2) - 1 : wave === "square" ? Math.sign(Math.sin(ph)) : Math.sin(ph);
    return s * vol * Math.min(1, t / 0.005) * Math.exp(-t / decay);
  });
}
const mix = (...xs) => { const n = Math.max(...xs.map((x) => x.length)), o = new Float32Array(n); for (const x of xs) x.forEach((v, i) => (o[i] += v)); return o; };
const delay = (x, secs) => { const d = Math.round(secs * RATE), o = new Float32Array(x.length + d); x.forEach((v, i) => (o[i + d] = v)); return o; };
const gain = (x, g) => x.map((v) => v * g);
const softclip = (x) => x.map((v) => Math.tanh(v * 1.4) / Math.tanh(1.4));

// gunshots: a sharp crack, a filtered boom and a low thump, plus a short echo tail
const shot = (crack, boomCut, thump, len, vol) => {
  const s = mix(noise(len, crack, () => 7000, 0.9 * vol), noise(len, len / 3, (t) => boomCut * Math.exp(-t * 6) + 150, 1.3 * vol),
    tone(len, thump, thump * 0.4, len / 4, 0.9 * vol));
  return softclip(mix(s, gain(delay(noise(len, len / 2, () => 900, 0.35 * vol), 0.09), 1)));
};
const groan = (f, len, vol) => {
  // vocal-ish: saw through a wobbling lowpass with vibrato
  let ph = 0;
  const raw = buf(len).map((_, i) => {
    const t = i / RATE;
    const fr = f * (1 + 0.08 * Math.sin(t * 7) + 0.15 * Math.sin(t * 1.3)) * (1 - 0.25 * t / len);
    ph += fr / RATE;
    return ((ph % 1) * 2 - 1) + rnd() * 0.25;
  });
  const env = (t) => Math.min(1, t / 0.15) * Math.min(1, (len - t) / 0.3);
  return lowpass(lowpass(raw, (t) => 500 + 350 * Math.sin(t * 5) ** 2), () => 900).map((v, i) => v * env(i / RATE) * vol);
};
const footstep = (cut) => mix(noise(0.12, 0.025, () => cut, 0.7), tone(0.12, 90, 60, 0.03, 0.4));
const siren = (() => { const len = 2.6; let ph = 0; return buf(len).map((_, i) => { const t = i / RATE; const f = 520 + 260 * Math.sin(t * Math.PI * 1.2 - Math.PI / 2); ph += f / RATE; return (Math.sin(ph * 2 * Math.PI) * 0.6 + Math.sign(Math.sin(ph * 2 * Math.PI)) * 0.12) * Math.min(1, t / 0.2) * Math.min(1, (len - t) / 0.4) * 0.6; }); })();
const wind = (() => { const len = 8; const n = buf(len).map(() => rnd()); const lp = lowpass(n, (t) => 260 + 180 * Math.sin((t / len) * Math.PI * 4) + 90 * Math.sin((t / len) * Math.PI * 10)); return lp.map((v, i) => { const t = i / RATE; const fade = Math.min(1, t / 0.5, (len - t) / 0.5); return v * (2.2 + 1.2 * Math.sin((t / len) * Math.PI * 2 * 3)) * fade * 0.9; }); })();

const sounds = {
  "Gun/pistol": shot(0.012, 2400, 140, 0.35, 0.8),
  "Gun/shotgun": shot(0.02, 1600, 90, 0.6, 1.0),
  "Gun/rifle": shot(0.01, 3000, 160, 0.25, 0.7),
  "Gun/reload": mix(noise(0.6, 0.02, () => 4000, 0.6), delay(noise(0.1, 0.02, () => 3000, 0.7), 0.25), delay(tone(0.1, 1800, 1500, 0.02, 0.3, "square"), 0.27), delay(noise(0.12, 0.03, () => 5000, 0.8), 0.48)),
  "Gun/empty": mix(noise(0.08, 0.008, () => 6000, 0.6), tone(0.08, 2400, 2200, 0.01, 0.25, "square")),
  "Gun/switch": mix(noise(0.3, 0.02, () => 3500, 0.5), delay(noise(0.1, 0.02, () => 4500, 0.6), 0.15)),
  "View/groan1": groan(95, 1.4, 0.9),
  "View/groan2": groan(120, 1.1, 0.9),
  "View/groan3": groan(70, 1.8, 1.0),
  "View/zattack": mix(groan(150, 0.5, 0.8), noise(0.5, 0.1, () => 1200, 0.4)),
  "View/hit": mix(noise(0.15, 0.03, () => 1400, 0.9), tone(0.15, 160, 80, 0.04, 0.6)),
  "View/zdie": mix(groan(80, 0.9, 0.9), delay(mix(noise(0.3, 0.06, () => 500, 1), tone(0.3, 70, 40, 0.08, 0.8)), 0.6)),
  "View/step": footstep(1800),
  "View/hurt": mix(tone(0.35, 220, 140, 0.12, 0.5, "saw"), noise(0.35, 0.05, () => 900, 0.6)),
  "View/siren": siren,
  "View/pickup": mix(tone(0.4, 660, 660, 0.08, 0.35), tone(0.4, 990, 990, 0.1, 0.35, "sine", 0.08), noise(0.15, 0.02, () => 3000, 0.4)),
  "View/hammer": mix(noise(0.25, 0.015, () => 2500, 1), tone(0.25, 420, 380, 0.05, 0.4, "square"), delay(noise(0.1, 0.03, () => 900, 0.5), 0.05)),
  "View/crack": mix(noise(0.7, 0.06, (t) => 3000 * Math.exp(-t * 4) + 300, 1.2), delay(noise(0.4, 0.04, () => 1500, 0.8), 0.12), tone(0.7, 120, 50, 0.1, 0.6)),
  "View/distshot": lowpass(shot(0.012, 1600, 120, 0.4, 0.5), () => 1200),
  "View/gameover": mix(tone(2.2, 220, 110, 0.9, 0.35, "saw"), tone(2.2, 165, 82, 1.0, 0.35, "saw"), noise(2.2, 0.8, () => 300, 0.5)).map((v, i) => v * Math.min(1, i / 2000)),
  "View/cleared": mix(tone(1.0, 392, 392, 0.3, 0.3, "square"), tone(1.0, 523, 523, 0.35, 0.3, "square", 0.15), tone(1.0, 659, 659, 0.5, 0.3, "square", 0.3)),
  "Stage/wind": wind,
  "Thumbnail/start": mix(groan(85, 1.6, 0.8), shot(0.012, 2400, 140, 0.35, 0.6)),
};
for (const [name, samples] of Object.entries(sounds)) {
  const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const norm = name === "Stage/wind" ? 0.35 / peak : name.startsWith("Gun") ? 0.95 / peak : 0.85 / peak;
  fs.writeFileSync(`src/${name}.wav`, wav([...samples].map((v) => v * norm)));
}
console.log(`wrote ${Object.keys(sounds).length} sounds`);
