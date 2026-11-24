import { interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useSceneWords } from '../../components/SceneTiming';
import {
  DigitSlots,
  GlassCard,
  GlowBlob,
  Kicker,
  useDrift,
  useEnter,
} from '../../components/ui/ui';
import { spokenFrames } from '../../lib/cues';
import { colors, fontFamily, glow } from '../../design/tokens';
import { springs } from '../../design/springs';
import { formatNumber } from '../Stat/format';
import {
  BAR_H,
  CARD_PAD_X,
  CARD_PAD_Y,
  HERO_EXTRA,
  LINE_GAP,
  NUMBER_LINE,
  RATIO_SIZE,
  TEXT_LINE,
  UNIT_GAP_EM,
  UNIT_SCALE,
  counterHookLayout,
} from './layout';
import { CounterHookPropsSchema } from './schema';
import type { CounterHookScene } from './schema';
import { counterHookCues, counterHookTimeline, shakeOffset } from './timeline';

/** Frames the race stage takes to hand over to the punchline. */
const HANDOVER = 10;

const fill: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
};

export const CounterHook: React.FC<{ scene: CounterHookScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Idempotent: applies schema defaults even when props arrive unparsed (e.g. remotion still --props).
  const props = CounterHookPropsSchema.parse(scene.props);
  const { fastMs, slowMs, unit, lines, finalText, accentWord, footText, kicker } = props;
  const layout = counterHookLayout(props);
  const { countFrames } = counterHookTimeline(durationInFrames, lines.length);
  const words = useSceneWords();
  const cues = counterHookCues(
    spokenFrames(words, [props.countAt, ...lines.map((l) => l.at), props.finalAt], fps),
    durationInFrames,
    lines.length,
  );
  const drift = useDrift(0.04);

  // Opening punch: the hero slams in from big, with overshoot.
  const slam = spring({ frame, fps, config: springs.bouncy });
  const count = spring({
    frame: frame - cues.countStart,
    fps,
    durationInFrames: countFrames,
    config: springs.soft,
  });
  const value = fastMs + (slowMs - fastMs) * count;
  const numberColor = interpolateColors(count, [0, 1], [colors.correct, colors.wrong]);
  const landed = frame - cues.countStart - countFrames;
  const pop = landed >= 0 ? 1 + 0.07 * Math.max(0, Math.sin((landed / 18) * Math.PI)) : 1;
  const ratio = fastMs > 0 ? slowMs / fastMs : 1;
  const ratioShown = 1 + (ratio - 1) * count;
  const barFrac = Math.max(0.03, value / Math.max(fastMs, slowMs));

  const gone = Math.min(1, Math.max(0, (frame - cues.finalStart) / HANDOVER));
  const finalIn = useEnter(cues.finalStart, springs.snappy);
  const accentIn = useEnter(cues.finalStart + 6, { ...springs.bouncy, mass: 1 });
  const footIn = useEnter(cues.finalStart + 18, springs.snappy);
  const shake = shakeOffset(frame - cues.finalStart - 6);

  const size = interpolate(count, [0, 1], [layout.startSize, layout.numberSize]);
  const firstIn = spring({ frame: frame - (cues.lineStarts[0] ?? 0), fps, config: springs.soft });
  const linesH =
    lines.length * (layout.lineSize * TEXT_LINE + 2 * CARD_PAD_Y) + (lines.length - 1) * LINE_GAP;
  const shift = (1 - firstIn) * (linesH / 2);
  const unitSize = size * UNIT_SCALE;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        fontFamily: fontFamily.title,
        textAlign: 'center',
      }}
    >
      <GlowBlob
        color={frame >= cues.finalStart ? colors.pending : numberColor}
        opacity={0.28 + 0.12 * count}
        style={{ top: '38%' }}
      />
      {kicker ? <Kicker {...kicker} tone="bad" /> : <div style={{ height: 56 }} />}
      <div style={{ position: 'relative', flex: 1 }}>
        {/* Stage A: the race (12 ms -> 1.200 ms) and the three facts. */}
        <div
          style={{
            ...fill,
            justifyContent: 'space-between',
            opacity: 1 - gone,
            transform: `translateY(${-40 * gone}px) scale(${1 - 0.06 * gone})`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 40,
              transform: `translateY(${shift}px)`,
            }}
          >
            <div
              style={{
                opacity: Math.min(1, slam * 2),
                transform: `scale(${interpolate(slam, [0, 1], [1.25, 1]) * pop * drift})`,
                transformOrigin: 'center center',
                height: layout.numberSize * NUMBER_LINE + HERO_EXTRA,
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                color: numberColor,
                fontWeight: 800,
                lineHeight: NUMBER_LINE,
                textShadow: `0 0 48px color-mix(in srgb, ${numberColor} 70%, transparent)`,
                whiteSpace: 'nowrap',
              }}
            >
              <DigitSlots text={formatNumber(Math.round(value))} size={size} />
              <span
                style={{
                  fontSize: unitSize,
                  marginLeft: `${UNIT_GAP_EM}em`,
                  color: colors.text,
                  opacity: 0.85,
                  textShadow: 'none',
                }}
              >
                {unit}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, opacity: slam }}>
              <div
                style={{
                  flex: 1,
                  height: BAR_H,
                  borderRadius: BAR_H / 2,
                  background: colors.card,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${barFrac * 100}%`,
                    height: '100%',
                    borderRadius: BAR_H / 2,
                    background: `linear-gradient(90deg, ${colors.correct}, ${numberColor})`,
                    boxShadow: `0 0 24px ${numberColor}`,
                  }}
                />
              </div>
              <div
                style={{
                  minWidth: 220,
                  fontSize: RATIO_SIZE,
                  fontWeight: 800,
                  lineHeight: TEXT_LINE,
                  color: colors.wrong,
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: glow(colors.wrong),
                }}
              >
                {`×${formatNumber(Math.round(ratioShown))}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: LINE_GAP }}>
            {lines.map((line, i) => {
              const p = spring({
                frame: frame - (cues.lineStarts[i] ?? 0),
                fps,
                config: springs.bouncy,
              });
              return (
                <div
                  key={`${i}-${line.text}`}
                  style={{
                    opacity: Math.min(1, p * 1.5),
                    transform: `translateX(${interpolate(p, [0, 1], [-90, 0])}px)`,
                  }}
                >
                  <GlassCard
                    tone="neutral"
                    glow={0.2}
                    style={{
                      padding: `${CARD_PAD_Y}px ${CARD_PAD_X}px`,
                      fontSize: layout.lineSize,
                      fontWeight: 700,
                      lineHeight: TEXT_LINE,
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {line.text}
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </div>
        {/* Stage B: the punchline "Database ĐOÁN". */}
        <div
          style={{
            ...fill,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            opacity: gone,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              opacity: finalIn,
              transform: `translateY(${interpolate(finalIn, [0, 1], [-40, 0])}px)`,
              fontSize: layout.finalSize,
              fontWeight: 800,
              lineHeight: TEXT_LINE,
              color: colors.text,
              whiteSpace: 'nowrap',
            }}
          >
            {finalText}
          </div>
          <div
            style={{
              opacity: Math.min(1, accentIn * 2),
              transform: `translateX(${shake}px) scale(${interpolate(accentIn, [0, 1], [0.5, 1]) * drift})`,
              fontSize: layout.accentSize,
              fontWeight: 800,
              lineHeight: 1.25,
              color: colors.pending,
              textShadow: `0 0 60px color-mix(in srgb, ${colors.pending} 80%, transparent)`,
              whiteSpace: 'nowrap',
            }}
          >
            {accentWord}
          </div>
          {footText ? (
            <div
              style={{
                marginTop: 80,
                opacity: Math.min(1, footIn * 1.5),
                transform: `translateY(${interpolate(footIn, [0, 1], [40, 0])}px)`,
              }}
            >
              <GlassCard
                tone="pending"
                glow={0.5}
                style={{
                  padding: `${CARD_PAD_Y}px ${CARD_PAD_X}px`,
                  fontSize: layout.footSize,
                  fontWeight: 700,
                  lineHeight: TEXT_LINE,
                  whiteSpace: 'nowrap',
                }}
              >
                {footText}
              </GlassCard>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
