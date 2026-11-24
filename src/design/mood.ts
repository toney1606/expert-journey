import type { Mood } from '../schemas/common';

/*
 * The backdrop is near-black; each mood only tints a faint glow (yellow = concept, red = problem, green = solution).
 */
export type MoodPalette = {
  /** Three glow colours for the drifting gradient blobs. */
  blobs: readonly [string, string, string];
  /** Colour of the grid lines and particles. */
  line: string;
  /** Dark base the blobs sit on. */
  base: string;
};

const BASE = '#0a0a0a';

export const moodPalettes: Record<Mood, MoodPalette> = {
  problem: { blobs: ['#ff4d3d', '#ff8a3d', '#7a1a12'], line: '#ff4d3d', base: BASE },
  concept: { blobs: ['#ffd60a', '#ffb800', '#6b5a05'], line: '#ffd60a', base: BASE },
  solution: { blobs: ['#3ddc84', '#1fb8a0', '#0f5c3a'], line: '#3ddc84', base: BASE },
  warning: { blobs: ['#ffd60a', '#ff8a3d', '#6b4a05'], line: '#ffd60a', base: BASE },
  neutral: { blobs: ['#ffffff', '#9a9a9a', '#3a3a3a'], line: '#ffffff', base: BASE },
};

/** Darkest colour used under the vignette. */
export const BACKDROP_EDGE = '#000000';

const CALLOUT_MOODS: Record<string, Mood> = {
  myth: 'problem',
  fact: 'concept',
  warning: 'warning',
  tip: 'solution',
};

const SCENE_MOODS: Record<string, Mood> = {
  hook: 'concept',
  terminal: 'neutral',
  diagram: 'concept',
  code: 'solution',
  tradeoff: 'warning',
  summary: 'solution',
  stat: 'concept',
  compare: 'concept',
  endcard: 'solution',
  counterhook: 'concept',
  pagetree: 'concept',
  costroads: 'concept',
  rowsetup: 'concept',
  rowtwist: 'problem',
  rowfix: 'solution',
  indexcards: 'concept',
  pageslider: 'warning',
};

/** Natural mood of a scene type; callouts depend on `props.kind`. */
export const defaultMoodFor = (sceneType: string, props?: unknown): Mood => {
  if (sceneType === 'callout') {
    const kind = (props as { kind?: unknown } | undefined)?.kind;
    return (typeof kind === 'string' ? CALLOUT_MOODS[kind] : undefined) ?? 'concept';
  }
  return SCENE_MOODS[sceneType] ?? 'neutral';
};

const parseHex = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Linear blend of two `#rrggbb` colours; t is clamped to 0..1. */
export const mixHex = (a: string, b: string, t: number): string => {
  const k = Math.min(1, Math.max(0, t));
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const channel = (x: number, y: number): string =>
    Math.round(x + (y - x) * k)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
};

/** Palette halfway between two moods (t=0 is `from`, t=1 is `to`). */
export const mixPalettes = (from: Mood, to: Mood, t: number): MoodPalette => {
  const a = moodPalettes[from];
  const b = moodPalettes[to];
  return {
    blobs: [
      mixHex(a.blobs[0], b.blobs[0], t),
      mixHex(a.blobs[1], b.blobs[1], t),
      mixHex(a.blobs[2], b.blobs[2], t),
    ],
    line: mixHex(a.line, b.line, t),
    base: mixHex(a.base, b.base, t),
  };
};

export type MoodBlend = { from: Mood; to: Mood; mix: number };

/**
 * Mood to draw at `frame`: the scene's own mood, blending into the neighbour within `window` frames of
 * each scene boundary (centred on the cut, so the colour change is already half done at the cut).
 */
export const moodBlendAt = (
  moods: readonly Mood[],
  starts: readonly number[],
  frame: number,
  window: number,
): MoodBlend => {
  const fallback: Mood = 'neutral';
  for (let i = 1; i < moods.length; i += 1) {
    const boundary = starts[i] ?? 0;
    if (Math.abs(frame - boundary) < window) {
      return {
        from: moods[i - 1] ?? fallback,
        to: moods[i] ?? fallback,
        mix: (frame - (boundary - window)) / (2 * window),
      };
    }
  }
  let index = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if ((starts[i] ?? 0) <= frame) index = i;
  }
  const mood = moods[index] ?? fallback;
  return { from: mood, to: mood, mix: 0 };
};
