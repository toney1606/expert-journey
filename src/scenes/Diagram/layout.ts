/** Pure layered layout for the Diagram scene. Flows top to bottom. */

export type LayoutBox = { width: number; height: number };

export type LayoutOptions = {
  maxNodeWidth: number;
  maxNodeHeight: number;
  minNodeHeight: number;
  /** Minimum vertical space between layers (room for arrows and edge labels). */
  minLayerGap: number;
  maxLayerGap: number;
  columnGap: number;
  /** Space kept at the right edge for arrows that point back up (cycles). */
  railWidth: number;
  arrowLength: number;
  /** Inset from every side of the box so borders and strokes never touch the edge. */
  pad: number;
};

/** Distance of the back-edge rail from the right edge of the box; its label sits left of it. */
export const RAIL_INSET = 24;

export const defaultLayoutOptions: LayoutOptions = {
  maxNodeWidth: 700,
  maxNodeHeight: 160,
  minNodeHeight: 120,
  minLayerGap: 90,
  maxLayerGap: 150,
  columnGap: 28,
  railWidth: 80,
  arrowLength: 22,
  pad: 8,
};

export type NodeInput = { id: string; label: string };
export type EdgeInput = { from: string; to: string; label?: string };

export type PlacedNode = {
  id: string;
  label: string;
  layer: number;
  /** Position inside the layer, left to right. */
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlacedEdge = {
  from: string;
  to: string;
  label?: string;
  /** `back` edges close a cycle and are routed along the right rail. */
  kind: 'forward' | 'back';
  /** SVG path data from the source border to the arrow base. */
  d: string;
  /** Arrow tip (touches the target border) and the direction it points. */
  tip: { x: number; y: number };
  direction: 'down' | 'left';
  /** Anchor for the edge label. */
  mid: { x: number; y: number };
};

export type DiagramLayout = {
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  layerCount: number;
  nodeHeight: number;
};

const uniqueNodes = (nodes: readonly NodeInput[]): NodeInput[] => {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
};

/** Marks edges that close a cycle (found by DFS) so the rest is a DAG. Self loops are dropped. */
const findBackEdges = (ids: readonly string[], edges: readonly EdgeInput[]): Set<EdgeInput> => {
  const out = new Map<string, EdgeInput[]>(ids.map((id) => [id, []]));
  for (const edge of edges) out.get(edge.from)?.push(edge);
  const state = new Map<string, 'open' | 'done'>();
  const back = new Set<EdgeInput>();
  const visit = (id: string): void => {
    state.set(id, 'open');
    for (const edge of out.get(id) ?? []) {
      const next = state.get(edge.to);
      if (next === 'open') back.add(edge);
      else if (next === undefined) visit(edge.to);
    }
    state.set(id, 'done');
  };
  for (const id of ids) if (!state.has(id)) visit(id);
  return back;
};

/** Layer = longest path from any source over the forward (acyclic) edges. */
const assignLayers = (
  ids: readonly string[],
  forward: readonly EdgeInput[],
): Map<string, number> => {
  const layer = new Map<string, number>(ids.map((id) => [id, 0]));
  const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const edge of forward) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  const queue = ids.filter((id) => indegree.get(id) === 0);
  for (let head = 0; head < queue.length; head += 1) {
    const id = queue[head];
    if (id === undefined) break;
    for (const edge of forward) {
      if (edge.from !== id) continue;
      layer.set(edge.to, Math.max(layer.get(edge.to) ?? 0, (layer.get(id) ?? 0) + 1));
      const left = (indegree.get(edge.to) ?? 1) - 1;
      indegree.set(edge.to, left);
      if (left === 0) queue.push(edge.to);
    }
  }
  return layer;
};

