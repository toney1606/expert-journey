import { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fontFamily, lineHeight, safeZone, spacing } from '../../design/tokens';
import { springs } from '../../design/springs';
import { safeBox } from '../../lib/safe-zone';
import { layoutDiagram } from './layout';
import type { DiagramLayout, PlacedEdge, PlacedNode } from './layout';
import type { DiagramScene } from './schema';

const TITLE_HEIGHT = 210;
const NODE_FONT = 40;
const EDGE_FONT = 32;
const STROKE = 5;
const ARROW_HALF = 12;
const ARROW_LENGTH = 22;
const FIRST_DELAY = 4;
/** Share of the scene used to reveal the diagram; the rest is a hold so viewers can read it. */
const REVEAL_SHARE = 0.8;
const SPRING_FRAMES = 8;

type Timeline = {
  nodeStart: Map<string, number>;
  edgeStart: Map<PlacedEdge, number>;
  edgeFrames: number;
};

/** Spreads the reveal over the scene length: layer by layer, edges right after their source. */
const buildTimeline = (layout: DiagramLayout, durationInFrames: number): Timeline => {
  const revealEnd = Math.max(FIRST_DELAY + 1, durationInFrames * REVEAL_SHARE);
  const layerStep = Math.max(1, (revealEnd - FIRST_DELAY) / Math.max(1, layout.layerCount));
  const nodeStart = new Map<string, number>();
  for (const node of layout.nodes) {
    const peers = layout.nodes.filter((other) => other.layer === node.layer).length;
    const stagger = Math.min(6, (layerStep * 0.3) / peers);
    nodeStart.set(node.id, FIRST_DELAY + node.layer * layerStep + node.order * stagger);
  }
  const edgeFrames = Math.max(6, layerStep * 0.55);
  const edgeStart = new Map<PlacedEdge, number>();
  for (const edge of layout.edges) {
    edgeStart.set(edge, (nodeStart.get(edge.from) ?? 0) + SPRING_FRAMES);
  }
  return { nodeStart, edgeStart, edgeFrames };
};

const arrowPoints = (edge: PlacedEdge): string => {
  const { x, y } = edge.tip;
  return edge.direction === 'down'
    ? `${x},${y} ${x - ARROW_HALF},${y - ARROW_LENGTH} ${x + ARROW_HALF},${y - ARROW_LENGTH}`
    : `${x},${y} ${x + ARROW_LENGTH},${y - ARROW_HALF} ${x + ARROW_LENGTH},${y + ARROW_HALF}`;
};

const NodeCard: React.FC<{ node: PlacedNode; start: number }> = ({ node, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - start, fps, config: springs.snappy });
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
        background: colors.card,
        border: `4px solid ${colors.diagram}`,
        borderRadius: 28,
        color: colors.diagram,
        fontFamily: fontFamily.title,
        fontWeight: 700,
        fontSize: NODE_FONT,
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
  // Labels go outward from the centre line: left of left-hand edges, right of the rest.
  const placeRight = edge.kind === 'forward' && edge.mid.x >= boxWidth / 2 - 1;
  const side = 16;
  const space = placeRight ? boxWidth - edge.mid.x - side : edge.mid.x - side;
  const horizontal: React.CSSProperties = placeRight
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
        position: 'absolute',
        ...horizontal,
        top: edge.mid.y,
        transform: 'translateY(-50%)',
        maxWidth: Math.min(360, space),
        padding: `0 ${spacing.xs}px`,
        background: colors.bg,
        borderRadius: 8,
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
};

export const Diagram: React.FC<{ scene: DiagramScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const { title, nodes, edges } = scene.props;

  const box = safeBox(safeZone, width, height);
  const diagramBox = { width: box.width, height: box.height - TITLE_HEIGHT };

  const layout = useMemo(
    () => layoutDiagram(nodes, edges, diagramBox),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges, diagramBox.width, diagramBox.height],
  );
  const timeline = useMemo(
    () => buildTimeline(layout, durationInFrames),
    [layout, durationInFrames],
  );

  const titleIn = spring({ frame, fps, config: springs.snappy });

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
          fontSize: 64,
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
          {title}
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
            const start = timeline.edgeStart.get(edge) ?? 0;
            const drawn = interpolate(frame, [start, start + timeline.edgeFrames], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <g key={`${edge.from}->${edge.to}`} opacity={drawn > 0 ? 1 : 0}>
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
                <polygon
                  points={arrowPoints(edge)}
                  fill={colors.diagram}
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
          <NodeCard key={node.id} node={node} start={timeline.nodeStart.get(node.id) ?? 0} />
        ))}
        {layout.edges.map((edge) => {
          const start = (timeline.edgeStart.get(edge) ?? 0) + timeline.edgeFrames * 0.5;
          const opacity = interpolate(frame, [start, start + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <EdgeLabel
              key={`${edge.from}->${edge.to}`}
              edge={edge}
              boxWidth={diagramBox.width}
              opacity={opacity}
            />
          );
        })}
      </div>
    </div>
  );
};
