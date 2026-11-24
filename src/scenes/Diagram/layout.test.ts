import { describe, expect, it } from 'vitest';
import { CONTENT_BOX } from '../../design/tokens';
import {
  LABEL_INSET,
  labelSpace,
  layoutDiagram,
  polylineHitsRect,
  fitNodeText,
  defaultLayoutOptions,
  DIAGRAM_BOX,
  spreadOffsets,
} from './layout';

const box = DIAGRAM_BOX;
const n = (...ids: string[]) => ids.map((id) => ({ id, label: id.toUpperCase() }));
const byId = (layout: ReturnType<typeof layoutDiagram>, id: string) => {
  const found = layout.nodes.find((node) => node.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};

const expectInside = (layout: ReturnType<typeof layoutDiagram>) => {
  for (const node of layout.nodes) {
    expect(node.x).toBeGreaterThanOrEqual(0);
    expect(node.y).toBeGreaterThanOrEqual(0);
    expect(node.x + node.width).toBeLessThanOrEqual(box.width + 1e-6);
    expect(node.y + node.height).toBeLessThanOrEqual(box.height + 1e-6);
  }
};

const expectNoOverlap = (layout: ReturnType<typeof layoutDiagram>) => {
  const list = layout.nodes;
  for (const a of list)
    for (const b of list) {
      if (a.id >= b.id) continue;
      const apart =
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y;
      expect(apart).toBe(true);
    }
};

describe('layoutDiagram', () => {
  it('puts a fan-out below its source, side by side', () => {
    const layout = layoutDiagram(
      n('q', 'a', 'b'),
      [
        { from: 'q', to: 'a' },
        { from: 'q', to: 'b' },
      ],
      box,
    );
    expect(byId(layout, 'q').layer).toBe(0);
    expect(byId(layout, 'a').layer).toBe(1);
    expect(byId(layout, 'b').layer).toBe(1);
    expect(byId(layout, 'a').y).toBeGreaterThan(byId(layout, 'q').y);
    expect(byId(layout, 'a').y).toBe(byId(layout, 'b').y);
    expect(byId(layout, 'a').x).toBeLessThan(byId(layout, 'b').x);
    expectInside(layout);
    expectNoOverlap(layout);
  });

  it('uses the longest path for layers (node with two parents)', () => {
    const layout = layoutDiagram(
      n('a', 'b', 'c'),
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'a', to: 'c' },
      ],
      box,
    );
    expect(byId(layout, 'c').layer).toBe(2);
    expect(layout.layerCount).toBe(3);
  });

  it('terminates on cycles and routes the closing edge on the rail', () => {
    const layout = layoutDiagram(
      n('a', 'b', 'c'),
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' },
      ],
      box,
    );
    expect(layout.nodes.map((node) => node.layer)).toEqual([0, 1, 2]);
    expect(layout.edges.filter((edge) => edge.kind === 'back')).toHaveLength(1);
    expectInside(layout);
    for (const node of layout.nodes)
      expect(node.x + node.width).toBeLessThanOrEqual(box.width - 80);
  });

  it('handles self loops, unknown ids, duplicates and disconnected nodes', () => {
    const layout = layoutDiagram(
      [...n('a', 'b', 'lone'), { id: 'a', label: 'dup' }],
      [
        { from: 'a', to: 'a' },
        { from: 'a', to: 'zzz' },
        { from: 'a', to: 'b' },
      ],
      box,
    );
    expect(layout.nodes).toHaveLength(3);
    expect(layout.edges).toHaveLength(1);
    expect(byId(layout, 'lone').layer).toBe(0);
    expectInside(layout);
    expectNoOverlap(layout);
  });

  it('fits a single node and an empty graph', () => {
    const one = layoutDiagram(n('a'), [], box);
    expect(one.nodes).toHaveLength(1);
    expectInside(one);
    expect(layoutDiagram([], [], box).nodes).toEqual([]);
  });

  it('keeps five layers inside the box', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const edges = ids.slice(1).map((to, i) => ({ from: ids[i] ?? 'a', to }));
    const layout = layoutDiagram(n(...ids), edges, box);
    expect(layout.layerCount).toBe(5);
    expectInside(layout);
    expectNoOverlap(layout);
  });

  it('is deterministic', () => {
    const edges = [{ from: 'a', to: 'b' }];
    expect(layoutDiagram(n('a', 'b'), edges, box)).toEqual(layoutDiagram(n('a', 'b'), edges, box));
  });
});

const expectEdgesAvoidOtherNodes = (layout: ReturnType<typeof layoutDiagram>) => {
  for (const edge of layout.edges)
    for (const node of layout.nodes) {
      if (node.id === edge.from || node.id === edge.to) continue;
      expect(
        polylineHitsRect(edge.polyline, node),
        `${edge.from}->${edge.to} crosses ${node.id}`,
      ).toBe(false);
    }
};

