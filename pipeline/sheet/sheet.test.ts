import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Runner, RunSpec } from '../render/render-video';
import {
  buildFrameArgs,
  buildPreviewRenderArgs,
  formatTime,
  sampleTimes,
  tileSize,
} from './frames';
import { makeContactSheet } from './make-sheet';
import { blit, decodePng, drawLabel, encodePng, newCanvas } from './png';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ej-sheet-'));
  dirs.push(dir);
  return dir;
};

describe('frames', () => {
  it('spreads sample times over slice midpoints', () => {
    expect(sampleTimes(100, 4)).toEqual([12.5, 37.5, 62.5, 87.5]);
    expect(sampleTimes(10, 1)).toEqual([5]);
  });

  it('formats m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(83.9)).toBe('1:23');
  });

  it('computes tile size and ffmpeg/render args', () => {
    expect(tileSize(0.25)).toEqual({ width: 270, height: 480 });
    expect(buildPreviewRenderArgs({ propsFile: 'p.json', outFile: 'o.mp4', scale: 0.25 })).toEqual(
      expect.arrayContaining([
        'render',
        'Video',
        'o.mp4',
        '--props=p.json',
        '--scale=0.25',
        '--muted',
      ]),
    );
    const args = buildFrameArgs({
      videoFile: 'v.mp4',
      timeSec: 3.5,
      width: 270,
      height: 480,
      outFile: 't.rgb',
    });
    expect(args.slice(0, 3)).toEqual(['exec', 'remotion', 'ffmpeg']);
    expect(args).toContain('scale=270:480');
    expect(args[args.indexOf('-ss') + 1]).toBe('3.5');
  });
});

describe('png', () => {
  it('writes a valid PNG header and dimensions', () => {
    const png = encodePng(Buffer.alloc(4 * 3 * 3, 255), 4, 3);
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(4);
    expect(png.readUInt32BE(20)).toBe(3);
    expect(() => encodePng(Buffer.alloc(5), 4, 3)).toThrow();
  });

  it('round-trips through decodePng', () => {
    const rgb = Buffer.from(Array.from({ length: 5 * 4 * 3 }, (_, i) => (i * 7) % 256));
    expect(decodePng(encodePng(rgb, 5, 4))).toMatchObject({ width: 5, height: 4, rgb });
  });

  it('blits a tile and draws a label', () => {
    const canvas = newCanvas(10, 10, [0, 0, 255]);
    blit(canvas, Buffer.alloc(2 * 2 * 3, 9), 2, 2, 3, 4);
    expect(canvas.data[(4 * 10 + 3) * 3]).toBe(9);
    expect(canvas.data[0]).toBe(0);
    drawLabel(canvas, '1:2', 0, 0, 1);
    expect([...canvas.data].some((v) => v === 255 && true)).toBe(true);
  });
});

describe('makeContactSheet', () => {
  it('renders a preview, extracts one frame per tile and writes the sheet', async () => {
    const root = tmp();
    mkdirSync(join(root, 'content', 'samples', 's'), { recursive: true });
    writeFileSync(
      join(root, 'content', 'samples', 's', 'video.json'),
      JSON.stringify({
        meta: { id: 's', title: 't', topic: 'topic', level: 'junior', question: 'q' },
        sources: [],
        scenes: [
          {
            id: 'h',
            type: 'hook',
            voice: 'v',
            draft: { durationSec: 10 },
            props: { headline: 'h' },
          },
        ],
      }),
    );
    const calls: RunSpec[] = [];
    const runner: Runner = async (spec) => {
      calls.push(spec);
      if (spec.args.includes('ffmpeg')) {
        writeFileSync(
          spec.args[spec.args.length - 1] ?? '',
          encodePng(Buffer.alloc(27 * 48 * 3, 128), 27, 48),
        );
      } else {
        writeFileSync(spec.args[5] ?? '', 'x');
      }
      return { exitCode: 0, stderrTail: '' };
    };
    const result = await makeContactSheet({
      root,
      videoId: 's',
      columns: 2,
      rows: 2,
      scale: 0.025,
      runner,
    });
    expect(calls).toHaveLength(5);
    expect(result.times).toEqual([1.25, 3.75, 6.25, 8.75]);
    expect(existsSync(result.outFile)).toBe(true);
    expect(readFileSync(result.outFile).subarray(1, 4).toString('ascii')).toBe('PNG');
  });

  it('reports a failing step', async () => {
    const root = tmp();
    mkdirSync(join(root, 'content', 'samples', 's'), { recursive: true });
    writeFileSync(join(root, 'content', 'samples', 's', 'video.json'), JSON.stringify({}));
    await expect(makeContactSheet({ root, videoId: 's' })).rejects.toThrow(/Invalid video/);
    await expect(makeContactSheet({ root, videoId: 'nope' })).rejects.toThrow(/not found/);
  });
});
