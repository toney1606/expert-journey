import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { InterviewKitSchema } from './interview-kit';
import { VideoSchema } from './video';

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const sample = () => readJson('../../content/samples/sample/video.json') as Record<string, unknown>;

describe('VideoSchema', () => {
  it('accepts content/samples/sample/video.json', () => {
    expect(VideoSchema.safeParse(sample()).success).toBe(true);
  });

  it('rejects an unknown scene type', () => {
    const video = sample() as { scenes: Record<string, unknown>[] };
    video.scenes[0] = { ...video.scenes[0], type: 'nope' };
    expect(VideoSchema.safeParse(video).success).toBe(false);
  });

  it('rejects duplicate scene ids', () => {
    const video = sample() as { scenes: Record<string, unknown>[] };
    video.scenes[1] = { ...video.scenes[1], id: video.scenes[0]?.id };
    const result = VideoSchema.safeParse(video);
    expect(result.success).toBe(false);
  });

  it('rejects a scene without draft duration', () => {
    const video = sample() as { scenes: Record<string, unknown>[] };
    const first = { ...video.scenes[0] };
    delete first.draft;
    video.scenes[0] = first;
    expect(VideoSchema.safeParse(video).success).toBe(false);
  });

  it('rejects a bad source url', () => {
    const video = sample() as { sources: unknown };
    video.sources = [{ title: 'x', url: 'not a url' }];
    expect(VideoSchema.safeParse(video).success).toBe(false);
  });
});

describe('InterviewKitSchema', () => {
  it('accepts the database-index kit', () => {
    const kit = readJson('../../content/junior/20122026/database-index/interview-kit.json');
    expect(InterviewKitSchema.safeParse(kit).success).toBe(true);
  });
});
