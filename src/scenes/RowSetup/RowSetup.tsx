import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CodeBlock } from '../../components/CodeBlock/CodeBlock';
import { RowCounter } from '../../components/RowStrip/RowCounter';
import { RowStrip, StripBleed } from '../../components/RowStrip/RowStrip';
import { formatNumber } from '../../components/RowStrip/format';
import {
  STRIP_SEED,
  pendingIndices,
  stopIndex,
  stripGeometry,
  stripPendingCount,
} from '../../components/RowStrip/layout';
import { counterValue, cursorAt, readFraction } from '../../components/RowStrip/motion';
import { useSceneWords } from '../../components/SceneTiming';
import { Kicker, useBounceEnter, useDrift, useEnter } from '../../components/ui/ui';
import { springs } from '../../design/springs';
import { colors, fontFamily } from '../../design/tokens';
import { spokenFrames } from '../../lib/cues';
import { rowSetupLayout } from './layout';
import type { RowSetupScene } from './schema';
import { rowSetupFrames, rowSetupRunFrames } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const rise = (t: number): React.CSSProperties => ({
  opacity: Math.min(1, t * 1.4),
  transform: `translateY(${interpolate(t, [0, 1], [48, 0])}px)`,
});

export const RowSetup: React.FC<{ scene: RowSetupScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const words = useSceneWords();
  const drift = useDrift(0.05);
  const p = scene.props;
  const kicker = p.kicker ?? { label: 'THIẾT LẬP', step: 4, total: 8 };

  const layout = rowSetupLayout(p);
  const cues = rowSetupFrames(
    spokenFrames(words, [p.atTable, p.atCode, p.atPending, p.atCursor], fps),
    durationInFrames,
  );

  const g = stripGeometry();
  const pending = pendingIndices(
    'spread',
    g.total,
    stripPendingCount(g.total, p.pendingPercent),
    STRIP_SEED,
  );
  const stop = stopIndex(pending, g.total, p.limit);
  const run = rowSetupRunFrames(durationInFrames, cues.cursor);
  const cursor =
    frame < cues.cursor
      ? null
      : cursorAt(frame, { start: cues.cursor, runFrames: run, from: 0, to: stop });
  const counter = counterValue(p.readCount, readFraction(cursor, 0, stop));

  const appear = spring({
    frame: frame - cues.pending,
    fps,
    durationInFrames: 36,
    config: springs.soft,
  });
  const headPop = useBounceEnter(cues.table);
  const stripIn = useEnter(cues.table);
  const codeIn = useEnter(cues.code);
  const legendIn = useEnter(cues.pending);
  const counterPop = useBounceEnter(cues.cursor);
  // The counter takes the place of the code card when the cursor starts.
  const swap = interpolate(frame - cues.cursor, [-6, 10], [0, 1], clamp);
  const lit = Math.min(1, Math.max(0, counterPop));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: fontFamily.title,
      }}
    >
      <Kicker label={kicker.label} step={kicker.step} total={kicker.total} tone="neutral" />
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 20,
          lineHeight: 1.25,
          opacity: Math.min(1, headPop * 1.5),
          transform: `scale(${interpolate(headPop, [0, 1], [0.7, 1]) * drift})`,
          transformOrigin: 'left center',
        }}
      >
        <span
          style={{
            fontSize: layout.headlineSize,
            fontWeight: 800,
            color: colors.accent,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 40px ${colors.accent}55`,
          }}
        >
          {formatNumber(p.rowCount)}
        </span>
        <span style={{ fontSize: layout.unitSize, fontWeight: 700, color: colors.text }}>
          {p.rowUnit}
        </span>
      </div>
      <StripBleed style={{ opacity: Math.min(1, stripIn * 1.4) }}>
        <RowStrip
          pendingFrom={pending}
          appear={cursor === null ? appear : 1}
          cursor={cursor}
          readStart={0}
          legend={
            <div
              style={{
                ...rise(legendIn),
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                fontSize: layout.legendSize,
                fontWeight: 800,
                lineHeight: 1.25,
                color: colors.pending,
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: colors.pending,
                  boxShadow: `0 0 16px ${colors.pending}`,
                }}
              />
              {`${p.pendingPercent}% = ${p.pendingLabel}`}
            </div>
          }
        />
      </StripBleed>
      <div style={{ position: 'relative', height: layout.slotHeight }}>
        <div
          style={{
            ...rise(codeIn),
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            opacity: Math.min(1, codeIn * 1.4) * (1 - swap),
          }}
        >
          <CodeBlock
            code={p.code}
            language="sql"
            fontSize={layout.codeSize}
            style={{
              borderRadius: 36,
              border: `3px solid color-mix(in srgb, ${colors.diagram} 60%, transparent)`,
              boxShadow: `0 0 36px color-mix(in srgb, ${colors.diagram} 30%, transparent)`,
            }}
          />
        </div>
        {cursor === null ? null : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: swap,
              transform: `scale(${interpolate(lit, [0, 1], [0.8, 1]) * drift})`,
            }}
          >
            <RowCounter
              label={p.readLabel}
              value={counter}
              prefix="~"
              finalValue={p.readCount}
              size={layout.counterSize}
            />
          </div>
        )}
      </div>
    </div>
  );
};
