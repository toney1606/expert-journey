import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { CheckIcon, GlassCard, GlowBlob, Kicker, useDrift, useEnter } from '../../components/ui/ui';
import { colors, fontFamily, glow } from '../../design/tokens';
import { springs } from '../../design/springs';
import { spokenFrames } from '../../lib/cues';
import {
  CHECK_GAP,
  CHIP_PAD_X,
  CHIP_PAD_Y,
  GAP,
  HERO_LINE,
  LOG_GAP,
  LOG_LINE,
  LOG_PAD_X,
  LOG_PAD_Y,
  MINI_SIZE,
  TAP_RING,
  paymentHookLayout,
} from './layout';
import { PaymentHookPropsSchema } from './schema';
import type { PaymentHookScene } from './schema';
import { paymentHookCues, shakeOffset, typedChars, typingEnd } from './timeline';

/** Frames stage A takes to hand over to stage B. */
const HANDOVER = 9;
const bounce = { ...springs.bouncy, mass: 1 };

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const Chip: React.FC<{
  label: string;
  size: number;
  padX: number;
  padY: number;
  enter: number;
  dx?: number;
  from?: number;
}> = ({ label, size, padX, padY, enter, dx = 0, from = 1.7 }) => (
  <div
    style={{
      alignSelf: 'flex-start',
      opacity: clamp01(enter * 2),
      transform: `translateX(${dx}px) scale(${interpolate(enter, [0, 1], [from, 1])})`,
      padding: `${padY}px ${padX}px`,
      borderRadius: 28,
      border: `4px solid ${colors.wrong}`,
      background: `color-mix(in srgb, ${colors.wrong} 14%, ${colors.bg})`,
      boxShadow: `0 0 50px color-mix(in srgb, ${colors.wrong} 45%, transparent)`,
      color: colors.wrong,
      fontSize: size,
      fontWeight: 800,
      lineHeight: 1.3,
      whiteSpace: 'nowrap',
      textShadow: glow(colors.wrong),
    }}
  >
    {label}
  </div>
);

const TapRing: React.FC<{ since: number }> = ({ since }) => {
  const rings = [0, 1, 2].map((i) => {
    const t = since - i * 8;
    const phase = t < 0 ? 0 : (t % 26) / 26;
    return { scale: 0.45 + 1.15 * phase, opacity: t < 0 ? 0 : 0.9 * (1 - phase) };
  });
  return (
    <div style={{ position: 'relative', width: TAP_RING, height: TAP_RING, flexShrink: 0 }}>
      {rings.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `6px solid ${colors.accent}`,
            opacity: r.opacity,
            transform: `scale(${r.scale})`,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 76,
          height: 76,
          marginLeft: -38,
          marginTop: -38,
          borderRadius: '50%',
          background: colors.accent,
          boxShadow: glow(colors.accent),
          opacity: since < 0 ? 0 : 1,
          transform: `scale(${since >= 0 && since < 6 ? 0.8 : 1})`,
        }}
      />
    </div>
  );
};

