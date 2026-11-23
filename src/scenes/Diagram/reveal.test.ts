import { describe, expect, it } from 'vitest';
import { DIAGRAM_BOX, layoutDiagram } from './layout';
import { NO_CUES, buildTimeline, edgeKey } from './reveal';

const nodes = ['a', 'b', 'c'].map((id) => ({ id, label: id.toUpperCase() }));
const edges = [
  { from: 'a', to: 'b' },
  { from: 'b', to: 'c' },
];
const layout = layoutDiagram(nodes, edges, DIAGRAM_BOX);
const at = (map: ReadonlyMap<string, number>, key: string): number => map.get(key) ?? Number.NaN;

describe('buildTimeline', () => {
  it('without cues reveals layer by layer, in order', () => {
    const t = buildTimeline(layout, 300, NO_CUES);
    expect(at(t.nodeStart, 'a')).toBeLessThan(at(t.nodeStart, 'b'));
    expect(at(t.nodeStart, 'b')).toBeLessThan(at(t.nodeStart, 'c'));
    expect(at(t.edgeStart, 'a->b')).toBeGreaterThan(at(t.nodeStart, 'a'));
  });

  it('uses node cues, clamped into the scene', () => {
    const t = buildTimeline(layout, 300, {
      nodes: new Map([
        ['a', 20],
        ['b', 100],
        ['c', 9999],
      ]),
      edges: new Map(),
    });
    expect(at(t.nodeStart, 'a')).toBe(20);
    expect(at(t.nodeStart, 'b')).toBe(100);
    expect(at(t.nodeStart, 'c')).toBeLessThan(300);
    const negative = buildTimeline(layout, 300, {
      nodes: new Map([['a', -50]]),
      edges: new Map(),
    });
    expect(at(negative.nodeStart, 'a')).toBe(0);
  });

  it('never starts an edge before its source node exists', () => {
    const t = buildTimeline(layout, 300, {
      nodes: new Map([['a', 120]]),
      edges: new Map([[edgeKey({ from: 'a', to: 'b' }), 10]]),
    });
    expect(at(t.edgeStart, 'a->b')).toBeGreaterThan(at(t.nodeStart, 'a'));
  });

  it('keeps uncued children after a late cued parent', () => {
    const t = buildTimeline(layout, 300, { nodes: new Map([['a', 150]]), edges: new Map() });
    expect(at(t.nodeStart, 'b')).toBeGreaterThan(at(t.nodeStart, 'a'));
    expect(at(t.nodeStart, 'c')).toBeGreaterThan(at(t.nodeStart, 'b'));
  });

  it('draws an uncued edge so that it arrives as its cued target appears', () => {
    const t = buildTimeline(layout, 300, { nodes: new Map([['b', 150]]), edges: new Map() });
    expect(at(t.edgeStart, 'a->b') + t.edgeFrames).toBeCloseTo(at(t.nodeStart, 'b'), 0);
  });

  it('matches the old layer timing when no cues are given', () => {
    const t = buildTimeline(layout, 300);
    expect(at(t.nodeStart, 'a')).toBe(4);
  });
});
