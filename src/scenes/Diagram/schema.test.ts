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
});
