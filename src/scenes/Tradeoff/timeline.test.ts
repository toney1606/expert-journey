import { describe, expect, it } from 'vitest';
import {
  MAX_STEP_FRAMES,
  REVEAL_DONE_RATIO,
  SETTLE_FRAMES,
  applyCues,
  buildTimeline,
} from './timeline';

describe('buildTimeline', () => {
  it('orders title, cards and rows strictly in sequence', () => {
    const t = buildTimeline(240, [4, 3]);
    const flat = [t.title];
    for (const card of t.cards) flat.push(card.start, ...card.rows);
    for (let i = 1; i < flat.length; i += 1) {
      expect(flat[i]).toBeGreaterThanOrEqual(flat[i - 1] ?? 0);
    }
    expect(t.cards[1]?.start).toBeGreaterThan(t.cards[0]?.rows.at(-1) ?? 0);
    expect(t.cards[0]?.rows).toHaveLength(4);
    expect(t.title).toBe(0);
  });

  it.each([
    [240, [2, 2]],
    [240, [5, 5, 5, 5]],
    [90, [3, 3, 3]],
    [600, [2, 1]],
  ])('finishes by 80%% of the scene (duration %i, rows %j)', (duration, rows) => {
    const t = buildTimeline(duration, rows);
    const last = t.cards.at(-1)?.rows.at(-1) ?? 0;
    expect(last + SETTLE_FRAMES).toBeLessThanOrEqual(duration * REVEAL_DONE_RATIO + 1);
  });

  it('caps the step so long scenes get a long hold', () => {
    const t = buildTimeline(3000, [2, 2]);
    expect(t.cards[0]?.start).toBeLessThanOrEqual(2 * MAX_STEP_FRAMES);
  });

  it('does not produce negative or NaN frames for tiny scenes or empty cards', () => {
    const t = buildTimeline(5, [0, 2]);
    for (const f of [t.title, ...t.cards.flatMap((c) => [c.start, ...c.rows])]) {
      expect(Number.isFinite(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
    }
    expect(t.cards[0]?.rows).toEqual([]);
  });
});

describe('applyCues', () => {
  const fallback = buildTimeline(300, [2, 2]);
  const none = { cards: [{ rows: [] }, { rows: [] }] };

  it('returns the fallback untouched without cues', () => {
    expect(applyCues(fallback, none, 300)).toEqual(fallback);
  });

  it('moves a card and its rows to the spoken frames', () => {
    const t = applyCues(
      fallback,
      {
        cards: [
          { start: 60, rows: [90, undefined] },
          { start: 180, rows: [] },
        ],
      },
      300,
    );
    expect(t.cards[0]?.start).toBe(60);
    expect(t.cards[0]?.rows[0]).toBe(90);
    expect(t.cards[1]?.start).toBe(180);
    expect(t.title).toBe(0);
  });

  it('keeps everything in order even if cues contradict the fallback', () => {
    const t = applyCues(
      fallback,
      {
        cards: [
          { start: 200, rows: [] },
          { start: 20, rows: [] },
        ],
      },
      300,
    );
    const flat = [t.title];
    for (const card of t.cards) flat.push(card.start, ...card.rows);
    for (let i = 1; i < flat.length; i += 1) {
      expect(flat[i]).toBeGreaterThan(flat[i - 1] ?? 0);
    }
  });
});
