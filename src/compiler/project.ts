import JSZip from "jszip";

export interface Sb3 { json: any; files: Record<string, Uint8Array> }

export async function readSb3(data: Uint8Array | ArrayBuffer): Promise<Sb3> {
  const zip = await JSZip.loadAsync(data);
  const files: Record<string, Uint8Array> = {};
  let json: any;
  for (const [name, f] of Object.entries(zip.files)) {
    if (f.dir) continue;
    if (name === "project.json") json = JSON.parse(await f.async("string"));
    else files[name.split("/").pop()!] = await f.async("uint8array");
  }
  if (!json) throw new Error("Not an .sb3: project.json missing");
  return { json, files };
}

export async function writeSb3(sb3: Sb3): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("project.json", JSON.stringify(sb3.json));
  // only ship assets the project references
  const used = new Set<string>(sb3.json.targets.flatMap((t: any) => [...t.costumes, ...t.sounds].map((a: any) => a.md5ext)));
  for (const [name, data] of Object.entries(sb3.files)) if (used.has(name)) zip.file(name, data);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

// ---------- assets ----------

const enc = (s: string) => new TextEncoder().encode(s);

export function md5(bytes: Uint8Array): string {
  const K = new Int32Array(64).map((_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const len = bytes.length;
  const padded = new Uint8Array(((len + 72) >>> 6) << 6);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, (len * 8) >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(len / 0x20000000), true);
  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  for (let off = 0; off < padded.length; off += 64) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const tmp = d;
      d = c;
      c = b;
      const x = (a + f + K[i] + view.getInt32(off + g * 4, true)) | 0;
      const s = S[(i >> 4) * 4 + (i % 4)];
      b = (b + ((x << s) | (x >>> (32 - s)))) | 0;
      a = tmp;
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
  }
  return [a0, b0, c0, d0].map((w) => Array.from({ length: 4 }, (_, i) => ((w >>> (i * 8)) & 0xff).toString(16).padStart(2, "0")).join("")).join("");
}

/** Width/height of a png, jpg or svg; null if unknown. */
export function imageSize(bytes: Uint8Array, ext: string): [number, number] | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (ext === "png") return [dv.getUint32(16), dv.getUint32(20)];
  if (ext === "jpg" || ext === "jpeg") {
    for (let i = 2; i + 9 < bytes.length; ) {
      const marker = bytes[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [dv.getUint16(i + 7), dv.getUint16(i + 5)];
      i += 2 + dv.getUint16(i + 2);
    }
    return null;
  }
  if (ext === "svg") {
    const head = new TextDecoder().decode(bytes.subarray(0, 4096));
    const tag = head.match(/<svg[^>]*>/)?.[0] ?? "";
    const num = (attr: string) => parseFloat(tag.match(new RegExp(`\\s${attr}="([\\d.]+)`))?.[1] ?? "");
    const vb = tag.match(/viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
    const w = num("width") || parseFloat(vb?.[1] ?? ""), h = num("height") || parseFloat(vb?.[2] ?? "");
    return w && h ? [w, h] : null;
  }
  return null;
}

/** Turn an image file into a costume entry + asset file. */
export function makeCostume(name: string, bytes: Uint8Array, ext: string) {
  ext = ext === "jpeg" ? "jpg" : ext;
  const fmt = ext;
  const [w, h] = imageSize(bytes, ext) ?? [0, 0];
  if (fmt === "svg" && w && h) {
    // Scratch's renderer draws nothing (0x0 skin) for an <svg> without a viewBox
    const text = new TextDecoder().decode(bytes);
    if (!/<svg[^>]*\sviewBox=/.test(text)) bytes = enc(text.replace(/<svg\b/, `<svg viewBox="0 0 ${w} ${h}"`));
  }
  const assetId = md5(bytes);
  const bitmap = fmt !== "svg";
  return {
    costume: {
      name, dataFormat: fmt, assetId, md5ext: `${assetId}.${fmt}`,
      rotationCenterX: w / 2, rotationCenterY: h / 2,
      ...(bitmap ? { bitmapResolution: 1 } : {}),
    },
    file: [`${assetId}.${fmt}`, bytes] as const,
  };
}

export const IMAGE_EXT = ["png", "svg", "jpg", "jpeg"];

const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect x="2" y="2" width="44" height="44" rx="10" fill="#4C97FF" stroke="#3373CC" stroke-width="4"/></svg>`;
const BACKDROP = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#ffffff"/></svg>`;

export function newSprite(name: string, layerOrder: number) {
  const c = makeCostume("costume1", enc(PLACEHOLDER), "svg");
  return {
    target: {
      isStage: false, name, variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {},
      currentCostume: 0, costumes: [c.costume], sounds: [], volume: 100, layerOrder,
      visible: true, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: "all around",
    },
    file: c.file,
  };
}

/** A minimal empty project: white backdrop, no sprites. */
export function emptyProject(): Sb3 {
  const c = makeCostume("backdrop1", enc(BACKDROP), "svg");
  return {
    json: {
      targets: [{
        isStage: true, name: "Stage", variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {},
        currentCostume: 0, costumes: [c.costume], sounds: [], volume: 100, layerOrder: 0,
        tempo: 60, videoTransparency: 50, videoState: "on", textToSpeechLanguage: null,
      }],
      monitors: [], extensions: [], meta: { semver: "3.0.0", vm: "0.2.0", agent: "TextToScratch" },
    },
    files: { [c.file[0]]: c.file[1] },
  };
}
