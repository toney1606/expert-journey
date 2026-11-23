/** Pure path-traversal timeline and geometry for the Diagram scene (token travelling along edges). */
import type { PlacedEdge, Point } from './layout';

/** Shortest and longest time (frames) of one hop, so very short or long scenes stay readable. */
export const MIN_HOP_FRAMES = 12;
export const MAX_HOP_FRAMES = 60;
/** Share of a hop spent resting on the node before moving on. */
const DWELL_SHARE = 0.3;
export const DEFAULT_STEP_LABEL = 'Bước {k}/{n}';

export type TraversalPlan = {
  /** Frame at which the first node lights up. */
  start: number;
  hops: number;
  /** Frames per hop (dwell + travel). */
  hopFrames: number;
  dwell: number;
};

/**
 * Plans the traversal: it starts at `startFrame` (clamped so every hop fits) and its pace scales with the
 * time left in the scene, between MIN_HOP_FRAMES and MAX_HOP_FRAMES per hop.
 */
export const planTraversal = (
  durationInFrames: number,
  startFrame: number,
  nodeCount: number,
): TraversalPlan => {
  const hops = Math.max(0, nodeCount - 1);
  const tail = Math.max(10, Math.round(durationInFrames * 0.08));
  const latest = Math.max(0, durationInFrames - tail - hops * MIN_HOP_FRAMES);
  const start = Math.round(Math.min(latest, Math.max(0, startFrame)));
  const available = Math.max(0, durationInFrames - tail - start);
  const hopFrames =
    hops === 0
      ? 0
      : Math.round(Math.min(MAX_HOP_FRAMES, Math.max(MIN_HOP_FRAMES, available / hops)));
  return { start, hops, hopFrames, dwell: Math.round(hopFrames * DWELL_SHARE) };
};

/** Cubic ease in-out on 0..1. */
export const easeInOut = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/** Frame at which path step `k` (0-based) is reached and lights up. */
export const stepLitAt = (plan: TraversalPlan, k: number): number =>
  plan.start + Math.max(0, k) * plan.hopFrames;

/** Eased progress (0..1) of hop `i` (from path step i to i+1) at `frame`. */
export const hopProgress = (plan: TraversalPlan, i: number, frame: number): number => {
  const from = plan.start + i * plan.hopFrames + plan.dwell;
  const to = plan.start + (i + 1) * plan.hopFrames;
  if (to <= from) return frame >= to ? 1 : 0;
  return easeInOut((frame - from) / (to - from));
};

export type TraversalState = {
  /** False before the first node lights up. */
  active: boolean;
  /** Hop the token is on (or last finished); 0 when there are no hops. */
  hop: number;
  /** Eased progress of that hop. */
  progress: number;
  /** Number of path steps reached so far (0..nodeCount): the `k` of "Bước k/n". */
  reached: number;
};

export const traversalAt = (plan: TraversalPlan, frame: number): TraversalState => {
  if (frame < plan.start) return { active: false, hop: 0, progress: 0, reached: 0 };
  if (plan.hops === 0) return { active: true, hop: 0, progress: 0, reached: 1 };
  const raw = Math.floor((frame - plan.start) / Math.max(1, plan.hopFrames));
  const hop = Math.min(plan.hops - 1, Math.max(0, raw));
  const progress = hopProgress(plan, hop, frame);
  const reached = Math.min(plan.hops + 1, hop + 1 + (progress >= 1 || raw >= plan.hops ? 1 : 0));
  return { active: true, hop, progress, reached };
};

/** Replaces {k} and {n} in a step label template. */
export const formatStepLabel = (template: string | undefined, k: number, n: number): string =>
  (template ?? DEFAULT_STEP_LABEL).replaceAll('{k}', String(k)).replaceAll('{n}', String(n));

/**
 * Points the token follows from node `a` to node `b`: the edge polyline plus its arrow tip, reversed when
 * the edge is drawn the other way round. Undefined when the nodes are not directly connected.
 */
export const hopTrack = (
  edges: readonly PlacedEdge[],
  a: string,
  b: string,
): Point[] | undefined => {
  const forward = edges.find((edge) => edge.from === a && edge.to === b);
  if (forward) return [...forward.polyline, forward.tip];
  const backward = edges.find((edge) => edge.from === b && edge.to === a);
  return backward ? [backward.tip, ...[...backward.polyline].reverse()] : undefined;
};

/** Point at fraction `t` (0..1) of the polyline's arc length. */
export const pointAlong = (points: readonly Point[], t: number): Point => {
  const first = points[0];
  if (!first) return { x: 0, y: 0 };
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const len = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
    lengths.push(len);
    total += len;
  }
  if (total === 0) return first;
  let remaining = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < lengths.length; i += 1) {
    const len = lengths[i] ?? 0;
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) break;
    if (remaining <= len || i === lengths.length - 1) {
      const f = len === 0 ? 0 : Math.min(1, remaining / len);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    remaining -= len;
  }
  return points[points.length - 1] ?? first;
};

/** The part of the polyline up to fraction `t`, as SVG path data (empty when nothing is covered). */
export const partialPath = (points: readonly Point[], t: number): string => {
  const first = points[0];
  if (!first || t <= 0) return '';
  const total = points.reduce((sum, p, i) => {
    const prev = points[i - 1];
    return prev ? sum + Math.hypot(p.x - prev.x, p.y - prev.y) : sum;
  }, 0);
  if (total === 0) return '';
  const target = Math.min(1, t) * total;
  const out: Point[] = [first];
  let walked = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + len >= target) {
      const f = len === 0 ? 0 : (target - walked) / len;
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      break;
    }
    out.push(b);
    walked += len;
  }
  return `M ${out.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
};