export const PaymentHook: React.FC<{ scene: PaymentHookScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const props = PaymentHookPropsSchema.parse(scene.props);
  const { moneyLabel, badgeText, chargedLine, tappedLine, tapLabel, logs, question, kicker } =
    props;
  const layout = paymentHookLayout(props);
  const words = useSceneWords();
  const cues = paymentHookCues(
    spokenFrames(
      words,
      [
        props.chargeAt,
        props.chargeAgainAt,
        props.tapAt,
        ...logs.map((l) => l.at),
        props.questionAt,
      ],
      fps,
    ),
    durationInFrames,
  );
  const drift = useDrift(0.04);
  const firstLog = cues.logs[0] ?? 0;

  const gone = clamp01((frame - firstLog) / HANDOVER);
  const heroIn1 = spring({ frame: frame - cues.charge, fps, config: bounce });
  const heroIn2 = spring({ frame: frame - cues.tap, fps, config: bounce });
  const chip1 = spring({ frame: frame - cues.charge, fps, config: bounce });
  const chip2 = spring({ frame: frame - cues.chargeAgain, fps, config: bounce });
  const badge = spring({ frame: frame - cues.chargeAgain - 5, fps, config: bounce });
  const shake2 = shakeOffset(frame - cues.chargeAgain);
  const tapSince = frame - cues.tap;
  const tapLabelIn = useEnter(cues.tap + 4, springs.snappy);
  const miniIn = useEnter(firstLog, springs.snappy);
  const qIn = spring({ frame: frame - cues.question, fps, config: bounce });
  const qSince = frame - cues.question;
  const pulse =
    qSince >= 6 && qSince < 48
      ? 1 + 0.07 * Math.max(0, Math.sin(((qSince - 6) / 21) * Math.PI))
      : 1;
  const dim = 1 - 0.45 * clamp01((frame - cues.question) / 10);

  const heroStyle = (size: number, p: number): React.CSSProperties => ({
    fontSize: size,
    fontWeight: 800,
    lineHeight: HERO_LINE,
    color: colors.text,
    whiteSpace: 'nowrap',
    opacity: clamp01(p * 2),
    transform: `scale(${interpolate(p, [0, 1], [1.35, 1])})`,
    transformOrigin: 'center center',
    textAlign: 'center',
  });

  const chipH = layout.moneySize * 1.3 + 2 * CHIP_PAD_Y;
  const fill: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: GAP,
        fontFamily: fontFamily.title,
        textAlign: 'center',
      }}
    >
      <GlowBlob
        color={frame >= cues.question ? colors.accent : colors.wrong}
        opacity={0.26}
        style={{ top: '48%' }}
      />
      {kicker ? <Kicker {...kicker} tone="bad" /> : <div style={{ height: 56 }} />}
      <div style={{ position: 'relative', flex: 1 }}>
        {/* Stage A: the double charge and the single tap. */}
        <div
          style={{
            ...fill,
            justifyContent: 'space-between',
            opacity: 1 - gone,
            transform: `translateY(${-40 * gone}px) scale(${(1 - 0.05 * gone) * drift})`,
          }}
        >
          <div style={heroStyle(layout.chargedSize, heroIn1)}>
            <RichText text={chargedLine} glow />
          </div>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ height: chipH, display: 'flex', flexDirection: 'column' }}>
              <Chip
                label={moneyLabel}
                size={layout.moneySize}
                padX={CHIP_PAD_X}
                padY={CHIP_PAD_Y}
                enter={chip1}
              />
            </div>
            <div style={{ height: chipH, display: 'flex', flexDirection: 'column' }}>
              <Chip
                label={moneyLabel}
                size={layout.moneySize}
                padX={CHIP_PAD_X}
                padY={CHIP_PAD_Y}
                enter={chip2}
                dx={shake2}
                from={2.1}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                right: 6,
                bottom: -26,
                width: 170,
                height: 170,
                borderRadius: '50%',
                background: colors.wrong,
                color: colors.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 100,
                fontWeight: 800,
                lineHeight: 1,
                opacity: clamp01(badge * 2),
                transform: `rotate(${interpolate(badge, [0, 1], [-50, -12])}deg) scale(${interpolate(badge, [0, 1], [2.2, 1])})`,
                boxShadow: `0 0 60px color-mix(in srgb, ${colors.wrong} 70%, transparent)`,
              }}
            >
              {badgeText}
            </div>
          </div>
          <div style={heroStyle(layout.tappedSize, heroIn2)}>
            <RichText text={tappedLine} glow />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 36,
              height: TAP_RING,
            }}
          >
            <TapRing since={tapSince} />
            <div
              style={{
                fontSize: 96,
                color: colors.text,
                fontWeight: 800,
                lineHeight: 1.3,
                opacity: tapLabelIn,
                transform: `translateX(${interpolate(tapLabelIn, [0, 1], [-40, 0])}px)`,
              }}
            >
              {tapLabel}
            </div>
          </div>
        </div>
        {/* Stage B: logs say OK, then the question. */}
        <div
          style={{
            ...fill,
            justifyContent: 'space-evenly',
            opacity: gone,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 20,
              opacity: miniIn * (0.7 + 0.3 * dim),
              transform: `translateY(${interpolate(miniIn, [0, 1], [-30, 0])}px)`,
              fontSize: MINI_SIZE,
              fontWeight: 800,
              lineHeight: 1.4,
              color: colors.wrong,
            }}
          >
            <span>{moneyLabel}</span>
            <span>{moneyLabel}</span>
            <span
              style={{
                background: colors.wrong,
                color: colors.bg,
                borderRadius: 999,
                padding: '0 22px',
              }}
            >
              {badgeText}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: LOG_GAP, opacity: dim }}>
            {logs.map((log, i) => {
              const start = cues.logs[i] ?? 0;
              const p = spring({ frame: frame - start, fps, config: springs.snappy });
              const done = typingEnd(log.text, start);
              const check = spring({ frame: frame - done, fps, config: bounce });
              return (
                <div
                  key={`${i}-${log.text}`}
                  style={{
                    opacity: clamp01(p * 2),
                    transform: `translateX(${interpolate(p, [0, 1], [-80, 0])}px)`,
                  }}
                >
                  <GlassCard
                    tone="neutral"
                    style={{
                      padding: `${LOG_PAD_Y}px ${LOG_PAD_X}px`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: CHECK_GAP,
                      fontFamily: fontFamily.code,
                      fontSize: layout.logSize,
                      fontWeight: 700,
                      lineHeight: LOG_LINE,
                      whiteSpace: 'pre',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ flex: 1 }}>{typedChars(log.text, frame - start)}</span>
                    <span
                      style={{
                        opacity: clamp01(check * 2),
                        transform: `scale(${interpolate(check, [0, 1], [0.2, 1])})`,
                        display: 'flex',
                      }}
                    >
                      <CheckIcon size={layout.logSize} />
                    </span>
                  </GlassCard>
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontSize: layout.questionSize,
              fontWeight: 800,
              lineHeight: HERO_LINE,
              color: colors.text,
              whiteSpace: 'nowrap',
              opacity: clamp01(qIn * 2),
              transform: `scale(${interpolate(qIn, [0, 1], [0.5, 1]) * pulse * drift})`,
              textShadow: 'none',
            }}
          >
            <RichText text={question} glow />
          </div>
        </div>
      </div>
    </div>
  );
};
