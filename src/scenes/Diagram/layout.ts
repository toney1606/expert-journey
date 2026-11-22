/** Pure layered layout for the Diagram scene. Flows top to bottom. */
import { CONTENT_BOX } from '../../design/tokens';

/** Title band above the diagram (two lines at 48px). */
export const DIAGRAM_TITLE_HEIGHT = 136;
/** Area available to the diagram itself: the scene content box minus the title. */
export const DIAGRAM_BOX = {
  width: CONTENT_BOX.width,
  height: CONTENT_BOX.height - DIAGRAM_TITLE_HEIGHT,
} as const;

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
  /** Node text sizing: the label shrinks from max to min, then the layer grows taller. */
  nodeFontMax: number;
  nodeFontMin: number;
  nodeLineHeight: number;
  /** Space between a node's outer edge and its text (border + padding). */
  nodePadX: number;
  nodePadY: number;
};

/** Distance of the back-edge rail from the right edge of the box; its label sits left of it. */
export const RAIL_INSET = 24;

export const defaultLayoutOptions: LayoutOptions = {
  maxNodeWidth: 700,
  maxNodeHeight: 160,
  minNodeHeight: 80,
  minLayerGap: 90,
  maxLayerGap: 150,
  columnGap: 28,
  railWidth: 80,
  arrowLength: 22,
  pad: 8,
  nodeFontMax: 40,
  nodeFontMin: 28,
  nodeLineHeight: 1.3,
  nodePadX: 20, // 4px border + 16px padding
  nodePadY: 12, // 4px border + 8px padding
};

/** Lanes (left of the nodes) used by edges that skip layers and would cross a node. */
export const LANE_START = 14;
export const LANE_STEP = 22;
export const MAX_LANES = 3;
/** Minimum distance between an edge label and any edge of the box. */
export const LABEL_INSET = 12;
/** Average glyph width in em for bold Be Vietnam Pro (slightly pessimistic). */
const NODE_CHAR_EM = 0.62;
/** Smallest vertical space between layers (arrow plus room for a label). */
export const MIN_GAP = 48;
/** Smallest gap when a layer-skipping edge runs through lanes: its horizontal runs need clear air beside sibling arrows. */
export const MIN_GAP_ROUTED = 72;
/** Narrowest node that still reads; a layer with more nodes than this allows does not fit. */
export const MIN_NODE_WIDTH = 140;

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
  /** Label font size in px (shrunk for long labels in narrow nodes). */
  fontSize: number;
};

export type Point = { x: number; y: number };

export type PlacedEdge = {
  from: string;
  to: string;
  label?: string;
  /** `back` edges close a cycle and are routed along the right rail. */
  kind: 'forward' | 'back';
  /** True when a layer-skipping edge was routed through a lane to avoid intermediate nodes. */
  routed?: boolean;
  /** Polyline approximating the drawn path (curves sampled); used for collision tests. */
  polyline: Point[];
  /** SVG path data from the source border to the arrow base. */
  d: string;
  /** Arrow tip (touches the target border) and the direction it points. */
  tip: { x: number; y: number };
  direction: 'down' | 'left';
  /** Anchor for the edge label. */
  mid: { x: number; y: number };
  /** Label anchoring: beside the arrow, or starting at `mid.x` and centred on a horizontal run. */
  labelMode?: 'beside' | 'run';
  /** For 'run' labels: maximum label width. */
  labelMaxWidth?: number;
};

export type DiagramLayout = {
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  layerCount: number;
  nodeHeight: number;
  /** False when layers do not fit the height at the minimum sizes, or a layer's nodes get narrower than MIN_NODE_WIDTH. */
  fits: boolean;
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

/** Greedy word-wrap estimate of the line count for a label. */
export const estimateLabelLines = (text: string, fontSize: number, widthPx: number): number => {
  const perLine = Math.max(1, Math.floor(widthPx / (fontSize * NODE_CHAR_EM)));
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let len = word.length;
    if (used > 0 && used + 1 + len <= perLine) {
      used += 1 + len;
      continue;
    }
    if (used > 0) lines += 1;
    while (len > perLine) {
      lines += 1;
      len -= perLine;
    }
    used = len;
  }
  return lines;
};

/** Largest font (max..min) whose wrapped label fits the node; otherwise min and the height it needs. */
export const fitNodeText = (
  label: string,
  width: number,
  height: number,
  opts: Pick<
    LayoutOptions,
    'nodeFontMax' | 'nodeFontMin' | 'nodeLineHeight' | 'nodePadX' | 'nodePadY'
  >,
): { fontSize: number; neededHeight: number } => {
  const innerW = Math.max(1, width - 2 * opts.nodePadX);
  const innerH = height - 2 * opts.nodePadY;
  let needed = 0;
  for (let size = opts.nodeFontMax; size >= opts.nodeFontMin; size -= 1) {
    needed = estimateLabelLines(label, size, innerW) * size * opts.nodeLineHeight;
    if (needed <= innerH) return { fontSize: size, neededHeight: height };
  }
  return { fontSize: opts.nodeFontMin, neededHeight: Math.ceil(needed + 2 * opts.nodePadY) };
};

