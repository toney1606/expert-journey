import { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RichText } from '../../components/RichText';
import { useSceneWords, useSpokenFrame } from '../../components/SceneTiming';
import { colors, fontFamily, lineHeight, spacing } from '../../design/tokens';
import { springs } from '../../design/springs';
import { findPhraseTime } from '../../lib/spoken';
import {
  DIAGRAM_BOX,
  DIAGRAM_PATH_BOX,
  DIAGRAM_TITLE_HEIGHT,
  STEP_BADGE_HEIGHT as DIAGRAM_BADGE_HEIGHT,
  LABEL_INSET,
  labelSpace,
  layoutDiagram,
} from './layout';
import type { DiagramLayout, PlacedEdge, PlacedNode } from './layout';
import { diagramPalette, mixHex, withAlpha } from './palette';
import {
  REVEAL_SHARE,
  REVEAL_SHARE_WITH_PATH,
  SPRING_FRAMES,
  buildTimeline,
  edgeKey,
} from './reveal';
import type { RevealCues } from './reveal';
import {
  formatStepLabel,
  hopProgress,
  hopTrack,
  partialPath,
  planTraversal,
  pointAlong,
  stepLitAt,
  traversalAt,
} from './traversal';
import type { TraversalPlan } from './traversal';
import type { DiagramScene } from './schema';

const TITLE_HEIGHT = DIAGRAM_TITLE_HEIGHT;
const EDGE_FONT = 36;
const STROKE = 6;
const ARROW_HALF = 12;
const ARROW_LENGTH = 22;
const BADGE_HEIGHT = DIAGRAM_BADGE_HEIGHT;
const TOKEN_RADIUS = 15;
/** Frames a node takes to fade into its lit state. */
const LIGHT_FRAMES = 8;
/** Seconds per pulse of the emphasis halo. */
const PULSE_SECONDS = 1.6;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const arrowPoints = (edge: PlacedEdge): string => {
  const { x, y } = edge.tip;
  return edge.direction === 'down'
    ? `${x},${y} ${x - ARROW_HALF},${y - ARROW_LENGTH} ${x + ARROW_HALF},${y - ARROW_LENGTH}`
    : `${x},${y} ${x + ARROW_LENGTH},${y - ARROW_HALF} ${x + ARROW_LENGTH},${y + ARROW_HALF}`;
};

type NodeCardProps = {
  node: PlacedNode;
  start: number;
  /** 0..1: how lit the node is (visited by the token). */
  lit: number;
  /** 0..1: how strongly it is the node the token is on now. */
  current: number;
  emphasis: boolean;
};

const NodeCard: React.FC<NodeCardProps> = ({ node, start, lit, current, emphasis }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - start, fps, config: springs.snappy });
  const shadows: string[] = [];
  if (lit > 0) {
    shadows.push(
      `0 0 ${10 + 18 * current}px ${2 * current}px ${withAlpha(diagramPalette.lit, 0.3 + 0.4 * current)}`,
    );
  }
  if (emphasis && progress > 0.6) {
    const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * (frame - start)) / (fps * PULSE_SECONDS));
    shadows.push(
      `0 0 ${28 + 22 * pulse}px ${4 + 6 * pulse}px ${withAlpha(diagramPalette.emphasis, 0.3 + 0.3 * pulse)}`,
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        boxSizing: 'border-box',
        padding: `${spacing.xs}px ${spacing.sm}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: mixHex(diagramPalette.card, diagramPalette.lit, 0.1 * lit),
        border: `4px solid ${mixHex(diagramPalette.base, diagramPalette.lit, lit)}`,
        borderRadius: 30,
        color: mixHex(diagramPalette.base, diagramPalette.lit, 0.9 * lit),
        boxShadow: shadows.length > 0 ? shadows.join(', ') : undefined,
        fontFamily: fontFamily.title,
        fontWeight: 700,
        fontSize: node.fontSize,
        lineHeight: lineHeight.title,
        overflowWrap: 'anywhere',
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.85, 1])})`,
      }}
    >
      {node.label}
    </div>
  );
};

