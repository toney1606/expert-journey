import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findPhraseTime } from '../../lib/spoken';
import { MIN_CUE_GAP } from '../../lib/cues';
import {
  CHIP_SIZE,
  MIN_CODE,
  MIN_EXAMPLE,
  MIN_NAME,
  MIN_USE,
  railHeightOf,
  indexCardsLayout,
} from './layout';
import { IndexCardsPropsSchema, IndexCardsSceneSchema } from './schema';
import { activeCardIndex, extraFrames, indexCardFrames, indexCardsTimeline } from './timeline';

const FRAGMENT = new URL(
  '../../../content/junior/23112026/database-index-guess/scenes/07-index-types.json',
  import.meta.url,
);
const SCRIPT = new URL(
  '../../../content/junior/23112026/database-index-guess/notes/script-v1.md',
  import.meta.url,
);
const fragment = JSON.parse(readFileSync(FRAGMENT, 'utf8')) as Record<string, unknown>;

describe('scene fragment 07-index-types.json', () => {
  it('parses with the strict schema', () => {
    expect(IndexCardsSceneSchema.safeParse(fragment).success).toBe(true);
  });
  it('keeps the voice byte-for-byte from script-v1.md', () => {
    const md = readFileSync(SCRIPT, 'utf8');
    const section = /## 7 IndexCardsScene\n(.*?)\n/.exec(md)?.[1];
    expect(fragment.voice).toBe(section);
  });
  it('fits the content box with legible sizes', () => {
    const { props } = IndexCardsSceneSchema.parse(fragment);
    const l = indexCardsLayout(props);
    expect(l.fits).toBe(true);
    expect(l.nameSize).toBeGreaterThanOrEqual(MIN_NAME);
    expect(l.useSize).toBeGreaterThanOrEqual(MIN_USE);
    expect(l.exampleSize).toBeGreaterThanOrEqual(MIN_EXAMPLE);
    expect(l.codeSize).toBeGreaterThanOrEqual(MIN_CODE);
  });
  it('every cue phrase is found in the voice, in order', () => {
    const { props, voice } = IndexCardsSceneSchema.parse(fragment);
    const words = voice.split(/\s+/).map((text, i) => ({ text, start: i, end: i + 0.5 }));
    const at = props.cards.map((c) => findPhraseTime(words, c.at ?? '')?.start);
    expect(at.every((t) => t !== undefined)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => (a ?? 0) - (b ?? 0)));
  });
});

describe('schema', () => {
  const card = { name: 'A', use: 'b', example: 'c' };
  it('rejects unknown keys and bad counts', () => {
    expect(IndexCardsPropsSchema.safeParse({ cards: [card] }).success).toBe(false);
    expect(IndexCardsPropsSchema.safeParse({ cards: [card, card], x: 1 }).success).toBe(false);
    expect(IndexCardsPropsSchema.safeParse({ cards: Array(7).fill(card) }).success).toBe(false);
  });
  it('rejects a bar longer than its track', () => {
    const extra = { bars: [{ label: 'x', fraction: 1.5 }] };
    expect(IndexCardsPropsSchema.safeParse({ cards: [card, { ...card, extra }] }).success).toBe(
      false,
    );
  });
});

describe('timeline', () => {
  it('derives ordered fallback starts from the duration', () => {
    for (const d of [300, 720]) {
      const s = indexCardsTimeline(d, 6);
      expect(s).toEqual([...s].sort((a, b) => a - b));
      expect(s[5]).toBeLessThan(d);
    }
    expect(indexCardsTimeline(0, 3).every(Number.isInteger)).toBe(true);
  });
  it('uses fallback with nothing spoken and spoken frames otherwise', () => {
    expect(indexCardFrames([undefined, undefined, undefined], 300)).toEqual(
      indexCardsTimeline(300, 3),
    );
    const f = indexCardFrames([20, 21, undefined], 300);
    expect(f[0]).toBe(20);
    expect(f[1]).toBe(20 + MIN_CUE_GAP);
    expect(f[2]).toBeGreaterThan(f[1] ?? 0);
  });
  it('finds the active card', () => {
    const starts = [10, 50, 90];
    expect(activeCardIndex(0, starts)).toBe(-1);
    expect(activeCardIndex(10, starts)).toBe(0);
    expect(activeCardIndex(89, starts)).toBe(1);
    expect(activeCardIndex(500, starts)).toBe(2);
  });
  it('places bars before code inside the card span', () => {
    const w = extraFrames(100, 200, undefined, undefined);
    expect(w.bars).toBeGreaterThanOrEqual(100);
    expect(w.code).toBeGreaterThan(w.bars);
    expect(w.code).toBeLessThan(200);
    expect(extraFrames(100, 200, 120, 150)).toEqual({ bars: 120, code: 150 });
  });
});

describe('layout', () => {
  it('sizes the chip rail in rows of two columns', () => {
    expect(railHeightOf(0)).toBe(0);
    expect(railHeightOf(6)).toBeGreaterThan(railHeightOf(4));
    expect(CHIP_SIZE).toBeGreaterThanOrEqual(48);
  });
  it('gives the fragment a kicker and an icon per card', () => {
    const { props } = IndexCardsSceneSchema.parse(fragment);
    expect(props.kicker).toEqual({ label: 'CÁC LOẠI INDEX', step: 7, total: 8 });
    expect(props.cards.every((c) => c.icon)).toBe(true);
  });
  it('reports not fitting for absurdly long content', () => {
    const long = 'x '.repeat(300);
    const props = IndexCardsPropsSchema.parse({
      cards: [
        { name: 'A', use: long, example: 'c' },
        { name: 'B', use: long, example: long },
      ],
    });
    expect(indexCardsLayout(props).fits).toBe(false);
  });
});