describe('layer-skipping edges', () => {
  // a -> b -> c -> d chain, plus a -> d skipping b and c (which sit straight below a).
  const chain = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
    { from: 'c', to: 'd' },
  ];

  it('routes a skip edge around the intermediate nodes', () => {
    const layout = layoutDiagram(
      n('a', 'b', 'c', 'd'),
      [...chain, { from: 'a', to: 'd', label: 'cache' }],
      box,
    );
    const skip = layout.edges.find((edge) => edge.from === 'a' && edge.to === 'd');
    expect(skip?.routed).toBe(true);
    expectEdgesAvoidOtherNodes(layout);
    expectInside(layout);
    expectNoOverlap(layout);
  });

  it('keeps a mixed 6-node graph (skip + back edge) clear of foreign nodes', () => {
    const layout = layoutDiagram(
      n('a', 'b', 'c', 'd', 'e', 'f'),
      [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'b', to: 'd' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e' },
        { from: 'a', to: 'e', label: 'skip' },
        { from: 'b', to: 'f' },
        { from: 'e', to: 'f' },
      ],
      box,
    );
    expectEdgesAvoidOtherNodes(layout);
    // 5 layers plus a skip edge fit the 830x1130 box (the 4-layer limit applied to 780x770).
    expect(layout.fits).toBe(true);
    expectInside(layout);
    expectNoOverlap(layout);
  });

  it('keeps a skip edge with several skippers inside the box', () => {
    const layout = layoutDiagram(
      n('a', 'b', 'c', 'd', 'e'),
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e' },
        { from: 'a', to: 'd' },
        { from: 'b', to: 'e' },
      ],
      box,
    );
    expectEdgesAvoidOtherNodes(layout);
    for (const edge of layout.edges)
      for (const p of edge.polyline) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(box.width);
      }
  });

  it('leaves a skip edge that already misses every node as a curve', () => {
    const layout = layoutDiagram(
      n('a', 'b', 'c'),
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'a', to: 'c' },
      ],
      box,
    );
    // b is directly in the way of a -> c (all centred), so it is routed too.
    expectEdgesAvoidOtherNodes(layout);
  });
});

describe('long labels in narrow nodes', () => {
  const longLabel = 'Một nhãn khá dài cần nhiều dòng trong thẻ hẹp';
  it('shrinks the text and/or grows the layer so the label fits', () => {
    const ids = ['a', 'b', 'c'];
    const nodes = [
      { id: 'root', label: 'Root' },
      ...ids.map((id, i) => ({ id, label: i === 1 ? longLabel : id })),
    ];
    const layout = layoutDiagram(
      nodes,
      ids.map((to) => ({ from: 'root', to })),
      box,
    );
    expectInside(layout);
    expectNoOverlap(layout);
    for (const node of layout.nodes) {
      const need = fitNodeText(node.label, node.width, node.height, defaultLayoutOptions);
      expect(need.neededHeight).toBeLessThanOrEqual(node.height);
      expect(node.fontSize).toBeGreaterThanOrEqual(defaultLayoutOptions.nodeFontMin);
      expect(node.fontSize).toBeLessThanOrEqual(defaultLayoutOptions.nodeFontMax);
    }
    const long = layout.nodes.find((node) => node.id === 'b');
    expect(long?.fontSize).toBeLessThan(defaultLayoutOptions.nodeFontMax);
  });

  it('keeps full size for short labels', () => {
    const layout = layoutDiagram(n('a'), [], box);
    expect(layout.nodes[0]?.fontSize).toBe(defaultLayoutOptions.nodeFontMax);
  });
});

describe('labelSpace', () => {
  it('keeps at least LABEL_INSET from both box edges and picks the roomier side', () => {
    for (const x of [100, 300, box.width / 2, 600, box.width - 100]) {
      const s = labelSpace(x, box.width);
      if (s.placeRight) expect(x + 16 + s.maxWidth).toBeLessThanOrEqual(box.width - LABEL_INSET);
      else expect(x - 16 - s.maxWidth).toBeGreaterThanOrEqual(LABEL_INSET);
    }
    expect(labelSpace(60, box.width).placeRight).toBe(true);
    expect(labelSpace(box.width - 50, box.width).placeRight).toBe(false);
  });
});

