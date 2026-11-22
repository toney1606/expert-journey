import { describe, expect, it } from 'vitest';
import { fetchAudioManifest } from './audio-manifest';

const manifest = {
  videoId: 'sample',
  provider: 'fake',
  scenes: [
    {
      sceneId: 'hook',
      file: 'generated/audio/sample/hook.wav',
      format: 'wav',
      durationSec: 2,
      textHash: 'x',
    },
  ],
};
const ok = (body: unknown) => async () => ({ ok: true, json: async () => body });

describe('fetchAudioManifest', () => {
  it('returns a valid manifest', async () => {
    expect((await fetchAudioManifest('u', 'sample', ok(manifest)))?.scenes).toHaveLength(1);
  });
  it('returns undefined on 404 or network failure', async () => {
    expect(
      await fetchAudioManifest('u', 'sample', async () => ({ ok: false, json: async () => ({}) })),
    ).toBeUndefined();
    expect(
      await fetchAudioManifest('u', 'sample', async () => {
        throw new Error('offline');
      }),
    ).toBeUndefined();
  });
  it('throws on an invalid manifest or the wrong video', async () => {
    await expect(fetchAudioManifest('u', 'sample', ok({ nope: 1 }))).rejects.toThrow();
    await expect(fetchAudioManifest('u', 'other', ok(manifest))).rejects.toThrow(
      /expected "other"/,
    );
  });
});
