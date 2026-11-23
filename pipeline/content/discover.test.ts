import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { discoverSamples, discoverTopicFolders, parseDayFolder } from './discover';

const repoRoot = resolve(import.meta.dirname, '../..');

describe('parseDayFolder', () => {
  it('turns ddmmyyyy into an ISO date', () => {
    expect(parseDayFolder('20122026')).toBe('2026-12-20');
  });
  it('rejects non-8-digit names and impossible dates', () => {
    expect(parseDayFolder('2026-12-20')).toBeUndefined();
    expect(parseDayFolder('2012026')).toBeUndefined();
    expect(parseDayFolder('31022027')).toBeUndefined();
    expect(parseDayFolder('00012027')).toBeUndefined();
  });
});

describe('discovery on the repo content', () => {
  it('finds the database-index topic folder and the sample', () => {
    const topics = discoverTopicFolders(repoRoot);
    expect(topics).toContainEqual(
      expect.objectContaining({
        level: 'junior',
        day: '20122026',
        topic: 'database-index',
        rel: 'content/junior/20122026/database-index',
      }),
    );
    expect(discoverSamples(repoRoot).map((s) => s.id)).toContain('sample');
  });
});
