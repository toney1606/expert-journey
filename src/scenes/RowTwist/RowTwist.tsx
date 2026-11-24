import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RowCounter } from '../../components/RowStrip/RowCounter';
import { RowStrip, StripBleed } from '../../components/RowStrip/RowStrip';
import { StatCard } from '../../components/RowStrip/StatCard';
import {
  STRIP_SEED,
  pendingIndices,
  stopIndex,
  stripGeometry,
  stripPendingCount,
} from '../../components/RowStrip/layout';
import { counterValue, cursorAt, readFraction } from '../../components/RowStrip/motion';
import { useSceneWords } from '../../components/SceneTiming';
import { GlassCard, Kicker, useBounceEnter, useDrift, useEnter } from '../../components/ui/ui';
import { springs } from '../../design/springs';
import { colors, fontFamily, glow } from '../../design/tokens';
import { spokenFrames } from '../../lib/cues';
import { TOGGLE_LABEL_SIZE, TOGGLE_ON_SIZE, rowTwistLayout } from './layout';
import type { RowTwistScene } from './schema';
import { TWIST_MORPH_FRAMES, rowTwistFrames, rowTwistRunFrames } from './timeline';

const KNOB = 68;
const TRACK_W = 150;
const TRACK_H = 84;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const rise = (t: number): React.CSSProperties => ({
  opacity: Math.min(1, t * 1.4),
  transform: `translateY(${interpolate(t, [0, 1], [48, 0])}px)`,
});

export const RowTwist: React.FC<{ scene: RowTwistScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const words = useSceneWords();
  const drift = useDrift(0.05);
  const p = scene.props;
  const kicker = p.kicker ?? { label: 'BƯỚC NGOẶT', step: 5, total: 8 };
  const layout = rowTwistLayout(p);
  const cues = rowTwistFrames(
    spokenFrames(
      words,
      [p.atToggle, p.atSlide, p.atStat, p.atBelief, p.atCursor, p.atAssumption, p.atStrike],
      fps,
    ),
    durationInFrames,
  );

  const g = stripGeometry();
  const count = stripPendingCount(g.total, p.pendingPercent);
  const spread = pendingIndices('spread', g.total, count, STRIP_SEED);
  const old = pendingIndices('clustered-old', g.total, count);
  const stop = stopIndex(old, g.total, 1);

  const toggleT = spring({ frame: frame - cues.toggle, fps, config: springs.snappy });
  const togglePop = useBounceEnter(cues.toggle);
  const appear = spring({ frame, fps, durationInFrames: 36, config: springs.soft });
  const morph = interpolate(frame - cues.slide, [0, TWIST_MORPH_FRAMES], [0, 1], clamp);
  const run = rowTwistRunFrames(durationInFrames, cues.cursor);
  const cursor =
    frame < cues.cursor
      ? null
      : cursorAt(frame, { start: cues.cursor, runFrames: run, from: 0, to: stop });
  const counter = counterValue(p.skippedCount, readFraction(cursor, 0, stop));
  const strike = interpolate(frame - cues.strike, [0, 14], [0, 1], clamp);
  const statIn = useEnter(cues.stat);
  const beliefIn = useEnter(cues.belief);
  const counterPop = useBounceEnter(cues.cursor);
  const assumptionIn = useEnter(cues.assumption);
  const swap = interpolate(frame - cues.cursor, [-6, 10], [0, 1], clamp);
  const on = toggleT > 0.5;

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
      <Kicker label={kicker.label} step={kicker.step} total={kicker.total} tone="bad" />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          height: layout.toggleHeight,
          opacity: Math.min(1, togglePop * 1.5),
          transform: `translateY(${interpolate(togglePop, [0, 1], [30, 0])}px)`,
        }}
      >
        <span
          style={{
            fontSize: TOGGLE_LABEL_SIZE,
            fontWeight: 800,
            color: colors.text,
          }}
        >{`${p.toggleLabel}:`}</span>
        <div
          style={{
            position: 'relative',
            width: TRACK_W,
            height: TRACK_H,
            flexShrink: 0,
            borderRadius: TRACK_H / 2,
            background: on ? colors.accent : colors.card,
            border: `4px solid ${on ? colors.accent : colors.textMuted}`,
            boxSizing: 'border-box',
            boxShadow: on ? `0 0 36px ${colors.accent}88` : undefined,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: (TRACK_H - 8 - KNOB) / 2,
              left: 4 + (TRACK_W - 16 - KNOB) * toggleT,
              width: KNOB,
              height: KNOB,
              borderRadius: KNOB / 2,
              background: on ? colors.bg : colors.textMuted,
            }}
          />
        </div>
        <span
          style={{
            fontSize: TOGGLE_ON_SIZE,
            fontWeight: 800,
            color: colors.accent,
            textShadow: glow(colors.accent),
            opacity: interpolate(toggleT, [0.4, 1], [0, 1], { extrapolateLeft: 'clamp' }),
          }}
        >
          {p.toggleOnText}
        </span>
      </div>
      <StripBleed>
        <RowStrip
          pendingFrom={spread}
          pendingTo={old}
          morph={morph}
          appear={appear}
          cursor={cursor}
          readStart={0}
          skipLabel={p.skipLabel}
          trailColor={colors.wrong}
        />
      </StripBleed>
      <div style={{ position: 'relative', height: layout.slotHeight }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            gap: layout.gap,
            alignItems: 'stretch',
            opacity: 1 - swap,
          }}
        >
          <div style={{ ...rise(statIn), width: layout.statWidth }}>
            <StatCard
              label={p.statLabel}
              value={`${p.pendingPercent}%`}
              valueSize={layout.statValueSize}
              labelSize={layout.statLabelSize}
              color={colors.diagram}
              style={{ height: '100%' }}
            />
          </div>
          <GlassCard
            tone="pending"
            glow={0.5}
            style={{
              ...rise(beliefIn),
              width: layout.beliefWidth,
              display: 'flex',
              alignItems: 'center',
              fontSize: layout.textSize,
              fontWeight: 800,
              lineHeight: 1.3,
            }}
          >
            {p.beliefText}
          </GlassCard>
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
              transform: `scale(${interpolate(counterPop, [0, 1], [0.8, 1]) * drift})`,
            }}
          >
            <RowCounter
              label={p.skippedLabel}
              value={counter}
              finalValue={p.skippedCount}
              size={layout.counterSize}
              color={colors.wrong}
            />
          </div>
        )}
      </div>
      <div style={{ ...rise(assumptionIn), height: layout.assumptionHeight }}>
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span
            style={{
              fontSize: layout.assumptionSize,
              fontWeight: 800,
              lineHeight: 1.3,
              color: strike > 0 ? colors.textMuted : colors.text,
            }}
          >
            {p.assumptionText}
          </span>
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: '54%',
              height: 8,
              width: `${strike * 100}%`,
              borderRadius: 4,
              background: colors.wrong,
              boxShadow: `0 0 16px ${colors.wrong}`,
            }}
          />
        </span>
      </div>
    </div>
  );
};