describe('fits and limits in the 830x1130 content box', () => {
  const chain = (count: number) => {
    const ids = Array.from({ length: count }, (_, i) => `n${i}`);
    const edges = ids.slice(1).map((id, i) => ({ from: ids[i] as string, to: id }));
    return layoutDiagram(
      ids.map((id) => ({ id, label: 'Step' })),
      edges,
      box,
    );
  };
  const fan = (count: number) => {
    const kids = Array.from({ length: count }, (_, i) => `k${i}`);
    return layoutDiagram(
      [{ id: 'r', label: 'Root' }, ...kids.map((id) => ({ id, label: 'Item' }))],
      kids.map((id) => ({ from: 'r', to: id })),
      box,
    );
  };

  it('derives its box from CONTENT_BOX', () => {
    expect(box.width).toBe(CONTENT_BOX.width);
    expect(box.height).toBeLessThan(CONTENT_BOX.height);
    expect(box.width).toBe(830);
  });

  it('fits up to 7 layers with short labels and stays inside the box', () => {
    for (const count of [1, 3, 5, 7]) {
      const layout = chain(count);
      expect(layout.fits).toBe(true);
      expectInside(layout);
      expectNoOverlap(layout);
    }
  });

  it('does not fit 8 layers', () => {
    expect(chain(8).fits).toBe(false);
  });

  it('fits 5 nodes in a layer but not 6', () => {
    expect(fan(5).fits).toBe(true);
    expect(fan(6).fits).toBe(false);
  });

  it('needs wider gaps (so 6 layers at most) when an edge skips layers', () => {
    const build = (count: number) => {
      const ids = Array.from({ length: count }, (_, i) => `n${i}`);
      const edges = ids.slice(1).map((to, i) => ({ from: ids[i] as string, to }));
      edges.push({ from: 'n0', to: ids[count - 1] as string });
      return layoutDiagram(
        ids.map((id) => ({ id, label: 'Step' })),
        edges,
        box,
      );
    };
    expect(build(6).fits).toBe(true);
    expect(build(7).fits).toBe(false);
  });

  it('does not fit when long labels grow the layers past the height', () => {
    const label = 'A rather long label that wraps over many lines';
    const build = (ids: string[]) =>
      layoutDiagram(
        ids.map((id) => ({ id, label })),
        ids.slice(1).map((id, i) => ({ from: ids[i] as string, to: id })),
        box,
      );
    // Six such layers still fit (font shrinks to the minimum); seven do not.
    expect(build(['a', 'b', 'c', 'd', 'e', 'f']).fits).toBe(true);
    expect(build(['a', 'b', 'c', 'd', 'e', 'f', 'g']).fits).toBe(false);
  });
});

describe('spreadOffsets', () => {
  it('returns no shift for a single arrow and centred, ordered shifts otherwise', () => {
    expect(spreadOffsets(1, 300)).toEqual([0]);
    const two = spreadOffsets(2, 300);
    expect(two[0]).toBeCloseTo(-(two[1] ?? 0));
    expect(two[1]).toBeGreaterThan(0);
    const three = spreadOffsets(3, 300);
    expect(three[1]).toBeCloseTo(0);
    expect((three[2] ?? 0) - (three[1] ?? 0)).toBeGreaterThanOrEqual(24);
  });

  it('keeps the arrows inside the border margin on narrow nodes', () => {
    const offsets = spreadOffsets(3, 140);
    for (const offset of offsets) expect(Math.abs(offset)).toBeLessThanOrEqual(140 / 2 - 36);
  });
});

describe('arrowheads on a shared target', () => {
  it('do not coincide when an edge skips a layer next to a sibling edge', () => {
    // a -> b -> c, and a -> c skips a layer: both arrive at the top of c.
    const layout = layoutDiagram(
      n('a', 'b', 'c'),
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'a', to: 'c' },
      ],
      box,
    );
    const tips = layout.edges.filter((edge) => edge.to === 'c').map((edge) => edge.tip);
    expect(tips).toHaveLength(2);
    expect(Math.abs((tips[0]?.x ?? 0) - (tips[1]?.x ?? 0))).toBeGreaterThanOrEqual(24);
    const target = byId(layout, 'c');
    for (const tip of tips) {
      expect(tip.y).toBe(target.y);
      expect(tip.x).toBeGreaterThan(target.x);
      expect(tip.x).toBeLessThan(target.x + target.width);
    }
  });

  it('keeps single arrows centred and spreads a fan-in', () => {
    const layout = layoutDiagram(
      n('a', 'b', 'c', 'd'),
      [
        { from: 'a', to: 'd' },
        { from: 'b', to: 'd' },
        { from: 'c', to: 'd' },
      ],
      box,
    );
    const d = byId(layout, 'd');
    const xs = layout.edges.map((edge) => edge.tip.x).sort((p, q) => p - q);
    expect(new Set(xs.map((x) => Math.round(x))).size).toBe(3);
    expect(xs[1]).toBeCloseTo(d.x + d.width / 2);
    const single = layoutDiagram(n('a', 'b'), [{ from: 'a', to: 'b' }], box);
    const b = byId(single, 'b');
    expect(single.edges[0]?.tip.x).toBeCloseTo(b.x + b.width / 2);
  });
});
