import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AudioManifestSchema } from '../../src/schemas/audio-manifest';
import { FakeTtsProvider, estimateDurationSec } from './providers/fake';
import { createProvider } from './registry';
import { synthesizeVideo } from './synthesize-video';
import type { SynthesisRequest, SynthesisResult, TtsProvider } from './types';

const repoRoot = resolve(import.meta.dirname, '../..');
const dirs: string[] = [];

const tempRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ej-tts-'));
  dirs.push(dir);
  cpSync(join(repoRoot, 'content'), join(dir, 'content'), { recursive: true });
  return dir;
};

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

class CountingProvider implements TtsProvider {
  readonly id = 'counting';
  calls = 0;
  private readonly inner = new FakeTtsProvider();
  synthesize(request: SynthesisRequest): Promise<SynthesisResult> {
    this.calls += 1;
    return this.inner.synthesize(request);
  }
}

describe('FakeTtsProvider', () => {
  it('produces a valid WAV whose length matches durationSec', async () => {
    const result = await new FakeTtsProvider().synthesize({
      text: 'một hai ba bốn năm',
      lang: 'vi',
    });
    const view = new DataView(result.audio.buffer, result.audio.byteOffset);
    const text = (offset: number): string =>
      String.fromCharCode(...result.audio.slice(offset, offset + 4));
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    const sampleRate = view.getUint32(24, true);
    const dataBytes = view.getUint32(40, true);
    expect(dataBytes / 2 / sampleRate).toBeCloseTo(result.durationSec, 2);
    expect(result.durationSec).toBeCloseTo(2, 5);
  });

  it('derives evenly spaced word timings that span the duration', async () => {
    const result = await new FakeTtsProvider().synthesize({ text: 'một hai ba bốn', lang: 'vi' });
    expect(result.words?.map((w) => w.text)).toEqual(['một', 'hai', 'ba', 'bốn']);
    expect(result.words?.at(0)?.start).toBe(0);
    expect(result.words?.at(3)?.end).toBeCloseTo(result.durationSec, 9);
    expect(result.words?.at(1)?.start).toBeCloseTo(result.words?.at(0)?.end ?? -1, 9);
  });

  it('scales duration with speed and has a floor', () => {
    expect(estimateDurationSec('a b c d e', 2)).toBeCloseTo(1, 5);
    expect(estimateDurationSec('hi')).toBe(0.5);
  });
});

describe('createProvider', () => {
  it('resolves fake and rejects unknown names', () => {
    expect(createProvider('fake').id).toBe('fake');
    expect(() => createProvider('nope')).toThrow(/Available: fake, edge/);
  });
});

describe('synthesizeVideo', () => {
  it('writes audio and a valid manifest, then caches on rerun', async () => {
    const root = tempRoot();
    const provider = new CountingProvider();

    const first = await synthesizeVideo({ root, videoId: 'sample', provider });
    expect(first.synthesized).toHaveLength(6);
    expect(provider.calls).toBe(6);
    const manifestPath = join(root, 'public/generated/audio/sample/manifest.json');
    const manifest = AudioManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
    for (const scene of manifest.scenes) {
      expect(existsSync(join(root, 'public', scene.file))).toBe(true);
    }

    const second = await synthesizeVideo({ root, videoId: 'sample', provider });
    expect(second.cached).toHaveLength(6);
    expect(provider.calls).toBe(6);
  });

  it('re-synthesizes only the scene whose text changed', async () => {
    const root = tempRoot();
    const provider = new CountingProvider();
    await synthesizeVideo({ root, videoId: 'sample', provider });

    const videoPath = join(root, 'content/samples/sample/video.json');
    const video = JSON.parse(readFileSync(videoPath, 'utf8')) as { scenes: { voice: string }[] };
    video.scenes[0]!.voice = 'Lời thoại mới hoàn toàn cho cảnh mở đầu.';
    writeFileSync(videoPath, JSON.stringify(video));

    const result = await synthesizeVideo({ root, videoId: 'sample', provider });
    expect(result.synthesized).toEqual(['hook']);
    expect(result.cached).toHaveLength(5);
  });

  it('re-synthesizes when speed changes', async () => {
    const root = tempRoot();
    const provider = new CountingProvider();
    await synthesizeVideo({ root, videoId: 'sample', provider });
    const result = await synthesizeVideo({ root, videoId: 'sample', provider, speed: 1.2 });
    expect(result.synthesized).toHaveLength(6);
  });

  it('does not trust an empty (0 byte) audio file left by a failed write', async () => {
    const root = tempRoot();
    const provider = new CountingProvider();
    const first = await synthesizeVideo({ root, videoId: 'sample', provider });
    const broken = first.manifest.scenes[0];
    expect(broken).toBeDefined();
    writeFileSync(join(root, 'public', broken!.file), '');

    const second = await synthesizeVideo({ root, videoId: 'sample', provider });
    expect(second.synthesized).toEqual([broken!.sceneId]);
    expect(statSync(join(root, 'public', broken!.file)).size).toBeGreaterThan(0);
  });

  it('fails clearly for a missing video', async () => {
    await expect(
      synthesizeVideo({ root: tempRoot(), videoId: 'nope', provider: new FakeTtsProvider() }),
    ).rejects.toThrow(/Video not found/);
  });
});