const EdgeLabel: React.FC<{ edge: PlacedEdge; boxWidth: number; opacity: number }> = ({
  edge,
  boxWidth,
  opacity,
}) => {
  if (edge.label === undefined) return null;
  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    boxSizing: 'border-box',
    padding: `0 ${spacing.xs}px`,
    background: colors.bg,
    borderRadius: 8,
    color: colors.textMuted,
    fontFamily: fontFamily.title,
    fontWeight: 500,
    fontSize: EDGE_FONT,
    lineHeight: lineHeight.title,
    overflowWrap: 'anywhere',
    opacity,
  };
  if (edge.labelMode === 'run') {
    // Sits on the horizontal run of a routed edge, starting just right of its lane.
    return (
      <div
        style={{
          ...labelStyle,
          left: Math.max(LABEL_INSET, edge.mid.x),
          top: edge.mid.y,
          transform: 'translateY(-50%)',
          maxWidth: edge.labelMaxWidth ?? 360,
        }}
      >
        {edge.label}
      </div>
    );
  }
  // Labels go to the side with more room and wrap inside it; they keep LABEL_INSET from the box edge.
  const side = 16;
  const space = labelSpace(edge.mid.x, boxWidth, side);
  const horizontal: React.CSSProperties = space.placeRight
    ? { left: edge.mid.x + side }
    : { right: boxWidth - edge.mid.x + side };
  if (edge.kind === 'back') {
    // Rotated along the rail, between the cards and the line, so it never covers a card.
    return (
      <div
        style={{
          position: 'absolute',
          left: edge.mid.x - 28,
          top: edge.mid.y,
          transform: 'translate(-50%, -50%) rotate(-90deg)',
          whiteSpace: 'nowrap',
          maxWidth: 360,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: colors.textMuted,
          fontFamily: fontFamily.title,
          fontWeight: 500,
          fontSize: EDGE_FONT,
          lineHeight: lineHeight.title,
          opacity,
        }}
      >
        {edge.label}
      </div>
    );
  }
  return (
    <div
      style={{
        ...labelStyle,
        ...horizontal,
        top: edge.mid.y,
        transform: 'translateY(-50%)',
        maxWidth: Math.min(space.maxWidth, edge.labelMaxWidth ?? space.maxWidth),
        textAlign: space.placeRight ? 'left' : 'right',
      }}
    >
      {edge.label}
    </div>
  );
};

/** Resolves `at` phrases of nodes and edges to scene frames (only those that are found). */
const useRevealCues = (
  nodes: DiagramScene['props']['nodes'],
  edges: DiagramScene['props']['edges'],
): RevealCues => {
  const words = useSceneWords();
  const { fps } = useVideoConfig();
  return useMemo(() => {
    const nodeCues = new Map<string, number>();
    const edgeCues = new Map<string, number>();
    const find = (phrase: string | undefined): number | undefined => {
      if (!phrase) return undefined;
      const hit = findPhraseTime(words, phrase);
      return hit ? Math.round(hit.start * fps) : undefined;
    };
    for (const node of nodes) {
      const cue = find(node.at);
      if (cue !== undefined) nodeCues.set(node.id, cue);
    }
    for (const edge of edges) {
      const cue = find(edge.at);
      if (cue !== undefined) edgeCues.set(edgeKey(edge), cue);
    }
    return { nodes: nodeCues, edges: edgeCues };
  }, [nodes, edges, words, fps]);
};

const StepBadge: React.FC<{ text: string; opacity: number; top: number }> = ({
  text,
  opacity,
  top,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top,
      height: BADGE_HEIGHT,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
    }}
  >
    <div
      style={{
        boxSizing: 'border-box',
        height: BADGE_HEIGHT - 6,
        padding: `0 ${spacing.md}px`,
        display: 'flex',
        alignItems: 'center',
        background: withAlpha(diagramPalette.lit, 0.14),
        border: `3px solid ${diagramPalette.lit}`,
        borderRadius: 999,
        color: diagramPalette.lit,
        fontFamily: fontFamily.title,
        fontWeight: 700,
        fontSize: 34,
        lineHeight: lineHeight.title,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  </div>
);

/** Glowing token: soft rings (cheap opacity layers instead of a blur) plus a short fading trail. */
const Token: React.FC<{
  track: readonly { x: number; y: number }[];
  progress: number;
  width: number;
  height: number;
}> = ({ track, progress, width, height }) => {
  const trail = [0.09, 0.06, 0.03].map((back) => pointAlong(track, Math.max(0, progress - back)));
  const head = pointAlong(track, progress);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {trail.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={TOKEN_RADIUS - 2 - i * 2}
          fill={diagramPalette.lit}
          opacity={0.4 - i * 0.12}
        />
      ))}
      <circle
        cx={head.x}
        cy={head.y}
        r={TOKEN_RADIUS + 16}
        fill={diagramPalette.lit}
        opacity={0.14}
      />
      <circle
        cx={head.x}
        cy={head.y}
        r={TOKEN_RADIUS + 8}
        fill={diagramPalette.lit}
        opacity={0.28}
      />
      <circle
        cx={head.x}
        cy={head.y}
        r={TOKEN_RADIUS}
        fill={diagramPalette.lit}
        stroke={colors.bg}
        strokeWidth={3}
      />
    </svg>
  );
};

