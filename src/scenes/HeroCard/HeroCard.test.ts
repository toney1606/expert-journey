import { describe, expect, it } from 'vitest';
import { CONTENT_BOX } from '../../design/tokens';
import { HERO_MIN, heroCardLayout, heroSizes } from './layout';
import { HeroCardPropsSchema, HeroCardSceneSchema } from './schema';
import { heroCardCues, heroCardPhrases, heroCardTimeline } from './timeline';

const steps = HeroCardPropsSchema.parse({
  hero: [{ text: '{accent|Timeout}' }, { text: 'không có nghĩa là {wrong|thất bại}' }],
  numbered: true,
  rows: [
    { label: 'Client → Server', text: 'Thanh toán 500.000đ' },
    { label: 'Server', text: 'Trừ tiền', tone: 'good', mark: 'check' },
    { label: 'Server → Client', text: 'Phản hồi bị mất', tone: 'bad', mark: 'cross' },
    { label: 'Client', text: 'Chờ… hết giờ' },
    { label: 'Client → Server', text: 'Thử lại' },
    { label: 'Server', text: 'Trừ tiền lần 2', tone: 'bad', mark: 'check' },
  ],
});

describe('heroSizes', () => {
  it('sizes each line to the width and never makes line two larger than line one', () => {
    const [a, b] = heroSizes(['{accent|Timeout}', 'không có nghĩa là {wrong|thất bại}']);
    expect(a).toBe(112);
    expect(b).toBeLessThan(a ?? 0);
    expect(b).toBeGreaterThanOrEqual(HERO_MIN);
  });
  it('ignores markup when measuring', () => {
    expect(heroSizes(['{accent|abc}'])).toEqual(heroSizes(['abc']));
  });
});

describe('heroCardLayout', () => {
  it('fits the six-step flow in the content box', () => {
    const l = heroCardLayout(steps);
    expect(l.fits).toBe(true);
    expect(l.height).toBeLessThanOrEqual(CONTENT_BOX.height);
    expect(l.rowSize).toBeGreaterThanOrEqual(44);
  });
  it('prefers a smaller row size over a third wrapped line', () => {
    const l = heroCardLayout(
      HeroCardPropsSchema.parse({
        hero: [{ text: 'Cùng một mã' }, { text: 'Chỉ trừ một lần' }],
        rows: [{ text: 'Lần 2 → đã có mã → trả kết quả cũ, KHÔNG trừ tiền', tone: 'good' }],
      }),
    );
    expect(l.fits).toBe(true);
    expect(l.rowSize).toBeLessThan(56);
  });
  it('reports a hero line that is far too long as not fitting', () => {
    const long = { ...steps, hero: [{ text: 'x'.repeat(80) }] };
    expect(heroCardLayout(long).fits).toBe(false);
  });
  it('reports too many tall rows as not fitting', () => {
    const rows = Array.from({ length: 6 }, () => ({
      text: 'một dòng rất dài '.repeat(6),
      tone: 'neutral' as const,
    }));
    expect(heroCardLayout({ ...steps, rows }).fits).toBe(false);
  });
});

describe('schema', () => {
  it('needs a code block, rows or a footer', () => {
    expect(HeroCardPropsSchema.safeParse({ hero: [{ text: 'x' }] }).success).toBe(false);
  });
  it('allows at most six rows and two hero lines', () => {
    const row = { text: 'x' };
    expect(
      HeroCardPropsSchema.safeParse({ hero: [{ text: 'x' }], rows: Array(7).fill(row) }).success,
    ).toBe(false);
    expect(
      HeroCardPropsSchema.safeParse({
        hero: [{ text: 'a' }, { text: 'b' }, { text: 'c' }],
        rows: [row],
      }).success,
    ).toBe(false);
  });
  it('parses a scene', () => {
    expect(
      HeroCardSceneSchema.safeParse({
        id: 's',
        type: 'herocard',
        voice: 'x',
        draft: { durationSec: 5 },
        props: { hero: [{ text: 'x' }], footer: { text: 'y' } },
      }).success,
    ).toBe(true);
  });
});

describe('timeline', () => {
  it('lists phrases in reveal order: hero, code, rows, footer', () => {
    const p = HeroCardPropsSchema.parse({
      hero: [
        { text: 'a', at: 'h1' },
        { text: 'b', at: 'h2' },
      ],
      code: { text: 'SELECT 1', at: 'c' },
      rows: [{ text: 'r', at: 'r1' }],
      footer: { text: 'f', at: 'f1' },
    });
    expect(heroCardPhrases(p)).toEqual(['h1', 'h2', 'c', 'r1', 'f1']);
  });
  it('spreads fallback frames in order inside the scene', () => {
    const t = heroCardTimeline(300, 5);
    expect(t).toEqual([...t].sort((a, b) => a - b));
    expect(t[4]).toBeLessThan(300);
  });
  it('uses spoken frames and splits them back into hero, code, rows, footer', () => {
    const p = HeroCardPropsSchema.parse({
      hero: [{ text: 'a' }, { text: 'b' }],
      code: { text: 'SELECT 1' },
      rows: [{ text: 'r1' }, { text: 'r2' }],
      footer: { text: 'f' },
    });
    const cues = heroCardCues(p, [10, 40, 80, 120, 160, 220], 300);
    expect(cues).toEqual({ hero: [10, 40], code: 80, rows: [120, 160], footer: 220 });
  });
  it('falls back when nothing is spoken', () => {
    const p = HeroCardPropsSchema.parse({ hero: [{ text: 'a' }], rows: [{ text: 'r' }] });
    const cues = heroCardCues(p, [undefined, undefined], 300);
    const t = heroCardTimeline(300, 2);
    expect(cues).toEqual({ hero: [t[0]], code: undefined, rows: [t[1]], footer: undefined });
  });
});
