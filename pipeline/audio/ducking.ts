// Sidechain-style ducking driven by narration word timings (no analysis of the audio itself).

export type Interval = { start: number; end: number };

/** Merge intervals closer than `bridgeSec` (short pauses between words still count as speech). */
export const mergeIntervals = (intervals: readonly Interval[], bridgeSec: number): Interval[] => {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const interval of sorted) {
    const last = out[out.length - 1];
    if (last && interval.start - last.end <= bridgeSec) last.end = Math.max(last.end, interval.end);
    else out.push({ ...interval });
  }
  return out;
};

export type DuckOptions = {
  /** Gain reduction while speaking, in dB (positive number). */
  depthDb: number;
  attackSec: number;
  releaseSec: number;
  bridgeSec: number;
  /** Control-rate of the returned envelope in Hz. */
  rate: number;
};

/**
 * Gain envelope (1 = untouched, down to 10^(-depthDb/20)) at `rate` Hz for `totalSec` seconds.
 * One-pole smoothing: fast attack when speech starts, slower release afterwards.
 */
export const duckEnvelope = (
  speech: readonly Interval[],
  totalSec: number,
  options: DuckOptions,
): Float32Array => {
  const { depthDb, attackSec, releaseSec, bridgeSec, rate } = options;
  const floor = 10 ** (-depthDb / 20);
  const length = Math.ceil(totalSec * rate) + 1;
  const merged = mergeIntervals(speech, bridgeSec);
  const out = new Float32Array(length);
  const attack = 1 - Math.exp(-1 / (Math.max(1e-4, attackSec) * rate));
  const release = 1 - Math.exp(-1 / (Math.max(1e-4, releaseSec) * rate));
  let value = 1;
  let k = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / rate;
    while (k < merged.length && (merged[k] as Interval).end < t) k += 1;
    const current = merged[k];
    const speaking = current !== undefined && t >= current.start && t <= current.end;
    const target = speaking ? floor : 1;
    value += (target - value) * (speaking ? attack : release);
    out[i] = value;
  }
  return out;
};

/** Multiply `buffer` by the control envelope (linear interpolation between control points). */
export const applyEnvelope = (
  buffer: Float32Array,
  envelope: Float32Array,
  rate: number,
  sampleRate: number,
  extraGain = 1,
): void => {
  for (let i = 0; i < buffer.length; i += 1) {
    const pos = (i / sampleRate) * rate;
    const idx = Math.floor(pos);
    const a = envelope[Math.min(idx, envelope.length - 1)] ?? 1;
    const b = envelope[Math.min(idx + 1, envelope.length - 1)] ?? 1;
    buffer[i] = (buffer[i] ?? 0) * (a + (b - a) * (pos - idx)) * extraGain;
  }
};
