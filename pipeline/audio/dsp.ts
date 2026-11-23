// Pure DSP building blocks: seeded PRNG, envelopes, filters, mixing helpers, WAV output.
// Everything is deterministic: the same inputs give byte-identical output.
import { encodeWav } from '../tts/wav';

export const SAMPLE_RATE = 48000;

/** Small fast seeded PRNG (mulberry32); returns floats in [0, 1). */
export const createRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stable 32-bit hash of a string, for deriving seeds. */
export const hashSeed = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * The table is built with Math.sin, which ECMAScript allows to differ in the last bit between engines/versions,
 * so "byte-identical" holds for one Node build on one machine (what the determinism test checks), not
 * guaranteed across engines.
 */
const TABLE_SIZE = 8192;
const SINE_TABLE = new Float64Array(TABLE_SIZE + 1).map((_, i) =>
  Math.sin((2 * Math.PI * i) / TABLE_SIZE),
);

/** Table-lookup sine of `cycles` (1 = a full turn), linear interpolation; ~1e-7 error, much faster than Math.sin. */
export const fastSin = (cycles: number): number => {
  const x = (cycles - Math.floor(cycles)) * TABLE_SIZE;
  const i = Math.floor(x);
  const a = SINE_TABLE[i] as number;
  return a + ((SINE_TABLE[i + 1] as number) - a) * (x - i);
};

export const dbToGain = (db: number): number => 10 ** (db / 20);
export const gainToDb = (gain: number): number => 20 * Math.log10(gain);
export const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** Linear attack / release envelope for a note of `length` seconds (value at time t, 0..1). */
export const attackRelease = (
  t: number,
  length: number,
  attack: number,
  release: number,
): number => {
  if (t < 0 || t > length) return 0;
  const a = attack > 0 ? Math.min(1, t / attack) : 1;
  const r = release > 0 ? Math.min(1, (length - t) / release) : 1;
  const x = Math.min(a, r);
  return x * x * (3 - 2 * x); // smoothstep
};

/** Fixed-length mono buffer of `seconds`. */
export const makeBuffer = (seconds: number, sampleRate = SAMPLE_RATE): Float32Array =>
  new Float32Array(Math.max(0, Math.round(seconds * sampleRate)));

/** Add `source` into `target` starting at `offsetSec` (clipped to the target), scaled by `gain`. */
export const mixInto = (
  target: Float32Array,
  source: Float32Array,
  offsetSec: number,
  gain = 1,
  sampleRate = SAMPLE_RATE,
): void => {
  const offset = Math.round(offsetSec * sampleRate);
  for (let i = 0; i < source.length; i += 1) {
    const j = offset + i;
    if (j >= 0 && j < target.length) target[j] = (target[j] ?? 0) + (source[i] ?? 0) * gain;
  }
};

/** One-pole low-pass, in place. */
export const lowpass = (buffer: Float32Array, cutoffHz: number, sampleRate = SAMPLE_RATE): void => {
  const a = 1 - Math.exp((-2 * Math.PI * cutoffHz) / sampleRate);
  let y = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    y += a * ((buffer[i] ?? 0) - y);
    buffer[i] = y;
  }
};

/**
 * State-variable band-pass whose centre frequency follows `centerAt(i / length)` (0..1 progress).
 * Chamberlin form; `q` > 0.5 narrows the band. Returns a new buffer.
 */
export const sweepBandpass = (
  input: Float32Array,
  centerAt: (progress: number) => number,
  q: number,
  sampleRate = SAMPLE_RATE,
): Float32Array => {
  const out = new Float32Array(input.length);
  let low = 0;
  let band = 0;
  const damp = 1 / q;
  for (let i = 0; i < input.length; i += 1) {
    const f =
      2 * Math.sin((Math.PI * Math.min(centerAt(i / input.length), sampleRate / 6)) / sampleRate);
    low += f * band;
    const high = (input[i] ?? 0) - low - damp * band;
    band += f * high;
    out[i] = band;
  }
  return out;
};

/** Feedback echo mixed into the buffer, in place. */
export const addEcho = (
  buffer: Float32Array,
  delaySec: number,
  feedback: number,
  mix: number,
  sampleRate = SAMPLE_RATE,
): void => {
  const delay = Math.max(1, Math.round(delaySec * sampleRate));
  const wet = new Float32Array(buffer.length);
  for (let i = delay; i < buffer.length; i += 1) {
    wet[i] = (buffer[i - delay] ?? 0) * 1 + (wet[i - delay] ?? 0) * feedback;
  }
  for (let i = 0; i < buffer.length; i += 1) buffer[i] = (buffer[i] ?? 0) + (wet[i] ?? 0) * mix;
};

export const peakOf = (buffer: Float32Array): number => {
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) peak = Math.max(peak, Math.abs(buffer[i] ?? 0));
  return peak;
};

export const rmsOf = (buffer: Float32Array, from = 0, to = buffer.length): number => {
  const end = Math.min(to, buffer.length);
  let sum = 0;
  for (let i = from; i < end; i += 1) sum += (buffer[i] ?? 0) ** 2;
  return end > from ? Math.sqrt(sum / (end - from)) : 0;
};

/** Gentle soft clip (tanh) so a stray peak never wraps. Not transparent: tanh(0.5) is about 0.46 (-0.7 dB), tanh(0.25) about 0.245; the bed is capped to a 0.5 peak first so only the loudest peaks bend. */
export const softClip = (buffer: Float32Array): void => {
  for (let i = 0; i < buffer.length; i += 1) buffer[i] = Math.tanh(buffer[i] ?? 0);
};

/** Float samples (-1..1) to a 16-bit mono WAV file. */
export const floatToWav = (buffer: Float32Array, sampleRate = SAMPLE_RATE): Uint8Array => {
  const pcm = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i += 1) {
    const v = Math.max(-1, Math.min(1, buffer[i] ?? 0));
    pcm[i] = Math.round(v * 32767);
  }
  return encodeWav(pcm, sampleRate);
};
