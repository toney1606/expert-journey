import { describe, expect, it } from 'vitest';
import { DiagramPropsSchema } from './schema';

const nodes = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
];

describe('DiagramPropsSchema', () => {
  it('accepts edges between existing nodes', () => {
    const result = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes,
      edges: [{ from: 'a', to: 'b', label: 'x' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects duplicate node ids', () => {
    const result = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes: [...nodes, { id: 'a', label: 'again' }],
      edges: [],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['nodes', 2, 'id']);
  });

  it('rejects an edge to an unknown node, naming the field', () => {
    const result = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes,
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'zzz' },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['edges', 1, 'to']);
  });

  it('rejects an edge from an unknown node', () => {
    const result = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes,
      edges: [{ from: 'nope', to: 'b' }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['edges', 0, 'from']);
  });

  const chain = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
  ];
  const chainEdges = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ];

  it('stays valid without the optional cue/path fields and accepts them when set', () => {
    const plain = DiagramPropsSchema.safeParse({ title: 'T', nodes: chain, edges: chainEdges });
    expect(plain.success).toBe(true);
    const rich = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes: [{ id: 'a', label: 'A', at: 'bắt đầu' }, ...chain.slice(1)],
      edges: [{ from: 'a', to: 'b', at: 'rồi' }, chainEdges[1]],
      path: ['a', 'b', 'c'],
      pathAt: 'đi xuống',
      stepLabel: 'Tầng {k} trên {n}',
      emphasis: 'c',
    });
    expect(rich.success).toBe(true);
  });

  it('rejects a path with an unknown node id, naming the index', () => {
    const result = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes: chain,
      edges: chainEdges,
      path: ['a', 'zzz'],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['path', 1]);
  });

  it('rejects consecutive path nodes that are not connected by an edge', () => {
    const result = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes: chain,
      edges: chainEdges,
      path: ['a', 'c'],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['path', 1]);
  });

  it('allows a path to walk an edge backwards', () => {
    const result = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes: chain,
      edges: chainEdges,
      path: ['a', 'b', 'a'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown emphasis node and an empty cue phrase', () => {
    const bad = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes: chain,
      edges: chainEdges,
      emphasis: 'nope',
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.path).toEqual(['emphasis']);
    const empty = DiagramPropsSchema.safeParse({
      title: 'T',
      nodes: [{ id: 'a', label: 'A', at: '' }],
      edges: [],
    });
    expect(empty.success).toBe(false);
  });
});