export const Diagram: React.FC<{ scene: DiagramScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { title, nodes, edges, path, pathAt, stepLabel, emphasis } = scene.props;
  const hasPath = path !== undefined && path.length > 0;

  const diagramBox = hasPath ? DIAGRAM_PATH_BOX : DIAGRAM_BOX;

  const layout: DiagramLayout = useMemo(
    () => layoutDiagram(nodes, edges, diagramBox),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges, diagramBox.width, diagramBox.height],
  );
  const cues = useRevealCues(nodes, edges);
  const timeline = useMemo(
    () =>
      buildTimeline(
        layout,
        durationInFrames,
        cues,
        hasPath ? REVEAL_SHARE_WITH_PATH : REVEAL_SHARE,
      ),
    [layout, durationInFrames, cues, hasPath],
  );

  // Traversal: starts at the spoken cue, or shortly after the reveal.
  const pathIds = useMemo(() => path ?? [], [path]);
  const pathStart = useSpokenFrame(
    pathAt,
    Math.round(durationInFrames * (REVEAL_SHARE_WITH_PATH + 0.05)),
  );
  const plan: TraversalPlan = useMemo(
    () => planTraversal(durationInFrames, pathStart, pathIds.length),
    [durationInFrames, pathStart, pathIds.length],
  );
  const state = traversalAt(plan, frame);
  const hopTracks = useMemo(
    () => pathIds.slice(1).map((id, i) => hopTrack(layout.edges, pathIds[i] ?? '', id)),
    [layout, pathIds],
  );

  // Lit amount per node: earliest visit; "current" is the node the token rests on.
  const litAmount = new Map<string, number>();
  pathIds.forEach((id, k) => {
    if (litAmount.has(id)) return;
    const at = stepLitAt(plan, k);
    litAmount.set(id, clamp01((frame - at) / LIGHT_FRAMES));
  });
  const currentId = state.reached > 0 ? pathIds[state.reached - 1] : undefined;
  const currentAmount = currentId === undefined ? 0 : (litAmount.get(currentId) ?? 0);

  // Lit edges: how much of each traversed edge is covered, and which were walked in their own direction.
  const litEdges = new Map<
    string,
    { amount: number; forward: boolean; track: readonly { x: number; y: number }[] }
  >();
  hopTracks.forEach((track, i) => {
    const a = pathIds[i];
    const b = pathIds[i + 1];
    if (!track || a === undefined || b === undefined) return;
    const amount = hopProgress(plan, i, frame);
    if (amount <= 0) return;
    const isForward = layout.edges.some((edge) => edge.from === a && edge.to === b);
    const key = isForward ? `${a}->${b}` : `${b}->${a}`;
    const prev = litEdges.get(key);
    if (!prev || amount > prev.amount) litEdges.set(key, { amount, forward: isForward, track });
  });

  const titleIn = spring({ frame, fps, config: springs.snappy });
  const currentTrack =
    state.active && state.hop < hopTracks.length ? hopTracks[state.hop] : undefined;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          height: TITLE_HEIGHT,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          fontFamily: fontFamily.title,
          fontWeight: 800,
          fontSize: 54,
          lineHeight: lineHeight.title,
          color: colors.text,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [32, 0])}px)`,
        }}
      >
        <span
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            paddingBottom: 4,
          }}
        >
          <RichText text={title} />
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: TITLE_HEIGHT,
          width: diagramBox.width,
          height: diagramBox.height,
        }}
      >
        <svg
          width={diagramBox.width}
          height={diagramBox.height}
          viewBox={`0 0 ${diagramBox.width} ${diagramBox.height}`}
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden' }}
        >
          {layout.edges.map((edge) => {
            const key = edgeKey(edge);
            const start = timeline.edgeStart.get(key) ?? 0;
            const drawn = interpolate(frame, [start, start + timeline.edgeFrames], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const walked = litEdges.get(key);
            const arrowLit = walked !== undefined && walked.forward && walked.amount >= 0.98;
            const covered = walked ? partialPath(walked.track, walked.amount) : '';
            return (
              <g key={key} opacity={drawn > 0 ? 1 : 0}>
                <path
                  d={edge.d}
                  fill="none"
                  stroke={colors.diagram}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - drawn}
                />
                {covered !== '' ? (
                  <>
                    <path
                      d={covered}
                      fill="none"
                      stroke={diagramPalette.lit}
                      strokeWidth={STROKE + 12}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.18}
                    />
                    <path
                      d={covered}
                      fill="none"
                      stroke={diagramPalette.lit}
                      strokeWidth={STROKE + 1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : null}
                <polygon
                  points={arrowPoints(edge)}
                  fill={arrowLit ? diagramPalette.lit : colors.diagram}
                  opacity={interpolate(drawn, [0.85, 1], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  })}
                />
              </g>
            );
          })}
        </svg>
        {layout.nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            start={timeline.nodeStart.get(node.id) ?? 0}
            lit={litAmount.get(node.id) ?? 0}
            current={node.id === currentId ? currentAmount : 0}
            emphasis={node.id === emphasis}
          />
        ))}
        {layout.edges.map((edge) => {
          const start = (timeline.edgeStart.get(edgeKey(edge)) ?? 0) + timeline.edgeFrames * 0.5;
          const opacity = interpolate(frame, [start, start + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <EdgeLabel
              key={edgeKey(edge)}
              edge={edge}
              boxWidth={diagramBox.width}
              opacity={opacity}
            />
          );
        })}
        {currentTrack ? (
          <Token
            track={currentTrack}
            progress={state.progress}
            width={diagramBox.width}
            height={diagramBox.height}
          />
        ) : null}
      </div>
      {hasPath ? (
        <StepBadge
          text={formatStepLabel(stepLabel, Math.max(1, state.reached), pathIds.length)}
          opacity={clamp01((frame - plan.start) / SPRING_FRAMES)}
          top={TITLE_HEIGHT + diagramBox.height}
        />
      ) : null}
    </div>
  );
};
