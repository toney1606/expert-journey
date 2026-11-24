import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SpringConfig } from 'remotion';
import { useSceneWords } from '../../components/SceneTiming';
import { Chip, GlassCard, Kicker, toneColors, useDrift } from '../../components/ui/ui';
import { colors, fontFamily } from '../../design/tokens';
import { springs } from '../../design/springs';
import { spokenFrames } from '../../lib/cues';
import { formatNumber } from '../Stat/format';
import {
  CARD_PAD_X,
  CHIP_ROW,
  ENGINE_ROW,
  COST_ROADS_BOX,
  KICKER_HEIGHT,
  LANE_LABEL_ROW,
  LANE_PAD_Y,
  MULT_WIDTH,
  costRoadsLayout,
  paramChipText,
  statsLine,
} from './layout';
import type { CostRoadsScene } from './schema';
import {
  HOP_HEIGHTS,
  HOP_XS,
  SEQ_PERIOD,
  costRoadsFrames,
  hopPosition,
  linePosition,
  runnerPeriod,
} from './timeline';

const title = fontFamily.title;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const useEnter = (start: number, config: Partial<SpringConfig> = springs.snappy): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config });
};

/** Path of the erratic jumps: one quadratic arc per hop (arc heights scaled by `hMul`). */
const hopPath = (width: number, base: number, hMul: number): string => {
  const first = HOP_XS[0] ?? 0;
  let d = `M ${first * width} ${base}`;
  for (let i = 0; i < HOP_XS.length - 1; i += 1) {
    const x0 = (HOP_XS[i] ?? 0) * width;
    const x1 = (HOP_XS[i + 1] ?? 1) * width;
    const h = (HOP_HEIGHTS[i] ?? 0) * hMul;
    d += ` Q ${(x0 + x1) / 2} ${base - 2 * h} ${x1} ${base}`;
  }
  return d;
};

