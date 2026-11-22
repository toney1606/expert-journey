import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

  it('scales duration with speed and has a floor', () => {
    expect(estimateDurationSec('a b c d e', 2)).toBeCloseTo(1, 5);
    expect(estimateDurationSec('hi')).toBe(0.5);
  });
});

describe('createProvider', () => {
  it('resolves fake and rejects unknown names', () => {
    expect(createProvider('fake').id).toBe('fake');
    expect(() => createProvider('nope')).toThrow(/Available: fake/);
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

    const videoPath = join(root, 'content/videos/sample.json');
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

  it('fails clearly for a missing video', async () => {
    await expect(
      synthesizeVideo({ root: tempRoot(), videoId: 'nope', provider: new FakeTtsProvider() }),
    ).rejects.toThrow(/Video not found/);
  });
});
