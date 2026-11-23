/** Pure reveal timeline for the Diagram scene: layer-by-layer by default, on narration cues when given. */
import type { DiagramLayout } from './layout';

export const FIRST_DELAY = 4;
export const SPRING_FRAMES = 8;
/** Share of the scene used to reveal the diagram; the rest is a hold so viewers can read it. */
export const REVEAL_SHARE = 0.8;
/** Smaller share when a path traversal follows the reveal. */
export const REVEAL_SHARE_WITH_PATH = 0.5;

export const edgeKey = (edge: { from: string; to: string }): string => `${edge.from}->${edge.to}`;

export type Timeline = {
  nodeStart: Map<string, number>;
  /** Keyed by `edgeKey`. */
  edgeStart: Map<string, number>;
  edgeFrames: number;
};

/** Cue frames already resolved from narration phrases; absent entries use the layer timing. */
export type RevealCues = {
  nodes: ReadonlyMap<string, number>;
  edges: ReadonlyMap<string, number>;
};

export const NO_CUES: RevealCues = { nodes: new Map(), edges: new Map() };

const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/**
 * Spreads the reveal over the scene length: layer by layer, edges right after their source.
 * Cued nodes/edges appear at their cue (clamped into the scene). Order stays sensible: an uncued node
 * never appears before the nodes pointing at it, and an edge never starts before its source exists
 * (an uncued edge into a cued node is drawn so that it arrives as the node appears).
 */
export const buildTimeline = (
  layout: DiagramLayout,
  durationInFrames: number,
  cues: RevealCues = NO_CUES,
  revealShare = REVEAL_SHARE,
): Timeline => {
  const revealEnd = Math.max(FIRST_DELAY + 1, durationInFrames * revealShare);
  const layerStep = Math.max(1, (revealEnd - FIRST_DELAY) / Math.max(1, layout.layerCount));
  const edgeFrames = Math.max(6, layerStep * 0.55);
  const lastNodeStart = Math.max(0, durationInFrames - SPRING_FRAMES - 2);
  const lastEdgeStart = Math.max(0, durationInFrames - edgeFrames - 2);
  const hasNodeCues = cues.nodes.size > 0;

  const nodeStart = new Map<string, number>();
  const ordered = [...layout.nodes].sort((a, b) => a.layer - b.layer || a.order - b.order);
  for (const node of ordered) {
    const peers = layout.nodes.filter((other) => other.layer === node.layer).length;
    const stagger = Math.min(6, (layerStep * 0.3) / peers);
    let start = FIRST_DELAY + node.layer * layerStep + node.order * stagger;
    const cue = cues.nodes.get(node.id);
    if (cue !== undefined) {
      start = finiteOr(cue, start);
    } else if (hasNodeCues) {
      for (const edge of layout.edges) {
        if (edge.to !== node.id || edge.kind === 'back') continue;
        const parent = nodeStart.get(edge.from);
        if (parent !== undefined) start = Math.max(start, parent + SPRING_FRAMES);
      }
    }
    nodeStart.set(node.id, Math.min(lastNodeStart, Math.max(0, start)));
  }

  const edgeStart = new Map<string, number>();
  for (const edge of layout.edges) {
    const key = edgeKey(edge);
    const sourceStart = nodeStart.get(edge.from) ?? 0;
    const floor = sourceStart + 3;
    const cue = cues.edges.get(key);
    let start = sourceStart + SPRING_FRAMES;
    if (cue !== undefined) {
      start = Math.max(floor, finiteOr(cue, start));
    } else if (cues.nodes.has(edge.to)) {
      start = Math.max(floor, (nodeStart.get(edge.to) ?? start) - edgeFrames);
    }
    edgeStart.set(key, Math.min(Math.max(lastEdgeStart, floor), Math.max(0, start)));
  }
  return { nodeStart, edgeStart, edgeFrames };
};
