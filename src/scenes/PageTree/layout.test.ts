import { describe, expect, it } from 'vitest';
import { CONTENT_BOX } from '../../design/tokens';
import {
  PATH_LEAF,
  PATH_MID,
  counterWidth,
  pageRowCount,
  pageRowShare,
  pageTreeLayout,
  splitReads,
  treeGeometry,
} from './layout';

const props = {
  pageLabel: '1 page = vài trăm dòng',
  total: 27000000,
  totalUnit: 'dòng',
  population: 10000000,
  populationUnit: 'người',
  readsLabel: '~3 lần đọc',
};

describe('pageTreeLayout', () => {
  it('fits the real scene with big numbers and a tall tree', () => {
    const l = pageTreeLayout(props);
    expect(l.fits).toBe(true);
    expect(l.totalSize).toBeGreaterThanOrEqual(112);
    expect(l.heroSize).toBeGreaterThanOrEqual(160);
    expect(l.levelLabelSize).toBeGreaterThanOrEqual(80);
    expect(l.treeHeight).toBeGreaterThanOrEqual(390);
    const used = 56 + l.treeHeight + l.totalRowHeight + l.cardHeight + 3 * l.gap;
    expect(used).toBeLessThanOrEqual(CONTENT_BOX.height);
    expect(used).toBeGreaterThanOrEqual(CONTENT_BOX.height * 0.8);
  });
  it('reports overflow instead of hiding it', () => {
    expect(pageTreeLayout({ ...props, readsLabel: 'rất dài '.repeat(20) }).fits).toBe(false);
    expect(
      pageTreeLayout({ ...props, populationUnit: 'đơn vị cực kỳ dài dòng không vừa nổi' }).fits,
    ).toBe(false);
    expect(pageTreeLayout({ ...props, totalUnit: 'đơn vị dài dòng quá' }).fits).toBe(false);
  });
  it('reports a box that is too short', () => {
    expect(pageTreeLayout(props, { width: 830, height: 700 }).fits).toBe(false);
  });
  it('splits the reads label into hero token and rest', () => {
    expect(splitReads('~3 lần đọc')).toEqual({ hero: '~3', rest: 'lần đọc' });
    expect(splitReads('vài lần')).toEqual({ hero: 'vài lần', rest: '' });
  });
  it('measures counter width with narrow separators', () => {
    expect(counterWidth(1000, 100)).toBeLessThan(counterWidth(1234, 100) + 100);
  });
});

describe('treeGeometry', () => {
  it('keeps every node inside the area, right of the gutter, with distinct leaves', () => {
    const g = treeGeometry(1080, 410);
    expect(g.mids).toHaveLength(3);
    expect(g.leaves).toHaveLength(9);
    for (const n of [g.root, ...g.mids, ...g.leaves]) {
      expect(n.x - n.r).toBeGreaterThanOrEqual(0);
      expect(n.x + n.r).toBeLessThanOrEqual(1080);
      expect(n.y - n.r).toBeGreaterThanOrEqual(0);
      expect(n.y + n.r).toBeLessThanOrEqual(410);
    }
    const xs = g.leaves.map((l) => l.x);
    expect(new Set(xs).size).toBe(9);
    expect(g.root.x).toBeCloseTo(540);
    expect(g.leaves[PATH_LEAF]?.x).toBeCloseTo(g.mids[PATH_MID]?.x ?? -1);
  });
});

describe('page rows', () => {
  it('shares stay in 0.5..0.95 and count scales with height', () => {
    for (let i = 0; i < 30; i += 1) {
      expect(pageRowShare(i)).toBeGreaterThanOrEqual(0.5);
      expect(pageRowShare(i)).toBeLessThanOrEqual(0.95);
    }
    expect(pageRowCount(560)).toBeGreaterThan(pageRowCount(300));
  });
});
