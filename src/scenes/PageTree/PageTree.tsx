import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SpringConfig } from 'remotion';
import { useSceneWords } from '../../components/SceneTiming';
import { DigitSlots, GlassCard, Kicker, useDrift } from '../../components/ui/ui';
import { colors, fontFamily } from '../../design/tokens';
import { springs } from '../../design/springs';
import { spokenFrames } from '../../lib/cues';
import { formatNumber } from '../Stat/format';
import {
  PAGE_TREE_BOX,
  PATH_LEAF,
  PATH_MID,
  TREE_BLEED,
  TREE_WIDTH,
  pageRowCount,
  pageRowShare,
  pageTreeLayout,
  splitReads,
  treeGeometry,
} from './layout';
import type { TreeNode } from './layout';
import type { PageTreeScene } from './schema';
import { pageTreeFrames, pageTreeTimeline } from './timeline';

const title = fontFamily.title;

const useEnter = (start: number, config: Partial<SpringConfig> = springs.snappy): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config });
};

const PageCard: React.FC<{ height: number; litAt: number; leaveAt: number }> = ({
  height,
  litAt,
  leaveAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: springs.bouncy });
  const leave = spring({ frame: frame - leaveAt, fps, config: springs.snappy });
  const count = pageRowCount(height);
  const cardW = 640;
  const pulse = Math.max(0, 1 - Math.abs(frame - litAt) / 20);
  return (
    <div
      style={{
        position: 'absolute',
        left: (TREE_WIDTH - cardW) / 2,
        top: 0,
        width: cardW,
        height,
        boxSizing: 'border-box',
        padding: '26px 34px',
        background: 'linear-gradient(160deg, rgba(49,50,68,0.95), rgba(30,30,46,0.9))',
        border: `4px solid ${colors.diagram}`,
        borderRadius: 36,
        boxShadow: `0 0 ${30 + 40 * pulse}px ${colors.diagram}77`,
        opacity: Math.min(1, enter) * (1 - leave),
        transform: `translateY(${interpolate(enter, [0, 1], [50, 0])}px) scale(${1 - 0.6 * leave})`,
        transformOrigin: 'top center',
      }}
    >
      {Array.from({ length: count }, (_, i) => {
        const lit = spring({ frame: frame - litAt - i * 1.2, fps, config: springs.snappy });
        const rowIn = spring({ frame: frame - 8 - i * 1.5, fps, config: springs.snappy });
        return (
          <div
            key={i}
            style={{
              height: 16,
              marginBottom: 14,
              width: `${pageRowShare(i) * 100 * rowIn}%`,
              borderRadius: 8,
              background: colors.diagram,
              opacity: 0.3 + 0.7 * lit,
            }}
          />
        );
      })}
    </div>
  );
};

const Node: React.FC<{ node: TreeNode; appear: number; lit: number; count?: number }> = ({
  node,
  appear,
  lit,
  count,
}) => {
  const s = interpolate(appear, [0, 1], [0.3, 1]) * (1 + 0.3 * Math.min(1.4, lit));
  const on = lit > 0.35;
  return (
    <g
      opacity={Math.min(1, appear)}
      transform={`translate(${node.x} ${node.y}) scale(${s}) translate(${-node.x} ${-node.y})`}
    >
      {lit > 0 ? (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.r + 22}
          fill={colors.correct}
          opacity={0.28 * Math.min(1, lit)}
        />
      ) : null}
      <circle
        cx={node.x}
        cy={node.y}
        r={node.r}
        fill={on ? colors.correct : colors.card}
        stroke={on ? colors.correct : colors.diagram}
        strokeWidth={6}
      />
      {count !== undefined && on ? (
        <text
          x={node.x}
          y={node.y + 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={title}
          fontWeight={800}
          fontSize={node.r * 1.2}
          fill={colors.bg}
        >
          {count}
        </text>
      ) : null}
    </g>
  );
};

