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
