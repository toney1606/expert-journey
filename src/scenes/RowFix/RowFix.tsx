import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CodeBlock } from '../../components/CodeBlock/CodeBlock';
import { RowCounter } from '../../components/RowStrip/RowCounter';
import { RowStrip, StripBleed } from '../../components/RowStrip/RowStrip';
import { StatCard } from '../../components/RowStrip/StatCard';
import { fillRowsRemoved, rowsRemovedLine, wrapCode } from '../../components/RowStrip/format';
import {
  pendingIndices,
  stopIndex,
  stripGeometry,
  stripPendingCount,
} from '../../components/RowStrip/layout';
import {
  blinkAmount,
  counterValue,
  cursorAt,
  easeInOutCubic,
  readFraction,
  shakeOffset,
  stepOpacities,
} from '../../components/RowStrip/motion';
import { useSceneWords } from '../../components/SceneTiming';
import { GlassCard, Kicker, useBounceEnter, useDrift, useEnter } from '../../components/ui/ui';
import { colors, fontFamily } from '../../design/tokens';
import { spokenFrames } from '../../lib/cues';
import {
  BUTTON_FONT,
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  CODE_LH,
  CODE_TRACKING,
  KICKER_GAP,
  STAMP_SIZE,
  codeChars,
  rowFixLayout,
} from './layout';
import type { RowFixScene } from './schema';
import {
  BLINK_PERIOD,
  FIX_FADE,
  FIX_MORPH_FRAMES,
  PRESS_DELAY,
  SHAKE_FRAMES,
  rowFixBoundaries,
  rowFixFrames,
  rowFixRunFrames,
} from './timeline';
import { CONTENT_BOX } from '../../design/tokens';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const rise = (t: number): React.CSSProperties => ({
  opacity: Math.min(1, t * 1.4),
  transform: `translateY(${interpolate(t, [0, 1], [48, 0])}px)`,
});

const Step: React.FC<{ opacity: number; children: React.ReactNode }> = ({ opacity, children }) =>
  opacity <= 0 ? null : (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {children}
    </div>
  );

const codeCardStyle = (color: string): React.CSSProperties => ({
  borderRadius: 36,
  padding: '30px 24px',
  lineHeight: CODE_LH,
  letterSpacing: `${CODE_TRACKING}em`,
  border: `3px solid color-mix(in srgb, ${color} 60%, transparent)`,
  boxShadow: `0 0 36px color-mix(in srgb, ${color} 30%, transparent)`,
});

