import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildRenderArgs, renderVideo } from './render-video';
import type { Runner, RunSpec } from './render-video';

const repoRoot = resolve(import.meta.dirname, '..', '..');
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'render-test-'));
  mkdirSync(join(root, 'content', 'videos'), { recursive: true });
  cpSync(join(repoRoot, 'content/videos/sample.json'), join(root, 'content/videos/sample.json'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const propsPathOf = (spec: RunSpec): string => {
  const arg = spec.args.find((a) => a.startsWith('--props='));
  if (!arg) throw new Error('no --props');
  return arg.slice('--props='.length);
};

const okRunner =
  (seen: { props?: unknown; propsFile?: string }): Runner =>
  async (spec) => {
    seen.propsFile = propsPathOf(spec);
    seen.props = JSON.parse(readFileSync(seen.propsFile, 'utf8'));
    const out = spec.args[5] as string;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, 'fake-mp4');
    return { exitCode: 0, stderrTail: '' };
  };

describe('buildRenderArgs', () => {
  it('builds the remotion render argument list', () => {
    expect(buildRenderArgs({ propsFile: '/t/p.json', outFile: '/o/a.mp4' })).toEqual([
      'exec',
      'remotion',
      'render',
      'src/index.ts',
      'Video',
      '/o/a.mp4',
      '--props=/t/p.json',
    ]);
  });
  it('adds --frames when given', () => {
    expect(buildRenderArgs({ propsFile: 'p', outFile: 'o', frames: '0-89' })).toContain(
      '--frames=0-89',
    );
  });
});

describe('renderVideo', () => {
  it('renders, reports result, writes debugSafeZone=false, and cleans temp dir', async () => {
    const seen: { props?: unknown; propsFile?: string } = {};
    const result = await renderVideo({ root, videoId: 'sample', runner: okRunner(seen) });
    expect(result.outFile).toBe(join(root, 'out', 'sample.mp4'));
    expect(result.sizeBytes).toBe(8);
    expect(result.usedAudio).toBe(false);
    expect((seen.props as { debugSafeZone: boolean }).debugSafeZone).toBe(false);
    expect(seen.props).toHaveProperty('video.meta.id', 'sample');
    expect(existsSync(dirname(seen.propsFile as string))).toBe(false);
  });

  it('honours debugSafeZone, outDir and detects audio', async () => {
    mkdirSync(join(root, 'public/generated/audio/sample'), { recursive: true });
    writeFileSync(join(root, 'public/generated/audio/sample/manifest.json'), '{}');
    const seen: { props?: unknown } = {};
    const result = await renderVideo({
      root,
      videoId: 'sample',
      outDir: join(root, 'x'),
      debugSafeZone: true,
      runner: okRunner(seen),
    });
    expect(result.usedAudio).toBe(true);
    expect(result.outFile).toBe(join(root, 'x', 'sample.mp4'));
    expect((seen.props as { debugSafeZone: boolean }).debugSafeZone).toBe(true);
  });

  it('fails with stderr tail and still cleans up on non-zero exit', async () => {
    let propsFile = '';
    const runner: Runner = async (spec) => {
      propsFile = propsPathOf(spec);
      return { exitCode: 1, stderrTail: 'boom: chrome crashed' };
    };
    await expect(renderVideo({ root, videoId: 'sample', runner })).rejects.toThrow(
      /exit 1[\s\S]*boom: chrome crashed/,
    );
    expect(existsSync(dirname(propsFile))).toBe(false);
  });

  it('fails clearly for a missing video', async () => {
    await expect(renderVideo({ root, videoId: 'nope', runner: okRunner({}) })).rejects.toThrow(
      'Video not found: content/videos/nope.json',
    );
  });

  it('fails clearly for invalid JSON and invalid schema', async () => {
    writeFileSync(join(root, 'content/videos/bad.json'), '{not json');
    await expect(renderVideo({ root, videoId: 'bad', runner: okRunner({}) })).rejects.toThrow(
      /Invalid JSON/,
    );
    writeFileSync(join(root, 'content/videos/bad2.json'), '{}');
    await expect(renderVideo({ root, videoId: 'bad2', runner: okRunner({}) })).rejects.toThrow(
      /Invalid video/,
    );
  });
});