export const PageTree: React.FC<{ scene: PageTreeScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const words = useSceneWords();
  const drift = useDrift(0.04);
  const p = scene.props;

  const layout = pageTreeLayout(p);
  const timeline = pageTreeTimeline(durationInFrames);
  const [pageF, fanoutF, levelsF, totalF, popF, readsF] = pageTreeFrames(
    spokenFrames(
      words,
      [p.pageAt, p.fanoutAt, p.levelsAt, p.totalAt, p.populationAt, p.readsAt],
      fps,
    ),
    durationInFrames,
  ) as [number, number, number, number, number, number];

  const popGrow = Math.min(1, Math.max(0, useEnter(popF)));
  // Before the population card arrives the tree takes its room, so the frame never has a dead band.
  const H = Math.round(layout.treeHeight + (layout.cardHeight + layout.gap) * (1 - popGrow));
  const cardH = Math.round(layout.cardHeight * popGrow);
  const geo = treeGeometry(TREE_WIDTH, H);
  const fanoutLabel = `×${formatNumber(p.fanout)}`;

  const pageLabelIn = useEnter(pageF);
  const treeIn = useEnter(fanoutF, springs.bouncy);
  const leavesIn = useEnter(levelsF, springs.bouncy);
  const totalIn = useEnter(totalF, springs.bouncy);
  const popIn = useEnter(popF);
  const readsIn = useEnter(readsF, springs.bouncy);

  const countSpring = spring({
    frame: frame - totalF - 4,
    fps,
    durationInFrames: timeline.countFrames,
    config: springs.soft,
  });
  const totalShown = formatNumber(p.total * countSpring, 0);
  const totalText = formatNumber(p.total, 0);
  const landed = totalF + 4 + timeline.countFrames;
  const glow = frame >= landed ? Math.max(0.25, 1 - (frame - landed) / 40) : 0;
  const landPop = frame >= landed ? 1 + 0.08 * Math.max(0, 1 - (frame - landed) / 10) : 1;

  // Glowing path: root (1), level 2 (2), leaf (3).
  const step = timeline.pathStep;
  const pathRoot = useEnter(readsF, springs.bouncy);
  const pathMid = useEnter(readsF + step, springs.bouncy);
  const pathLeaf = useEnter(readsF + 2 * step, springs.bouncy);
  const edge1 = spring({
    frame: frame - readsF - 2,
    fps,
    durationInFrames: step,
    config: springs.soft,
  });
  const edge2 = spring({
    frame: frame - readsF - step - 2,
    fps,
    durationInFrames: step,
    config: springs.soft,
  });
  const strike = spring({
    frame: frame - readsF - 2 * step - 6,
    fps,
    durationInFrames: 14,
    config: springs.soft,
  });
  const heroGlow = frame >= readsF + 2 * step ? 0.6 + 0.4 * Math.sin((frame - readsF) / 6) : 0.5;

  const mid = geo.mids[PATH_MID];
  const leaf = geo.leaves[PATH_LEAF];
  const mid2 = geo.mids[2];
  const mid1 = geo.mids[1];
  const reads = splitReads(p.readsLabel);

  const pill = (cx: number, cy: number, appear: number) => (
    <div
      style={{
        position: 'absolute',
        left: cx - 111,
        top: cy - 48,
        width: 222,
        height: 96,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        background: colors.bg,
        border: `4px solid ${colors.accent}`,
        boxShadow: `0 0 28px ${colors.accent}66`,
        fontFamily: title,
        fontWeight: 800,
        fontSize: layout.levelLabelSize,
        lineHeight: 1.25,
        color: colors.accent,
        whiteSpace: 'nowrap',
        opacity: Math.min(1, appear),
        transform: `scale(${interpolate(appear, [0, 1], [0.5, 1])})`,
      }}
    >
      {fanoutLabel}
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Kicker label={p.kicker.label} step={p.kicker.step} total={p.kicker.total} />

      <div style={{ position: 'relative', width: PAGE_TREE_BOX.width, height: H }}>
        <div
          style={{
            position: 'absolute',
            left: -TREE_BLEED,
            top: 0,
            width: TREE_WIDTH,
            height: H,
            transform: `scale(${drift})`,
            transformOrigin: 'center center',
          }}
        >
          <PageCard height={H} litAt={pageF} leaveAt={fanoutF} />
          <svg
            width={TREE_WIDTH}
            height={H}
            viewBox={`0 0 ${TREE_WIDTH} ${H}`}
            style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
          >
            {geo.mids.map((m, i) => (
              <line
                key={`e1-${i}`}
                x1={geo.root.x}
                y1={geo.root.y}
                x2={m.x}
                y2={m.y}
                stroke={colors.diagram}
                strokeWidth={6}
                strokeLinecap="round"
                opacity={Math.min(1, treeIn) * 0.75}
              />
            ))}
            {geo.leaves.map((l, i) => {
              const parent = geo.mids[Math.floor(i / 3)];
              return parent ? (
                <line
                  key={`e2-${i}`}
                  x1={parent.x}
                  y1={parent.y}
                  x2={l.x}
                  y2={l.y}
                  stroke={colors.diagram}
                  strokeWidth={6}
                  strokeLinecap="round"
                  opacity={Math.min(1, leavesIn) * 0.75}
                />
              ) : null;
            })}
            {mid && leaf ? (
              <>
                <line
                  x1={geo.root.x}
                  y1={geo.root.y}
                  x2={geo.root.x + (mid.x - geo.root.x) * edge1}
                  y2={geo.root.y + (mid.y - geo.root.y) * edge1}
                  stroke={colors.correct}
                  strokeWidth={16}
                  strokeLinecap="round"
                />
                <line
                  x1={mid.x}
                  y1={mid.y}
                  x2={mid.x + (leaf.x - mid.x) * edge2}
                  y2={mid.y + (leaf.y - mid.y) * edge2}
                  stroke={colors.correct}
                  strokeWidth={16}
                  strokeLinecap="round"
                />
              </>
            ) : null}
            <Node node={geo.root} appear={treeIn} lit={frame >= readsF ? pathRoot : 0} count={1} />
            {geo.mids.map((m, i) => (
              <Node
                key={`m-${i}`}
                node={m}
                appear={treeIn}
                lit={i === PATH_MID && frame >= readsF + step ? pathMid : 0}
                count={i === PATH_MID ? 2 : undefined}
              />
            ))}
            {geo.leaves.map((l, i) => (
              <Node
                key={`l-${i}`}
                node={l}
                appear={leavesIn}
                lit={i === PATH_LEAF && frame >= readsF + 2 * step ? pathLeaf : 0}
                count={i === PATH_LEAF ? 3 : undefined}
              />
            ))}
          </svg>
          {pill(geo.root.x + geo.root.r + 136, geo.levelY[0], treeIn)}
          {mid1 && mid2 ? pill((mid1.x + mid2.x) / 2, geo.levelY[1], leavesIn) : null}
        </div>
      </div>

      <div style={{ position: 'relative', height: layout.totalRowHeight }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            fontFamily: title,
            fontWeight: 800,
            fontSize: layout.pageLabelSize,
            lineHeight: 1.3,
            color: colors.text,
            whiteSpace: 'nowrap',
            opacity: Math.min(1, pageLabelIn) * (1 - totalIn),
          }}
        >
          {p.pageLabel}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'baseline',
            gap: 16,
            fontFamily: title,
            fontWeight: 800,
            lineHeight: 1.25,
            color: colors.diagram,
            opacity: Math.min(1, totalIn),
            transform: `scale(${landPop})`,
            transformOrigin: 'left center',
            textShadow: `0 0 ${36 * glow}px ${colors.diagram}`,
          }}
        >
          <span style={{ position: 'relative', fontSize: layout.totalSize }}>
            <span style={{ visibility: 'hidden', position: 'absolute' }}>
              <DigitSlots text={totalText} size={layout.totalSize} />
            </span>
            <DigitSlots text={totalShown} size={layout.totalSize} />
          </span>
          <span style={{ fontSize: layout.unitSize, color: colors.text }}>{p.totalUnit}</span>
        </div>
      </div>

      <GlassCard
        tone={frame >= readsF ? 'good' : 'neutral'}
        glow={0.3 + 0.3 * Math.min(1, readsIn)}
        style={{
          height: cardH,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 32px',
          opacity: Math.min(1, popIn),
        }}
      >
        <div style={{ fontFamily: title, fontWeight: 800, lineHeight: 1.25 }}>
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              fontSize: layout.popSize,
              color: strike > 0.05 ? colors.wrong : colors.text,
            }}
          >
            <DigitSlots text={formatNumber(p.population, 0)} size={layout.popSize} />
            <div
              style={{
                position: 'absolute',
                left: -8,
                top: '52%',
                height: 8,
                borderRadius: 4,
                width: `calc(${strike * 100}% + 16px)`,
                background: colors.wrong,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 52,
              color: strike > 0.05 ? colors.wrong : colors.textMuted,
              opacity: strike > 0.05 ? 0.8 : 1,
            }}
          >
            {p.populationUnit}
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            fontFamily: title,
            fontWeight: 800,
            color: colors.correct,
            transform: `scale(${interpolate(readsIn, [0, 1], [0.4, 1])})`,
            opacity: frame >= readsF ? Math.min(1, readsIn) : 0.35,
          }}
        >
          <div
            style={{
              fontSize: layout.heroSize,
              lineHeight: 1.05,
              textShadow: `0 0 ${34 * heroGlow}px ${colors.correct}`,
            }}
          >
            {frame >= readsF ? reads.hero : '?'}
          </div>
          <div style={{ fontSize: 56, lineHeight: 1.3 }}>{reads.rest}</div>
        </div>
      </GlassCard>
    </div>
  );
};
