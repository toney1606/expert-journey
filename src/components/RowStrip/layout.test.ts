import { describe, expect, it } from 'vitest';
import {
  cellOrigin,
  clusterIndices,
  oldSideIndices,
  pendingCount,
  pendingIndices,
  seededRandom,
  spreadIndices,
  stopIndex,
  stripBlockHeight,
  stripPendingCount,
  stripGeometry,
} from './layout';

const g = stripGeometry();

describe('stripGeometry', () => {
  it('fits the content width with visible cells', () => {
    expect(g.total).toBe(g.cols * g.rows);
    expect(g.pitch * g.cols).toBeCloseTo(g.width);
    expect(g.cell).toBeGreaterThanOrEqual(36);
    expect(stripBlockHeight(g)).toBeLessThan(400);
  });
  it('numbers cells from the newest (right) to the oldest (left)', () => {
    expect(cellOrigin(0, g).x).toBeGreaterThan(cellOrigin(g.total - 1, g).x);
    expect(cellOrigin(0, g).y).toBeLessThan(cellOrigin(1, g).y);
    expect(cellOrigin(g.rows, g).x).toBeLessThan(cellOrigin(0, g).x);
  });
});

describe('pending cells', () => {
  it('are 5% of the cells', () => {
    expect(pendingCount(240, 5)).toBe(12);
    expect(pendingCount(10, 1)).toBe(1);
  });
  it('are deterministic, unique, sorted and evenly spread', () => {
    const a = spreadIndices(240, 12);
    expect(spreadIndices(240, 12)).toEqual(a);
    expect(new Set(a).size).toBe(12);
    expect(a).toEqual([...a].sort((x, y) => x - y));
    a.forEach((v, k) => {
      expect(v).toBeGreaterThanOrEqual(k * 20);
      expect(v).toBeLessThan((k + 1) * 20);
    });
  });
  it('seeded random is repeatable and differs per seed', () => {
    expect(seededRandom(1)()).toBe(seededRandom(1)());
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
  it('slide to the old side or gather in one block', () => {
    expect(oldSideIndices(240, 12)).toEqual(Array.from({ length: 12 }, (_, k) => 228 + k));
    const c = clusterIndices(240, 12);
    expect(c[11]! - c[0]!).toBe(11);
    expect(c[0]).toBeGreaterThan(20);
    expect(c[11]).toBeLessThan(220);
    expect(pendingIndices('spread', 240, 12)).toEqual(spreadIndices(240, 12));
    expect(pendingIndices('clustered-old', 240, 12)).toEqual(oldSideIndices(240, 12));
    expect(pendingIndices('reorganised', 240, 12)).toEqual(c);
  });
});

describe('stopIndex', () => {
  it('stops at the wanted pending cell', () => {
    const spread = spreadIndices(240, 12);
    expect(stopIndex(spread, 240, 10)).toBe(spread[9]);
    expect(stopIndex(spread, 240, 10)).toBeGreaterThan(180);
    expect(stopIndex(spread, 240, 10)).toBeLessThan(220);
  });
  it('counts only cells from readStart and clamps', () => {
    const c = clusterIndices(240, 12);
    expect(stopIndex(c, 240, 10, c[0])).toBe(c[9]);
    expect(stopIndex(c, 240, 99)).toBe(c[11]);
    expect(stopIndex([], 240, 3)).toBe(239);
  });
  it('twist: first pending of the old-side cluster is after almost every cell', () => {
    expect(stopIndex(oldSideIndices(240, 12), 240, 1)).toBe(228);
  });
});

describe('strip band', () => {
  it('spans the full video width with big cells and always has enough orange cells', () => {
    expect(g.width).toBe(1080);
    expect(g.pitch).toBeGreaterThanOrEqual(40);
    expect(g.cell).toBeGreaterThanOrEqual(36);
    expect(stripPendingCount(g.total, 5)).toBeGreaterThanOrEqual(10);
    expect(stripPendingCount(240, 5)).toBe(12);
  });
});
