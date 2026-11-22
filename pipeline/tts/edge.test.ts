import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EdgeTtsProvider, edgeRate } from './providers/edge';
import type { EdgeJob, EdgeRunner } from './providers/edge';
import { mp3DurationSec } from './providers/mp3';
import { createProvider, providerNames } from './registry';

const fixture = new Uint8Array(readFileSync(join(import.meta.dirname, 'fixtures/edge-short.mp3')));

/** Build a synthetic MPEG-1 Layer III stream: `count` frames of 128 kbit/s @ 44.1 kHz (417 bytes). */
const syntheticFrames = (count: number, prefix: number[] = []): Uint8Array => {
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  const out = new Uint8Array(prefix.length + count * 417);
  out.set(prefix);
  for (let i = 0; i < count; i += 1) out.set(frame, prefix.length + i * 417);
  return out;
};

describe('mp3DurationSec', () => {
  it('parses a real edge-tts MP3 by counting frames', () => {
    // 82 frames of MPEG-2 L3 (576 samples @ 24 kHz = 24 ms each)
    expect(mp3DurationSec(fixture)).toBeCloseTo(82 * 0.024, 6);
  });

  it('counts MPEG-1 frames and skips an ID3v2 tag', () => {
    // ID3v2 header declaring a 20-byte body (syncsafe), followed by 20 junk bytes.
    const id3 = [0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 20, ...new Array<number>(20).fill(0)];
    expect(mp3DurationSec(syntheticFrames(100, id3))).toBeCloseTo((100 * 1152) / 44100, 6);
  });

  it('ignores a Xing header frame and a truncated tail', () => {
    const xing = new Uint8Array(417);
    xing.set([0xff, 0xfb, 0x90, 0x00]);
    xing.set([0x58, 0x69, 0x6e, 0x67], 4 + 32); // "Xing" after side info (stereo, MPEG-1)
    const body = syntheticFrames(10);
    const bytes = new Uint8Array(xing.length + body.length - 100);
    bytes.set(xing);
    bytes.set(body.subarray(0, body.length - 100), xing.length);
    expect(mp3DurationSec(bytes)).toBeCloseTo((9 * 1152) / 44100, 6);
  });

  it('throws when there are no frames', () => {
    expect(() => mp3DurationSec(new Uint8Array(64))).toThrow(/No valid MP3 frames/);
  });
});

describe('edgeRate', () => {
  it('defaults to -10% and maps speed with an explicit sign', () => {
    expect(edgeRate()).toBe('-10%');
    expect(edgeRate(1)).toBe('+0%');
    expect(edgeRate(1.25)).toBe('+25%');
    expect(edgeRate(0.8)).toBe('-20%');
    expect(edgeRate(0.85)).toBe('-15%');
  });
});

describe('EdgeTtsProvider', () => {
  const cues = [{ start: 0.1, end: 1.9, text: 'Nhưng tại sao?' }];
  const noSleep = (): Promise<void> => Promise.resolve();

  it('returns mp3, exact duration and cues, passing voice and rate to the runner', async () => {
    const jobs: EdgeJob[] = [];
    const runner: EdgeRunner = (job) => {
      jobs.push(job);
      return Promise.resolve({ audio: fixture, cues });
    };
    const result = await new EdgeTtsProvider({ runner, sleep: noSleep }).synthesize({
      text: 'Nhưng tại sao?',
      lang: 'vi',
    });
    expect(result.format).toBe('mp3');
    expect(result.durationSec).toBeCloseTo(1.968, 6);
    expect(result.cues).toEqual(cues);
    expect(jobs[0]).toMatchObject({ voice: 'vi-VN-HoaiMyNeural', rate: '-10%', timeoutSec: 60 });

    await new EdgeTtsProvider({ runner, sleep: noSleep }).synthesize({
      text: 'x',
      lang: 'vi',
      voice: 'vi-VN-NamMinhNeural',
      speed: 1.2,
    });
    expect(jobs[1]).toMatchObject({ voice: 'vi-VN-NamMinhNeural', rate: '+20%' });
  });

  it('retries with backoff then succeeds', async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const runner: EdgeRunner = () => {
      calls += 1;
      return calls < 3
        ? Promise.reject(new Error('NoAudioReceived'))
        : Promise.resolve({ audio: fixture, cues });
    };
    const provider = new EdgeTtsProvider({
      runner,
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
    });
    const result = await provider.synthesize({ text: 'a', lang: 'vi' });
    expect(calls).toBe(3);
    expect(sleeps).toEqual([2000, 4000]);
    expect(result.durationSec).toBeGreaterThan(0);
  });

  it('fails with a clear message after the final attempt', async () => {
    let calls = 0;
    const runner: EdgeRunner = () => {
      calls += 1;
      return Promise.reject(new Error('NoAudioReceived'));
    };
    await expect(
      new EdgeTtsProvider({ runner, sleep: noSleep }).synthesize({ text: 'a', lang: 'vi' }),
    ).rejects.toThrow(
      /edge-tts failed after 6 attempts \(voice vi-VN-HoaiMyNeural, rate -10%\): NoAudioReceived/,
    );
    expect(calls).toBe(6);
  });
});

describe('registry', () => {
  it('lists fake and edge', () => {
    expect(providerNames()).toEqual(['fake', 'edge']);
    expect(createProvider('edge').id).toBe('edge');
  });
});

describe.skipIf(process.env.EDGE_TTS_LIVE !== '1')('EdgeTtsProvider live', () => {
  it('synthesizes real Vietnamese audio with cues', async () => {
    const result = await new EdgeTtsProvider().synthesize({
      text: 'Nhưng tại sao? Thêm một cái index.',
      lang: 'vi',
    });
    expect(result.durationSec).toBeGreaterThan(1);
    expect(result.cues?.length).toBeGreaterThan(0);
  }, 120_000);
});
