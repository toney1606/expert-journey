import { describe, expect, it } from 'vitest';
import { sceneDurationsInFrames, sceneStartFrames, totalDurationInFrames } from './duration';

const scenes = [
  { id: 'a', draft: { durationSec: 6 } },
  { id: 'b', draft: { durationSec: 2.5 } },
];

describe('duration', () => {
  it('converts seconds to frames', () => {
    expect(sceneDurationsInFrames(scenes, 30)).toEqual([180, 75]);
  });
  it('sums total frames', () => {
    expect(totalDurationInFrames(scenes, 30)).toBe(255);
  });
  it('throws on empty video', () => {
    expect(() => totalDurationInFrames([], 30)).toThrow();
  });
  it('computes start frames', () => {
    expect(sceneStartFrames([180, 75, 10])).toEqual([0, 180, 255]);
  });
});

describe('duration with audio', () => {
  const audio = [{ sceneId: 'a', durationSec: 4 }];

  it('prefers audio length plus tail over the draft', () => {
    expect(sceneDurationsInFrames(scenes, 30, audio)).toEqual([132, 75]);
  });
  it('falls back to draft for scenes without audio', () => {
    expect(totalDurationInFrames(scenes, 30, audio)).toBe(207);
  });
});
