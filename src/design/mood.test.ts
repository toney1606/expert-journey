import { describe, expect, it } from 'vitest';
import { MOODS } from '../schemas/common';
import { defaultMoodFor, mixHex, mixPalettes, moodBlendAt, moodPalettes } from './mood';

describe('defaultMoodFor', () => {
  it('maps scene types', () => {
    expect(defaultMoodFor('hook')).toBe('concept');
    expect(defaultMoodFor('terminal')).toBe('neutral');
    expect(defaultMoodFor('code')).toBe('solution');
    expect(defaultMoodFor('tradeoff')).toBe('warning');
    expect(defaultMoodFor('summary')).toBe('solution');
    expect(defaultMoodFor('endcard')).toBe('solution');
  });

  it('maps callout kinds', () => {
    expect(defaultMoodFor('callout', { kind: 'myth' })).toBe('problem');
    expect(defaultMoodFor('callout', { kind: 'fact' })).toBe('concept');
    expect(defaultMoodFor('callout', { kind: 'warning' })).toBe('warning');
    expect(defaultMoodFor('callout', { kind: 'tip' })).toBe('solution');
    expect(defaultMoodFor('callout')).toBe('concept');
  });

  it('falls back to neutral for unknown types', () => {
    expect(defaultMoodFor('mystery')).toBe('neutral');
  });
});

describe('palettes', () => {
  it('defines valid hex colours for every mood', () => {
    for (const mood of MOODS) {
      const p = moodPalettes[mood];
      for (const c of [...p.blobs, p.line, p.base]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('mixes colours', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#000000', '#ffffff', 5)).toBe('#ffffff');
    expect(mixPalettes('problem', 'solution', 0)).toEqual(moodPalettes.problem);
    expect(mixPalettes('problem', 'solution', 1)).toEqual(moodPalettes.solution);
  });
});

describe('moodBlendAt', () => {
  const moods = ['concept', 'neutral', 'solution'] as const;
  const starts = [0, 100, 200];

  it('is steady inside a scene', () => {
    expect(moodBlendAt(moods, starts, 50, 10)).toEqual({ from: 'concept', to: 'concept', mix: 0 });
    expect(moodBlendAt(moods, starts, 150, 10)).toEqual({ from: 'neutral', to: 'neutral', mix: 0 });
    expect(moodBlendAt(moods, starts, 250, 10)).toEqual({
      from: 'solution',
      to: 'solution',
      mix: 0,
    });
  });

  it('is halfway at the cut and spans both sides', () => {
    expect(moodBlendAt(moods, starts, 100, 10)).toEqual({
      from: 'concept',
      to: 'neutral',
      mix: 0.5,
    });
    expect(moodBlendAt(moods, starts, 91, 10).mix).toBeCloseTo(0.05);
    expect(moodBlendAt(moods, starts, 109, 10).mix).toBeCloseTo(0.95);
    expect(moodBlendAt(moods, starts, 110, 10).from).toBe('neutral');
  });

  it('handles a single scene', () => {
    expect(moodBlendAt(['problem'], [0], 5, 10)).toEqual({
      from: 'problem',
      to: 'problem',
      mix: 0,
    });
  });
});
