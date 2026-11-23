import { describe, expect, it } from 'vitest';
import { DIAGRAM_BOX, layoutDiagram } from './layout';
import {
  MAX_HOP_FRAMES,
  MIN_HOP_FRAMES,
  formatStepLabel,
  hopProgress,
  hopTrack,
  partialPath,
  planTraversal,
  pointAlong,
  stepLitAt,
  traversalAt,
} from './traversal';

describe('planTraversal', () => {
  it('scales the pace with the scene length, within limits', () => {
    const short = planTraversal(120, 60, 4);
    const long = planTraversal(900, 60, 4);
    expect(short.hopFrames).toBeGreaterThanOrEqual(MIN_HOP_FRAMES);
    expect(long.hopFrames).toBeGreaterThan(short.hopFrames);
    expect(long.hopFrames).toBeLessThanOrEqual(MAX_HOP_FRAMES);
  });

  it('finishes before the scene ends even when the cue is late', () => {
    const plan = planTraversal(300, 295, 5);
    expect(plan.start + plan.hops * plan.hopFrames).toBeLessThan(300);
    expect(plan.start).toBeGreaterThanOrEqual(0);
  });

  it('handles a single node', () => {
    const plan = planTraversal(300, 100, 1);
    expect(plan.hops).toBe(0);
    expect(traversalAt(plan, 200)).toMatchObject({ active: true, reached: 1 });
  });
});

describe('traversalAt', () => {
  const plan = planTraversal(420, 200, 4);
  it('is inactive before the start', () => {
    expect(traversalAt(plan, plan.start - 1)).toEqual({
      active: false,
      hop: 0,
      progress: 0,
      reached: 0,
    });
  });

  it('lights the first node at the start and advances one step per hop', () => {
    expect(traversalAt(plan, plan.start).reached).toBe(1);
    expect(traversalAt(plan, plan.start + plan.dwell + 2).reached).toBe(1);
    expect(traversalAt(plan, stepLitAt(plan, 1)).reached).toBe(2);
    expect(traversalAt(plan, stepLitAt(plan, 2)).reached).toBe(3);
  });

  it('ends on the last hop, fully travelled, with every step reached', () => {
    const end = traversalAt(plan, 419);
    expect(end).toMatchObject({ hop: 2, progress: 1, reached: 4 });
  });

  it('eases each hop monotonically from 0 to 1', () => {
    let last = -1;
    for (let f = plan.start; f <= plan.start + plan.hopFrames; f += 1) {
      const p = hopProgress(plan, 0, f);
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
    expect(hopProgress(plan, 0, plan.start)).toBe(0);
    expect(hopProgress(plan, 0, plan.start + plan.hopFrames)).toBe(1);
  });
});

describe('formatStepLabel', () => {
  it('defaults to "Bước k/n" and fills custom placeholders', () => {
    expect(formatStepLabel(undefined, 3, 4)).toBe('Bước 3/4');
    expect(formatStepLabel('Còn lại {n} trừ {k}: {k}/{n}', 1, 2)).toBe('Còn lại 2 trừ 1: 1/2');
  });
});

describe('geometry', () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];
  it('pointAlong follows arc length', () => {
    expect(pointAlong(line, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAlong(line, 0.25)).toEqual({ x: 50, y: 0 });
    expect(pointAlong(line, 0.5)).toEqual({ x: 100, y: 0 });
    expect(pointAlong(line, 1)).toEqual({ x: 100, y: 100 });
    expect(pointAlong([], 0.5)).toEqual({ x: 0, y: 0 });
  });

  it('partialPath covers the polyline up to t', () => {
    expect(partialPath(line, 0)).toBe('');
    expect(partialPath(line, 0.75)).toBe('M 0 0 L 100 0 L 100 50');
  });

  it('hopTrack runs from the source border to the target tip, reversed for upward hops', () => {
    const layout = layoutDiagram(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      [{ from: 'a', to: 'b' }],
      DIAGRAM_BOX,
    );
    const down = hopTrack(layout.edges, 'a', 'b') ?? [];
    const up = hopTrack(layout.edges, 'b', 'a') ?? [];
    const edge = layout.edges[0];
    expect(down[down.length - 1]).toEqual(edge?.tip);
    expect(up[0]).toEqual(edge?.tip);
    expect(up[up.length - 1]).toEqual(down[0]);
    expect(hopTrack(layout.edges, 'a', 'zzz')).toBeUndefined();
  });
});
