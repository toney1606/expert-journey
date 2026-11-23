import { describe, expect, it } from 'vitest';
import { createRng, floatToWav, peakOf, rmsOf } from './dsp';
import { duckEnvelope, mergeIntervals } from './ducking';
import { parseLoudnorm, planGains } from './loudness';
import { renderMusic, moods } from './music';
import { renderSfx } from './sfx';
import type { SfxKind } from './sfx';
import { collectRevealPhrases, planSoundtrack, renderBed } from './build-soundtrack';

const SAMPLE_STDERR = `
[Parsed_loudnorm_0 @ 0x55d]
{
\t"input_i" : "-19.40",
\t"input_tp" : "-2.10",
\t"input_lra" : "3.20",
\t"input_thresh" : "-29.50",
\t"output_i" : "-14.60",
\t"normalization_type" : "dynamic"
}
`;

describe('dsp', () => {
  it('seeded rng is repeatable and in range', () => {
    const a = createRng(7);
    const b = createRng(7);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('writes a valid 16-bit mono 48k wav header', () => {
    const wav = floatToWav(new Float32Array([0, 0.5, -0.5, 2]));
    const view = new DataView(wav.buffer);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getInt16(44 + 6, true)).toBe(32767); // clipped, not wrapped
  });
});

describe('sfx and music are deterministic and bounded', () => {
  const kinds: SfxKind[] = ['whoosh', 'pop', 'tick', 'thud', 'riser'];
  it.each(kinds)('%s: identical output twice, finite, non-silent, peak <= 1', (kind) => {
    const a = renderSfx(kind, 5, 1);
    const b = renderSfx(kind, 5, 1);
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
    expect(peakOf(a)).toBeGreaterThan(0.3);
    expect(peakOf(a)).toBeLessThanOrEqual(1);
    expect(a.every(Number.isFinite)).toBe(true);
  });

  it.each(moods)('music %s: identical twice and audible', (mood) => {
    const a = renderMusic(mood, 3.3, 2);
    const b = renderMusic(mood, 3.3, 2);
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
    expect(rmsOf(a)).toBeGreaterThan(0.005);
    expect(peakOf(a)).toBeLessThan(1);
  });

  it('music is time-anchored: overlapping renders agree sample by sample', () => {
    const whole = renderMusic('solution', 0, 6);
    const part = renderMusic('solution', 2, 2);
    const offset = 2 * 48000;
    for (let i = 0; i < part.length; i += 997) {
      expect(part[i]).toBeCloseTo(whole[offset + i] ?? 0, 2);
    }
  }, 30_000);
});

describe('ducking', () => {
  const options = { depthDb: 12, attackSec: 0.05, releaseSec: 0.3, bridgeSec: 0.3, rate: 100 };
  it('merges close intervals only', () => {
    expect(
      mergeIntervals(
        [
          { start: 1, end: 2 },
          { start: 2.2, end: 3 },
          { start: 5, end: 6 },
        ],
        0.3,
      ),
    ).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 6 },
    ]);
  });

  it('is ~1 in silence and ~-12 dB while speaking, with smooth release', () => {
    const env = duckEnvelope([{ start: 2, end: 4 }], 8, options);
    expect(env[50]).toBeCloseTo(1, 3);
    expect(env[300]).toBeCloseTo(10 ** (-12 / 20), 2);
    expect(env[420]).toBeGreaterThan(env[405] ?? 1); // recovering
    expect(env[790]).toBeGreaterThan(0.98);
  });
});

describe('loudness helpers', () => {
  it('parses the loudnorm JSON summary', () => {
    expect(parseLoudnorm(SAMPLE_STDERR)).toEqual({ integratedLufs: -19.4, truePeakDb: -2.1 });
  });
  it('takes the last block and handles -inf', () => {
    expect(parseLoudnorm('"input_i" : "-70.0"\n"input_i" : "-inf"').integratedLufs).toBe(-Infinity);
    expect(() => parseLoudnorm('nothing')).toThrow();
  });
  it('plans gains whose power sum hits the target', () => {
    const plan = planGains(-20, -30, 14, -14);
    // after gains: voice at -20+voiceDb, bed at -30+bedDb
    const v = -20 + plan.voiceDb;
    const b = -30 + 20 * Math.log10(plan.bedGain);
    expect(10 * Math.log10(10 ** (v / 10) + 10 ** (b / 10))).toBeCloseTo(-14, 3);
    expect(v - b).toBeCloseTo(14, 3);
  });
});