/** Where an edge label goes: which side of the anchor and how wide it may be (>= LABEL_INSET from the box). */
export const labelSpace = (
  midX: number,
  boxWidth: number,
  side = 16,
  maxWidth = 360,
): { placeRight: boolean; maxWidth: number } => {
  const right = boxWidth - LABEL_INSET - (midX + side);
  const left = midX - side - LABEL_INSET;
  const placeRight =
    midX >= boxWidth / 2 - 1 ? right >= Math.min(left, 140) : left < Math.min(right, 140);
  return { placeRight, maxWidth: Math.max(60, Math.min(maxWidth, placeRight ? right : left)) };
};

const sampleCubic = (p0: Point, p1: Point, p2: Point, p3: Point, steps = 24): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  });

type Rect = { x: number; y: number; width: number; height: number };

/** True when the segment a-b passes through the rectangle grown by `margin`. */
export const segmentHitsRect = (a: Point, b: Point, rect: Rect, margin = 0): boolean => {
  const x0 = rect.x - margin;
  const x1 = rect.x + rect.width + margin;
  const y0 = rect.y - margin;
  const y1 = rect.y + rect.height + margin;
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  return clip(-dx, a.x - x0) && clip(dx, x1 - a.x) && clip(-dy, a.y - y0) && clip(dy, y1 - a.y);
};

