import { describe, expect, it } from 'vitest';
import {
  LABEL_INSET,
  labelSpace,
  layoutDiagram,
  polylineHitsRect,
  fitNodeText,
  defaultLayoutOptions,
} from './layout';

const box = { width: 850, height: 1130 };
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

  it('keeps six layers inside the box', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const edges = ids.slice(1).map((to, i) => ({ from: ids[i] ?? 'a', to }));
    const layout = layoutDiagram(n(...ids), edges, box);
    expect(layout.layerCount).toBe(6);
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
  const longLabel = 'Một nhãn rất dài cần nhiều dòng trong thẻ hẹp ' + 'x'.repeat(30);
  it('shrinks the text and/or grows the layer so the label fits', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const nodes = [
      { id: 'root', label: 'Root' },
      ...ids.map((id, i) => ({ id, label: i === 2 ? longLabel : id })),
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
    const long = layout.nodes.find((node) => node.id === 'c');
    expect(long?.fontSize).toBeLessThan(defaultLayoutOptions.nodeFontMax);
  });

  it('keeps full size for short labels', () => {
    const layout = layoutDiagram(n('a'), [], box);
    expect(layout.nodes[0]?.fontSize).toBe(defaultLayoutOptions.nodeFontMax);
  });
});

describe('labelSpace', () => {
  it('keeps at least LABEL_INSET from both box edges and picks the roomier side', () => {
    for (const x of [100, 300, 425, 600, 750]) {
      const s = labelSpace(x, 850);
      if (s.placeRight) expect(x + 16 + s.maxWidth).toBeLessThanOrEqual(850 - LABEL_INSET);
      else expect(x - 16 - s.maxWidth).toBeGreaterThanOrEqual(LABEL_INSET);
    }
    expect(labelSpace(60, 850).placeRight).toBe(true);
    expect(labelSpace(800, 850).placeRight).toBe(false);
  });
});