const Lane: React.FC<{
  kind: 'random' | 'seq';
  label: string;
  mult: string;
  multSize: number;
  height: number;
  roadStart: number;
  detailStart: number;
  multStart: number;
  period: number;
  width: number;
}> = ({
  kind,
  label,
  mult,
  multSize,
  height,
  roadStart,
  detailStart,
  multStart,
  period,
  width,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const road = useEnter(roadStart, springs.bouncy);
  const detail = useEnter(detailStart);
  const multIn = spring({ frame: frame - multStart, fps, config: springs.bouncy });
  const tone = kind === 'random' ? 'bad' : 'good';
  const color = toneColors[tone];
  const draw = spring({
    frame: frame - detailStart,
    fps,
    durationInFrames: 24,
    config: springs.soft,
  });
  const stripH = Math.max(60, height - LANE_LABEL_ROW - 2 * LANE_PAD_Y);
  const base = stripH - 22;
  const hMul = Math.min(3.2, Math.max(0.9, (base - 12) / 52));
  const heights = HOP_HEIGHTS.map((h) => h * hMul);
  const t = frame >= detailStart + 10 ? ((frame - detailStart - 10) % period) / period : 0;
  const runner =
    kind === 'random' ? hopPosition(t, width, base, HOP_XS, heights) : linePosition(t, width, base);
  const chevrons = Array.from({ length: 8 }, (_, i) => 36 + i * 70);
  const shake = kind === 'random' && multIn > 0.9 ? 0 : 0;
  return (
    <GlassCard
      tone={tone}
      glow={0.35 + 0.25 * Math.min(1, multIn)}
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: `${LANE_PAD_Y}px ${CARD_PAD_X}px`,
        opacity: clamp01(road),
        transform: `translateX(${interpolate(road, [0, 1], [-80, shake])}px)`,
      }}
    >
      <div style={{ width, flexShrink: 0 }}>
        <div
          style={{
            height: LANE_LABEL_ROW,
            fontWeight: 800,
            fontSize: 56,
            lineHeight: 1.3,
            color: colors.text,
            opacity: clamp01(road),
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
        <svg
          width={width}
          height={stripH}
          viewBox={`0 0 ${width} ${stripH}`}
          style={{ display: 'block' }}
        >
          <rect
            x={0}
            y={base - 16}
            width={width}
            height={32}
            rx={16}
            fill={colors.bg}
            opacity={0.8}
          />
          {kind === 'random' ? (
            <>
              <path
                d={hopPath(width, base, hMul)}
                fill="none"
                stroke={color}
                strokeWidth={10}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - draw}
                opacity={detail}
              />
              {HOP_XS.map((x, i) => (
                <circle key={i} cx={x * width} cy={base} r={11} fill={color} opacity={detail} />
              ))}
            </>
          ) : (
            <>
              <line
                x1={0}
                y1={base}
                x2={width * draw}
                y2={base}
                stroke={color}
                strokeWidth={10}
                strokeLinecap="round"
                opacity={detail}
              />
              {chevrons.map((x, i) =>
                x < width * draw ? (
                  <path
                    key={i}
                    d={`M ${x} ${base - 18} L ${x + 18} ${base} L ${x} ${base + 18}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null,
              )}
            </>
          )}
          {frame >= detailStart + 10 ? (
            <circle
              cx={runner.x}
              cy={runner.y}
              r={18}
              fill={colors.text}
              stroke={color}
              strokeWidth={6}
              opacity={detail}
            />
          ) : null}
        </svg>
      </div>
      <div
        style={{
          width: MULT_WIDTH,
          textAlign: 'right',
          fontWeight: 800,
          fontSize: multSize,
          lineHeight: 1.1,
          color,
          opacity: clamp01(multIn),
          transform: `scale(${interpolate(multIn, [0, 1], [0.4, 1])})`,
          transformOrigin: 'right center',
          textShadow: `0 0 ${34 * clamp01(multIn)}px ${color}99`,
        }}
      >
        {mult}
      </div>
    </GlassCard>
  );
};

export const CostRoads: React.FC<{ scene: CostRoadsScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const words = useSceneWords();
  const drift = useDrift(0.03);
  const p = scene.props;
  const layout = costRoadsLayout(p);

  const [roadsF, randomF, seqF, engineF, multF, rowsF, priceF, costF, guessF, statsF] =
    costRoadsFrames(
      spokenFrames(
        words,
        [
          p.roadsAt,
          p.randomAt,
          p.seqAt,
          p.engineAt,
          p.multAt,
          p.rowsAt,
          p.priceAt,
          p.costAt,
          p.guessAt,
          p.statsAt,
        ],
        fps,
      ),
      durationInFrames,
    ) as [number, number, number, number, number, number, number, number, number, number];

  const W = COST_ROADS_BOX.width;
  const chipIn = useEnter(engineF, springs.bouncy);
  const rowsIn = useEnter(rowsF);
  const priceIn = useEnter(priceF, springs.bouncy);
  const costIn = useEnter(costF, springs.bouncy);
  const guessIn = useEnter(guessF, springs.bouncy);
  const statsIn = useEnter(statsF);
  const dim = clamp01(useEnter(guessF, springs.soft));

  // Blocks grow into the frame in the order they are spoken, so there is never an empty band.
  const fGrow = clamp01(rowsIn);
  const bGrow = clamp01(useEnter(guessF));
  const sGrow = clamp01(statsIn);
  const formH = Math.round(layout.formulaHeight * fGrow);
  const botH = Math.round(layout.bottomHeight * bGrow);
  const gaps = layout.gap * (2 + fGrow + bGrow);
  const roadsH = Math.round(COST_ROADS_BOX.height - KICKER_HEIGHT - formH - botH - gaps);
  const engineH = Math.round(ENGINE_ROW * (1 - fGrow));
  const chipBlock = CHIP_ROW + engineH;
  const laneH = Math.min(340, Math.floor((roadsH - chipBlock - layout.gap * 2) / 2));

  const pulse = 0.65 + 0.35 * Math.sin(Math.max(0, frame - guessF) / 5);
  const guessGlow = clamp01(guessIn) * pulse;
  const barGrow = spring({
    frame: frame - statsF - 4,
    fps,
    durationInFrames: 24,
    config: springs.soft,
  });
  const pendingW = Math.max(3, p.pendingPercent) * barGrow;
  const bubbleW = interpolate(sGrow, [0, 1], [W, layout.bubbleWidth]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        fontFamily: title,
      }}
    >
      <Kicker label={p.kicker.label} step={p.kicker.step} total={p.kicker.total} tone="accent" />

      <div
        style={{
          height: roadsH,
          marginTop: layout.gap,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: layout.gap,
          opacity: 1 - 0.65 * dim,
          transform: `scale(${drift})`,
          transformOrigin: 'center top',
        }}
      >
        <Lane
          kind="random"
          label={p.randomLabel}
          mult={`×${formatNumber(p.randomCost)}`}
          multSize={layout.multSize}
          height={laneH}
          roadStart={roadsF}
          detailStart={randomF}
          multStart={multF}
          period={runnerPeriod(p.randomCost, p.seqCost)}
          width={layout.stripWidth}
        />
        <div
          style={{
            height: chipBlock,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: clamp01(chipIn),
            transform: `scale(${interpolate(chipIn, [0, 1], [0.6, 1])})`,
          }}
        >
          <div style={{ height: engineH, opacity: 1 - fGrow, overflow: 'hidden' }}>
            <Chip tone="neutral" size={layout.chipSize} solid style={{ padding: '0 22px' }}>
              {p.engine}
            </Chip>
          </div>
          <Chip
            tone="accent"
            size={layout.chipParamSize}
            style={{ padding: '2px 22px', fontSize: layout.chipParamSize }}
          >
            {paramChipText(p)}
          </Chip>
        </div>
        <Lane
          kind="seq"
          label={p.seqLabel}
          mult={`×${formatNumber(p.seqCost)}`}
          multSize={layout.multSize}
          height={laneH}
          roadStart={roadsF}
          detailStart={seqF}
          multStart={multF}
          period={SEQ_PERIOD}
          width={layout.stripWidth}
        />
      </div>

      <GlassCard
        tone="accent"
        glow={0.3}
        style={{
          height: formH,
          marginTop: layout.gap * fGrow,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${CARD_PAD_X}px`,
          fontWeight: 800,
          whiteSpace: 'nowrap',
          opacity: fGrow,
        }}
      >
        <div
          style={{
            fontSize: layout.formulaRowsSize,
            lineHeight: 1.3,
            opacity: clamp01(rowsIn),
            transform: `translateY(${interpolate(rowsIn, [0, 1], [24, 0])}px)`,
          }}
        >
          {p.formulaBefore}{' '}
          <span
            style={{
              color: colors.pending,
              textShadow: `0 0 ${30 * guessGlow}px ${colors.pending}`,
            }}
          >
            {p.guessWord.toLocaleUpperCase('vi')}
          </span>{' '}
          {p.formulaAfter}
        </div>
        <div style={{ fontSize: layout.formulaTailSize, lineHeight: 1.3 }}>
          <span
            style={{
              display: 'inline-block',
              opacity: clamp01(priceIn),
              transform: `scale(${interpolate(priceIn, [0, 1], [0.6, 1])})`,
              transformOrigin: 'left center',
            }}
          >
            × {p.priceLabel}
          </span>
          <span
            style={{
              display: 'inline-block',
              marginLeft: 24,
              color: colors.accent,
              opacity: clamp01(costIn),
              transform: `scale(${interpolate(costIn, [0, 1], [0.6, 1])})`,
              transformOrigin: 'left center',
              textShadow: `0 0 ${24 * clamp01(costIn)}px ${colors.accent}77`,
            }}
          >
            = {p.costLabel}
          </span>
        </div>
      </GlassCard>

      <div
        style={{
          height: botH,
          marginTop: layout.gap * bGrow,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            width: bubbleW,
            height: '100%',
            position: 'relative',
            opacity: clamp01(guessIn),
            transform: `scale(${interpolate(guessIn, [0, 1], [0.6, 1])})`,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '84%',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(160deg, rgba(250,179,135,0.28), rgba(30,30,46,0.9))',
              border: `5px solid ${colors.pending}`,
              borderRadius: 80,
              boxShadow: `0 0 ${20 + 60 * guessGlow}px ${colors.pending}, inset 0 0 40px ${colors.pending}33`,
              fontWeight: 800,
              fontSize: layout.bubbleSize,
              lineHeight: 1.3,
              color: colors.pending,
              textShadow: `0 0 ${40 * guessGlow}px ${colors.pending}`,
            }}
          >
            {p.guessWord}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 44,
              bottom: 6,
              width: 30,
              height: 30,
              borderRadius: 15,
              background: colors.pending,
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 14,
              bottom: -6,
              width: 18,
              height: 18,
              borderRadius: 9,
              background: colors.pending,
              opacity: 0.9,
            }}
          />
        </div>
        <GlassCard
          tone="neutral"
          glow={0.2}
          style={{
            width: layout.statsWidth,
            height: '84%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 6,
            padding: '0 24px',
            opacity: clamp01(statsIn),
            transform: `translateX(${interpolate(statsIn, [0, 1], [60, 0])}px)`,
            position: sGrow > 0 ? 'relative' : 'absolute',
            right: 0,
          }}
        >
          <div
            style={{
              fontSize: layout.statsSize,
              fontWeight: 800,
              lineHeight: 1.3,
              color: colors.pending,
              whiteSpace: 'nowrap',
            }}
          >
            ● {statsLine(p.pendingLabel, p.pendingPercent)}
          </div>
          <div
            style={{
              fontSize: layout.statsSize,
              fontWeight: 800,
              lineHeight: 1.3,
              color: colors.diagram,
              whiteSpace: 'nowrap',
            }}
          >
            ● {statsLine(p.doneLabel, p.donePercent)}
          </div>
          <div
            style={{
              display: 'flex',
              height: 36,
              borderRadius: 18,
              overflow: 'hidden',
              background: colors.bg,
              marginTop: 6,
            }}
          >
            <div
              style={{
                width: `${pendingW}%`,
                background: colors.pending,
                boxShadow: `0 0 20px ${colors.pending}`,
              }}
            />
            <div style={{ flex: 1, background: colors.diagram, opacity: 0.9 }} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