export const RowFix: React.FC<{ scene: RowFixScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const words = useSceneWords();
  const drift = useDrift(0.04);
  const p = scene.props;
  const kicker = p.kicker ?? { label: 'CÁCH SỬA', step: 6, total: 8 };
  const layout = rowFixLayout(p);
  const cues = rowFixFrames(
    spokenFrames(
      words,
      [p.atRows, p.atAnalyze, p.atStamp, p.atStrip, p.atFixCode, p.atMorph, p.atCursor, p.atResult],
      fps,
    ),
    durationInFrames,
  );
  const [s1 = 0, s2 = 0, s3 = 0] = stepOpacities(frame, rowFixBoundaries(cues), FIX_FADE);

  // Step 1: EXPLAIN card, then the "Rows Removed by Filter" hero blinking red and counting up.
  const explain = fillRowsRemoved(p.explainCode, p.rowsRemoved);
  const lines = explain.split('\n');
  const hot = rowsRemovedLine(explain);
  const hotLabel = (lines[hot] ?? '').split(':')[0] ?? '';
  const rest = lines.filter((_, i) => i !== hot).join('\n');
  const blink = blinkAmount(frame, cues.rows, BLINK_PERIOD, 0.15);
  const rowsPop = useBounceEnter(cues.rows);
  const tick = easeInOutCubic(interpolate(frame - cues.rows, [4, 50], [0, 1], clamp));
  const titleIn = useEnter(0);
  const explainIn = useEnter(6);

  // Step 2: ANALYZE button pressed, statistics card shakes, stamp "KHÔNG ĐỔI".
  const press = cues.analyze + PRESS_DELAY;
  const pressScale = interpolate(frame - press, [0, 4, 10], [1, 0.9, 1], clamp);
  const pressed = frame >= press && frame < press + 12;
  const shake = shakeOffset(frame, press + 4, SHAKE_FRAMES, 14);
  const buttonIn = useEnter(cues.analyze);
  const statIn = useEnter(cues.analyze + 6);
  const stamp = useBounceEnter(cues.stamp);

  // Step 3: same strip as the twist scene, gathered into one cluster; the cursor jumps into it.
  const g = stripGeometry();
  const count = stripPendingCount(g.total, p.pendingPercent);
  const old = pendingIndices('clustered-old', g.total, count);
  const cluster = pendingIndices('reorganised', g.total, count);
  const readStart = cluster[0] ?? 0;
  const stop = stopIndex(cluster, g.total, p.limit, readStart);
  const morph = interpolate(frame - cues.morph, [0, FIX_MORPH_FRAMES], [0, 1], clamp);
  const run = rowFixRunFrames(durationInFrames, cues.cursor);
  const cursor =
    frame < cues.cursor
      ? null
      : cursorAt(frame, { start: cues.cursor, runFrames: run, from: readStart, to: stop });
  const counter = counterValue(p.limit, readFraction(cursor, readStart, stop));
  const codeIn = useEnter(cues.fixCode);
  const heroIn = useBounceEnter(cues.cursor);
  const resultPop = useBounceEnter(cues.result);
  const fixCode = wrapCode(p.fixCode, codeChars(CONTENT_BOX.width));
  const numberMatch = /\d+/.exec(p.resultText);
  const prefix = numberMatch ? p.resultText.slice(0, numberMatch.index) : '';
  const suffix = numberMatch ? p.resultText.slice(numberMatch.index + numberMatch[0].length) : '';
  const heroNumber = numberMatch ? String(counter) : '';
  const heroDigits = numberMatch ? numberMatch[0].length : 0;
  const heroBeat =
    frame >= cues.result ? 1 + 0.12 * Math.max(0, 1 - resultPop) + 0.08 * (resultPop - 1) : 1;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: KICKER_GAP,
        fontFamily: fontFamily.title,
      }}
    >
      <Kicker label={kicker.label} step={kicker.step} total={kicker.total} tone="good" />
      <div style={{ position: 'relative', flex: 1 }}>
        <Step opacity={s1}>
          <div
            style={{
              ...rise(titleIn),
              fontFamily: fontFamily.code,
              fontSize: layout.titleSize,
              fontWeight: 800,
              lineHeight: 1.3,
              color: colors.accent,
              textShadow: `0 0 30px ${colors.accent}55`,
            }}
          >
            {p.explainTitle}
          </div>
          <div style={rise(explainIn)}>
            <CodeBlock
              code={rest}
              language="sql"
              fontSize={layout.codeSize}
              style={codeCardStyle(colors.diagram)}
            />
          </div>
          <div
            style={{
              opacity: Math.min(1, rowsPop * 1.5),
              transform: `scale(${interpolate(rowsPop, [0, 1], [0.8, 1]) * drift})`,
            }}
          >
            <GlassCard
              tone="bad"
              glow={0.3 + 0.7 * blink}
              style={{ display: 'flex', justifyContent: 'center', padding: '10px 20px 22px' }}
            >
              <RowCounter
                label={hotLabel}
                value={counterValue(p.rowsRemoved, tick)}
                finalValue={p.rowsRemoved}
                size={layout.counterSize}
                color={colors.wrong}
              />
            </GlassCard>
          </div>
        </Step>
        <Step opacity={s2}>
          <div
            style={{
              ...rise(buttonIn),
              alignSelf: 'center',
              width: BUTTON_WIDTH,
              height: BUTTON_HEIGHT,
              borderRadius: 44,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fontFamily.code,
              fontWeight: 800,
              fontSize: BUTTON_FONT,
              color: colors.bg,
              background: pressed ? colors.accent : colors.diagram,
              transform: `translateY(${interpolate(buttonIn, [0, 1], [48, 0])}px) scale(${pressScale})`,
              boxShadow: `0 10px 0 ${pressed ? colors.textMuted : '#4a6fb0'}, 0 0 60px color-mix(in srgb, ${colors.diagram} 45%, transparent)`,
            }}
          >
            {p.analyzeLabel}
          </div>
          <div style={{ ...rise(statIn), transform: `translateX(${shake}px)` }}>
            <StatCard
              label={p.statLabel}
              value={`${p.pendingPercent}%`}
              valueSize={layout.statValueSize}
              labelSize={layout.statLabelSize}
              color={colors.diagram}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', minHeight: STAMP_SIZE * 1.65 }}>
            {stamp > 0 ? (
              <div
                style={{
                  alignSelf: 'center',
                  padding: '6px 40px',
                  borderRadius: 24,
                  border: `8px solid ${colors.wrong}`,
                  background: 'rgba(30,30,46,0.9)',
                  color: colors.wrong,
                  fontWeight: 800,
                  fontSize: STAMP_SIZE,
                  lineHeight: 1.3,
                  letterSpacing: 3,
                  whiteSpace: 'nowrap',
                  boxShadow: `0 0 50px color-mix(in srgb, ${colors.wrong} 50%, transparent)`,
                  opacity: Math.min(1, stamp * 1.5),
                  transform: `rotate(-6deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`,
                }}
              >
                {p.stampText}
              </div>
            ) : null}
          </div>
        </Step>
        <Step opacity={s3}>
          <StripBleed>
            <RowStrip
              pendingFrom={old}
              pendingTo={cluster}
              morph={morph}
              cursor={cursor}
              readStart={readStart}
              trailColor={colors.correct}
            />
          </StripBleed>
          <div style={rise(codeIn)}>
            <CodeBlock
              code={fixCode}
              language="sql"
              fontSize={layout.codeSize}
              style={codeCardStyle(colors.correct)}
            />
          </div>
          <div
            style={{
              height: layout.resultSize * 1.2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: layout.resultSize,
              fontWeight: 800,
              lineHeight: 1.2,
              whiteSpace: 'pre',
              color: colors.correct,
              textShadow: `0 0 ${40 + 40 * Math.max(0, heroBeat - 1) * 8}px ${colors.correct}88`,
              opacity: cursor === null ? 0.22 : 0.22 + 0.78 * Math.min(1, heroIn * 1.5),
              transform: `scale(${(cursor === null ? 1 : interpolate(heroIn, [0, 1], [0.85, 1])) * heroBeat * drift})`,
            }}
          >
            <span>{prefix}</span>
            {numberMatch ? (
              <span
                style={{
                  display: 'inline-block',
                  width: `${heroDigits * 0.66}em`,
                  textAlign: 'right',
                }}
              >
                {heroNumber}
              </span>
            ) : null}
            <span>{suffix}</span>
          </div>
        </Step>
      </div>
    </div>
  );
};