describe('planGains peak ceiling', () => {
  const peaks = { voicePeak: 0.5, bedUnitPeak: 0.3, bedMaxPeak: 0.5, mixCeilingDb: -1 };
  it('keeps the worst-case summed peak under the ceiling by lowering the voice', () => {
    const free = planGains(-30, -30, 14, -14, Infinity, undefined);
    const capped = planGains(-30, -30, 14, -14, Infinity, peaks);
    expect(free.voiceGain * peaks.voicePeak).toBeGreaterThan(1); // would clip without the cap
    expect(capped.voiceGain).toBeLessThan(free.voiceGain);
    expect(capped.mixPeakEstimate).toBeLessThanOrEqual(10 ** (-1 / 20) + 1e-6);
    expect(capped.bedGain * peaks.bedUnitPeak).toBeLessThanOrEqual(peaks.bedMaxPeak + 1e-9);
  });
  it('leaves the plan untouched when the peaks already fit', () => {
    const quiet = { ...peaks, voicePeak: 0.01, bedUnitPeak: 0.01 };
    const a = planGains(-20, -30, 14, -14);
    const b = planGains(-20, -30, 14, -14, Infinity, quiet);
    expect(b.voiceGain).toBeCloseTo(a.voiceGain, 6);
    expect(b.bedGain).toBeCloseTo(a.bedGain, 6);
  });
});

describe('planning', () => {
  const words = (texts: string[]) =>
    texts.map((text, i) => ({ start: 1 + i * 0.5, end: 1.4 + i * 0.5, text }));
  const scenes = [
    {
      id: 'a',
      type: 'hook',
      durationSec: 6,
      words: words(['Chào', 'bạn', 'index', 'rất', 'nhanh']),
      props: { headline: 'x', atHeadline: 'index rất nhanh' },
    },
    {
      id: 'b',
      type: 'stat',
      durationSec: 6,
      words: words(['một', 'triệu', 'dòng']),
      props: {
        items: [
          { label: 'l', value: 1, at: 'triệu dòng' },
          { label: 'm', value: 2 },
        ],
      },
    },
    {
      id: 'c',
      type: 'summary',
      durationSec: 5,
      words: words(['xong']),
      props: { points: ['p'], pointsAt: ['xong', 'không có'] },
    },
  ];

  it('collects phrases tolerant of shapes', () => {
    expect(collectRevealPhrases({ a: [{ at: 'x' }, { pointsAt: ['y', 3] }], at: 5 })).toEqual([
      'x',
      'y',
    ]);
    expect(collectRevealPhrases(undefined)).toEqual([]);
    expect(collectRevealPhrases('str')).toEqual([]);
  });

  it('places scene starts with the 0.4 s tail and events per kind', () => {
    const plan = planSoundtrack(scenes);
    expect(plan.scenes.map((s) => s.start)).toEqual([0, 6.4, 12.8]);
    expect(plan.totalSec).toBeCloseTo(18.2);
    const count = (kind: string) => plan.events.filter((e) => e.kind === kind).length;
    expect(count('whoosh')).toBe(1);
    expect(count('thud')).toBe(2); // opening + final scene
    expect(count('riser')).toBe(1);
    expect(count('pop')).toBe(2); // hook reveal + summary reveal (missing phrase skipped)
    expect(count('tick')).toBe(28); // 2 stat rows x 14
    const pop = plan.events.find((e) => e.kind === 'pop' && e.sceneId === 'a');
    expect(pop?.time).toBeCloseTo(1 + 2 * 0.5);
  });

  it('puts every start and event on whole-frame boundaries (matches Video.tsx rounding)', () => {
    const odd = scenes.map((scene, i) => ({ ...scene, durationSec: 5.013 + i * 0.0171 }));
    const plan = planSoundtrack(odd, 30);
    // frames: round((d + 0.4) * 30) per scene, as in sceneDurationsInFrames
    const frames = odd.map((s) => Math.round((s.durationSec + 0.4) * 30));
    let cursor = 0;
    plan.scenes.forEach((s, i) => {
      expect(s.start).toBeCloseTo(cursor / 30, 9);
      expect(s.duration).toBeCloseTo((frames[i] ?? 0) / 30, 9);
      cursor += frames[i] ?? 0;
    });
    expect(plan.totalSec).toBeCloseTo(cursor / 30, 9);
    const whoosh = plan.events.find((e) => e.kind === 'whoosh');
    expect(whoosh?.time).toBeCloseTo((frames[0] ?? 0) / 30, 9);
    // naive float accumulation would differ from the frame grid
    expect(
      Math.abs(plan.scenes[2]!.start - (odd[0]!.durationSec + odd[1]!.durationSec + 0.8)),
    ).toBeGreaterThan(0.001);
  });

  it('survives a single scene and no words', () => {
    const plan = planSoundtrack([{ id: 'a', type: 'hook', durationSec: 3 }]);
    expect(plan.events.map((e) => e.kind)).toEqual(['thud']);
    const bed = renderBed(plan);
    expect(bed.length).toBe(Math.round(3.4 * 48000));
  });

  it('renderBed is byte-identical for the same plan', () => {
    const plan = planSoundtrack(scenes.slice(0, 2));
    const a = renderBed(plan);
    const b = renderBed(plan);
    expect(Buffer.from(a.buffer).equals(Buffer.from(b.buffer))).toBe(true);
  }, 60_000);
});