export const polylineHitsRect = (points: readonly Point[], rect: Rect, margin = 0): boolean =>
  points.some((point, i) => {
    const next = points[i + 1];
    return next !== undefined && segmentHitsRect(point, next, rect, margin);
  });

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
  const rows = Math.max(1, layerCount);
  const baseHeight = Math.max(
    opts.minNodeHeight,
    Math.min(opts.maxNodeHeight, (innerHeight - (rows - 1) * opts.minLayerGap) / rows),
  );

  /** Places nodes with `lanes` lanes reserved at the left edge. */
  const place = (
    lanes: number,
  ): { placed: Map<string, PlacedNode>; gap: number; fits: boolean } => {
    const reserve = lanes > 0 ? LANE_STEP * lanes + 16 : 0;
    const usableWidth = box.width - 2 * opts.pad - (hasBack ? opts.railWidth : 0) - reserve;
    const labelOf = (id: string): string => nodes.find((node) => node.id === id)?.label ?? id;
    const widthOf = (count: number): number =>
      Math.min(opts.maxNodeWidth, (usableWidth - (count - 1) * opts.columnGap) / count);
    // A layer is as tall as its most demanding label (labels shrink first, then the layer grows).
    const layerHeights = layers.map((layerIds) => {
      const width = widthOf(layerIds.length);
      return layerIds.reduce(
        (max, id) => Math.max(max, fitNodeText(labelOf(id), width, baseHeight, opts).neededHeight),
        baseHeight,
      );
    });
    const sum = layerHeights.reduce((a, b) => a + b, 0);
    const minGap = lanes > 0 ? MIN_GAP_ROUTED : MIN_GAP;
    const gap =
      rows === 1
        ? 0
        : Math.max(minGap, Math.min(opts.maxLayerGap, (innerHeight - sum) / (rows - 1)));
    const usedHeight = sum + (rows - 1) * gap;
    const narrowest = Math.min(...layers.map((layerIds) => widthOf(layerIds.length)));
    const fits =
      usedHeight <= innerHeight + 0.5 && (layers.length === 0 || narrowest >= MIN_NODE_WIDTH);
    let y = opts.pad + Math.max(0, (innerHeight - usedHeight) / 2);
    const out = new Map<string, PlacedNode>();
    layers.forEach((layerIds, layer) => {
      const count = layerIds.length;
      const width = widthOf(count);
      const height = layerHeights[layer] ?? baseHeight;
      const rowWidth = count * width + (count - 1) * opts.columnGap;
      const left = opts.pad + reserve + (usableWidth - rowWidth) / 2;
      layerIds.forEach((id, order) => {
        out.set(id, {
          id,
          label: labelOf(id),
          layer,
          order,
          x: left + order * (width + opts.columnGap),
          y,
          width,
          height,
          fontSize: fitNodeText(labelOf(id), width, baseHeight, opts).fontSize,
        });
      });
      y += height + gap;
    });
    return { placed: out, gap, fits };
  };

  const forwardPoints = (
    source: PlacedNode,
    target: PlacedNode,
  ): { p0: Point; p1: Point; p2: Point; p3: Point } => {
    const sx = source.x + source.width / 2;
    const sy = source.y + source.height;
    const tx = target.x + target.width / 2;
    const by = target.y - opts.arrowLength;
    const dy = (by - sy) / 2;
    return {
      p0: { x: sx, y: sy },
      p1: { x: sx, y: sy + dy },
      p2: { x: tx, y: by - dy },
      p3: { x: tx, y: by },
    };
  };

  const blockers = (
    placedMap: Map<string, PlacedNode>,
    edge: EdgeInput,
    source: PlacedNode,
    target: PlacedNode,
  ): PlacedNode[] =>
    [...placedMap.values()].filter(
      (node) =>
        node.id !== edge.from &&
        node.id !== edge.to &&
        node.layer > source.layer &&
        node.layer < target.layer,
    );

  /** Forward edges whose straight-ish curve would cross an intermediate node. */
  const needsRouting = (placedMap: Map<string, PlacedNode>): EdgeInput[] =>
    forward.filter((edge) => {
      const source = placedMap.get(edge.from);
      const target = placedMap.get(edge.to);
      if (!source || !target || target.layer - source.layer < 2) return false;
      const { p0, p1, p2, p3 } = forwardPoints(source, target);
      const curve = sampleCubic(p0, p1, p2, p3);
      return blockers(placedMap, edge, source, target).some((node) =>
        polylineHitsRect(curve, node, 14),
      );
    });

  // Reserving lanes narrows the nodes, which can create new collisions: iterate to a fixed point.
  let routedEdges: EdgeInput[] = needsRouting(place(0).placed);
  let result = place(Math.min(MAX_LANES, routedEdges.length));
  for (let pass = 0; pass < 3; pass += 1) {
    const again = new Set([...routedEdges, ...needsRouting(result.placed)]);
    if (again.size === routedEdges.length) break;
    routedEdges = forward.filter((edge) => again.has(edge));
    result = place(Math.min(MAX_LANES, routedEdges.length));
  }
  const { placed, gap, fits } = result;
  const routed = new Set<EdgeInput>(routedEdges);
  const laneOf = new Map<EdgeInput, number>();
  routedEdges.forEach((edge, i) => laneOf.set(edge, i % MAX_LANES));

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
      const baseX = tx + opts.arrowLength;
      placedEdges.push({
        ...label,
        from: edge.from,
        to: edge.to,
        kind: 'back',
        d: `M ${sx} ${sy} L ${railX} ${sy} L ${railX} ${ty} L ${baseX} ${ty}`,
        polyline: [
          { x: sx, y: sy },
          { x: railX, y: sy },
          { x: railX, y: ty },
          { x: baseX, y: ty },
        ],
        tip: { x: tx, y: ty },
        direction: 'left',
        mid: { x: railX, y: (sy + ty) / 2 },
      });
      continue;
    }
    const tx = target.x + target.width / 2;
    const ty = target.y;
    const by = ty - opts.arrowLength;
    const sx = source.x + source.width / 2;
    const sy = source.y + source.height;
    if (routed.has(edge)) {
      // Down into the gap below the source, left to the lane, down the lane, right above the target.
      const laneX = opts.pad + LANE_START + (laneOf.get(edge) ?? 0) * LANE_STEP;
      const outY = sy + gap / 2;
      const inY = ty - gap / 2;
      const pts: Point[] = [
        { x: sx, y: sy },
        { x: sx, y: outY },
        { x: laneX, y: outY },
        { x: laneX, y: inY },
        { x: tx, y: inY },
        { x: tx, y: by },
      ];
      placedEdges.push({
        ...label,
        from: edge.from,
        to: edge.to,
        kind: 'forward',
        routed: true,
        d: `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`,
        polyline: pts,
        tip: { x: tx, y: ty },
        direction: 'down',
        mid: { x: laneX + 16, y: inY },
        labelMode: 'run',
        labelMaxWidth: Math.max(120, Math.min(360, tx - 24 - (laneX + 16))),
      });
      continue;
    }
    const { p0, p1, p2, p3 } = forwardPoints(source, target);
    placedEdges.push({
      ...label,
      from: edge.from,
      to: edge.to,
      kind: 'forward',
      d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`,
      polyline: sampleCubic(p0, p1, p2, p3),
      tip: { x: tx, y: ty },
      direction: 'down',
      // Label sits next to the arrow end so sibling edges from one source never share an anchor.
      mid: { x: tx, y: sy + (by - sy) * 0.6 },
      labelMode: 'beside',
    });
  }

  // Sibling labels beside their arrows must not run into the next sibling's label: cap their width.
  const beside = placedEdges.filter((e) => e.labelMode === 'beside' && e.label !== undefined);
  for (const edge of beside) {
    const srcLayer = placed.get(edge.from)?.layer;
    const placeRight = labelSpace(edge.mid.x, box.width).placeRight;
    let nearest = Number.POSITIVE_INFINITY;
    for (const other of beside) {
      if (other === edge || placed.get(other.from)?.layer !== srcLayer) continue;
      const delta = placeRight ? other.mid.x - edge.mid.x : edge.mid.x - other.mid.x;
      if (delta > 0) nearest = Math.min(nearest, delta);
    }
    if (Number.isFinite(nearest)) edge.labelMaxWidth = Math.max(70, nearest - 16 - 8);
  }

  return {
    nodes: nodes.map((node) => placed.get(node.id)).filter((n): n is PlacedNode => n !== undefined),
    edges: placedEdges,
    layerCount,
    nodeHeight: baseHeight,
    fits,
  };
};