export const layoutDiagram = (
  nodeInputs: readonly NodeInput[],
  edgeInputs: readonly EdgeInput[],
  box: LayoutBox,
  overrides: Partial<LayoutOptions> = {},
): DiagramLayout => {
  const opts = { ...defaultLayoutOptions, ...overrides };
  const nodes = uniqueNodes(nodeInputs);
  const ids = nodes.map((node) => node.id);
  const known = new Set(ids);
  const edges = edgeInputs.filter(
    (edge) => known.has(edge.from) && known.has(edge.to) && edge.from !== edge.to,
  );
  const backSet = findBackEdges(ids, edges);
  const forward = edges.filter((edge) => !backSet.has(edge));
  const layerOf = assignLayers(ids, forward);
  const layerCount = Math.max(0, ...ids.map((id) => (layerOf.get(id) ?? 0) + 1));

  // Group by layer, then order by the average position of parents (one downward pass).
  const layers: string[][] = Array.from({ length: layerCount }, () => []);
  for (const id of ids) layers[layerOf.get(id) ?? 0]?.push(id);
  const orderOf = new Map<string, number>();
  layers.forEach((layerIds, index) => {
    if (index > 0) {
      const score = (id: string): number => {
        const parents = forward
          .filter((edge) => edge.to === id)
          .map((edge) => orderOf.get(edge.from));
        const known2 = parents.filter((value): value is number => value !== undefined);
        return known2.length === 0
          ? Number.POSITIVE_INFINITY
          : known2.reduce((a, b) => a + b, 0) / known2.length;
      };
      layerIds.sort((a, b) => score(a) - score(b)); // stable: ties keep input order
    }
    layerIds.forEach((id, order) => orderOf.set(id, order));
  });

  const hasBack = backSet.size > 0;
  const innerHeight = box.height - 2 * opts.pad;
  const usableWidth = box.width - 2 * opts.pad - (hasBack ? opts.railWidth : 0);
  const rows = Math.max(1, layerCount);
  const nodeHeight = Math.max(
    opts.minNodeHeight,
    Math.min(opts.maxNodeHeight, (innerHeight - (rows - 1) * opts.minLayerGap) / rows),
  );
  const gap =
    rows === 1 ? 0 : Math.min(opts.maxLayerGap, (innerHeight - rows * nodeHeight) / (rows - 1));
  const usedHeight = rows * nodeHeight + (rows - 1) * gap;
  const top = opts.pad + Math.max(0, (innerHeight - usedHeight) / 2);

  const placed = new Map<string, PlacedNode>();
  layers.forEach((layerIds, layer) => {
    const count = layerIds.length;
    const width = Math.min(opts.maxNodeWidth, (usableWidth - (count - 1) * opts.columnGap) / count);
    const rowWidth = count * width + (count - 1) * opts.columnGap;
    const left = opts.pad + (usableWidth - rowWidth) / 2;
    layerIds.forEach((id, order) => {
      const label = nodes.find((node) => node.id === id)?.label ?? id;
      placed.set(id, {
        id,
        label,
        layer,
        order,
        x: left + order * (width + opts.columnGap),
        y: top + layer * (nodeHeight + gap),
        width,
        height: nodeHeight,
      });
    });
  });

  const placedEdges: PlacedEdge[] = [];
  for (const edge of edges) {
    const source = placed.get(edge.from);
    const target = placed.get(edge.to);
    if (!source || !target) continue;
    const label = edge.label === undefined ? {} : { label: edge.label };
    if (backSet.has(edge)) {
      const sy = source.y + source.height / 2;
      const ty = target.y + target.height / 2;
      const sx = source.x + source.width;
      const tx = target.x + target.width;
      const railX = box.width - opts.pad - RAIL_INSET;
      const tipX = tx;
      const baseX = tx + opts.arrowLength;
      placedEdges.push({
        ...label,
        from: edge.from,
        to: edge.to,
        kind: 'back',
        d: `M ${sx} ${sy} L ${railX} ${sy} L ${railX} ${ty} L ${baseX} ${ty}`,
        tip: { x: tipX, y: ty },
        direction: 'left',
        mid: { x: railX, y: (sy + ty) / 2 },
      });
      continue;
    }
    const sx = source.x + source.width / 2;
    const sy = source.y + source.height;
    const tx = target.x + target.width / 2;
    const ty = target.y;
    const by = ty - opts.arrowLength;
    const dy = (by - sy) / 2;
    placedEdges.push({
      ...label,
      from: edge.from,
      to: edge.to,
      kind: 'forward',
      d: `M ${sx} ${sy} C ${sx} ${sy + dy} ${tx} ${by - dy} ${tx} ${by}`,
      tip: { x: tx, y: ty },
      direction: 'down',
      // Label sits next to the arrow end so sibling edges from one source never share an anchor.
      mid: { x: tx, y: sy + (by - sy) * 0.6 },
    });
  }

  return {
    nodes: nodes.map((node) => placed.get(node.id)).filter((n): n is PlacedNode => n !== undefined),
    edges: placedEdges,
    layerCount,
    nodeHeight,
  };
};
