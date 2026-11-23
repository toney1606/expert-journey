// Synthesized sound effects. All deterministic (seeded noise), mono, peak level around `SFX_PEAK`.
import { SAMPLE_RATE, createRng, lowpass, makeBuffer, peakOf, sweepBandpass } from './dsp';

export type SfxKind = 'whoosh' | 'pop' | 'tick' | 'thud' | 'riser';

const SFX_PEAK = 0.8;

const normalize = (buffer: Float32Array, peak = SFX_PEAK): Float32Array => {
  const p = peakOf(buffer);
  if (p > 0) for (let i = 0; i < buffer.length; i += 1) buffer[i] = ((buffer[i] ?? 0) / p) * peak;
  return buffer;
};

const noise = (length: number, seed: number): Float32Array => {
  const rng = createRng(seed);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = rng() * 2 - 1;
  return out;
};

/** Filtered noise sweep, bright up then down; swell peaks at ~40% of the length. */
export const whoosh = (seconds = 0.75, seed = 1): Float32Array => {
  const buf = makeBuffer(seconds);
  const swept = sweepBandpass(
    noise(buf.length, seed),
    (p) => 350 * 2 ** (4 * Math.sin(Math.PI * Math.min(1, p * 0.9))),
    1.4,
  );
  for (let i = 0; i < buf.length; i += 1) {
    const p = i / buf.length;
    const env = Math.sin(Math.PI * p ** 1.2) ** 2;
    buf[i] = (swept[i] ?? 0) * env;
  }
  return normalize(buf, 0.7);
};

/** Short pitched bubble: sine dropping from 900 Hz to 450 Hz plus a tiny click. */
export const pop = (seed = 2): Float32Array => {
  const buf = makeBuffer(0.22);
  const rng = createRng(seed);
  let phase = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / SAMPLE_RATE;
    phase += (2 * Math.PI * (450 + 450 * Math.exp(-t * 40))) / SAMPLE_RATE;
    const click = t < 0.004 ? (rng() * 2 - 1) * (1 - t / 0.004) * 0.5 : 0;
    buf[i] = Math.sin(phase) * Math.exp(-t * 22) + click;
  }
  return normalize(buf, 0.75);
};

/** Very short dry tick for counters (frequency slightly varies with `variant`). */
export const tick = (variant = 0): Float32Array => {
  const buf = makeBuffer(0.045);
  const freq = 1800 + (variant % 4) * 180;
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / SAMPLE_RATE;
    buf[i] =
      (Math.sin(2 * Math.PI * freq * t) + 0.4 * Math.sin(2 * Math.PI * freq * 2.01 * t)) *
      Math.exp(-t * 120);
  }
  return normalize(buf, 0.45);
};

/** Soft low impact: sine falling 110 -> 45 Hz with a muffled noise attack. */
export const thud = (seed = 3): Float32Array => {
  const buf = makeBuffer(0.7);
  const hit = noise(buf.length, seed);
  lowpass(hit, 400);
  let phase = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const t = i / SAMPLE_RATE;
    phase += (2 * Math.PI * (45 + 65 * Math.exp(-t * 14))) / SAMPLE_RATE;
    buf[i] = Math.sin(phase) * Math.exp(-t * 6.5) + (hit[i] ?? 0) * Math.exp(-t * 30) * 0.8;
  }
  return normalize(buf, 0.8);
};

/** Rising noise + tone that swells exponentially, ends abruptly at `seconds` (just before the impact). */
export const riser = (seconds = 2.2, seed = 4): Float32Array => {
  const buf = makeBuffer(seconds);
  const swept = sweepBandpass(noise(buf.length, seed), (p) => 250 * 2 ** (5 * p), 1.1);
  let phase = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const p = i / buf.length;
    phase += (2 * Math.PI * (180 * 2 ** (2.5 * p))) / SAMPLE_RATE;
    const env = p ** 2.2 * Math.min(1, (1 - p) * 40);
    buf[i] = ((swept[i] ?? 0) * 0.9 + Math.sin(phase) * 0.35) * env;
  }
  return normalize(buf, 0.65);
};

export const renderSfx = (kind: SfxKind, seed = 1, variant = 0): Float32Array => {
  switch (kind) {
    case 'whoosh':
      return whoosh(0.75, seed);
    case 'pop':
      return pop(seed);
    case 'tick':
      return tick(variant);
    case 'thud':
      return thud(seed);
    case 'riser':
      return riser(2.2, seed);
  }
};

/** Seconds from the start of the sample to its "hit" point, so callers can align it to an event. */
export const SFX_HIT_OFFSET_SEC: Record<SfxKind, number> = {
  whoosh: 0.3,
  pop: 0,
  tick: 0,
  thud: 0,
  riser: 2.2,
};
