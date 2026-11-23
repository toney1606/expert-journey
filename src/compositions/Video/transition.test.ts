import { describe, expect, it } from 'vitest';
import { fadeFramesFor, sceneTransitionAt } from './transition';

describe('sceneTransitionAt', () => {
  it('does not throw for scenes shorter than 3 frames and keeps them visible', () => {
    for (const d of [1, 2]) {
      expect(fadeFramesFor(d)).toBe(0);
      for (let f = 0; f < d; f += 1)
        expect(sceneTransitionAt(f, d)).toEqual({ opacity: 1, slide: 0 });
    }
  });
  it('keeps the normal fade for regular scenes', () => {
    expect(fadeFramesFor(300)).toBe(8);
    expect(fadeFramesFor(9)).toBe(3);
    expect(sceneTransitionAt(0, 300)).toEqual({ opacity: 0, slide: 28 });
    expect(sceneTransitionAt(8, 300)).toEqual({ opacity: 1, slide: 0 });
    expect(sceneTransitionAt(150, 300).opacity).toBe(1);
    expect(sceneTransitionAt(300, 300).opacity).toBe(0);
  });
});
