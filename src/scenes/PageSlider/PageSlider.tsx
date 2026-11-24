import { interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CodeBlock } from '../../components/CodeBlock/CodeBlock';
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
import { colors, glow, fontFamily } from '../../design/tokens';
import { springs } from '../../design/springs';
import { formatPage, latencyText, pageAt } from './format';
import {
  CTA_PAD,
  CTA_SIZE,
  GAP,
  GAUGE_H,
  LATENCY_SIZE,
  PAGE_LABEL_SIZE,
  PAGE_LINE,
  PIN_ICON,
  TEXT_LINE,
  pageSliderLayout,
} from './layout';
import { Pin } from './Pin';
import { PageSliderPropsSchema } from './schema';
import type { PageSliderScene } from './schema';
import { pageSliderCues, pageSliderTimeline } from './timeline';

const TRACK_H = 44;
const KNOB = 88;
/** Frames the hero stage takes to hand over to the question. */
const HANDOVER = 10;

const fill: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
};

export const PageSlider: React.FC<{ scene: PageSliderScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Idempotent: applies schema defaults even when props arrive unparsed (e.g. remotion still --props).
  const props = PageSliderPropsSchema.parse(scene.props);
  const layout = pageSliderLayout(props);
  const { dragFrames } = pageSliderTimeline(durationInFrames);
  const words = useSceneWords();
  const cues = pageSliderCues(
    spokenFrames(words, [props.dragAt, props.questionAt, props.pinAt], fps),
    durationInFrames,
  );
  const drift = useDrift(0.04);

  const enter = spring({ frame, fps, config: springs.snappy });
  const drag = spring({
    frame: frame - cues.dragStart,
    fps,
    durationInFrames: dragFrames,
    config: springs.soft,
  });
  const color = interpolateColors(
    drag,
    [0, 0.5, 1],
    [colors.correct, colors.pending, colors.wrong],
  );
  const page = pageAt(drag, props.firstPage, props.lastPage);
  const latency = latencyText(
    drag,
    { ms: props.page1Ms, label: props.page1Label },
    { ms: props.page10000Ms, label: props.page10000Label },
  );

  const gone = Math.min(1, Math.max(0, (frame - cues.questionStart) / HANDOVER));
  const pinIn = useEnter(cues.pinStart, { ...springs.bouncy, mass: 1 });
  const ctaGrow = useEnter(cues.pinStart, springs.snappy);
  const offsetLine = props.code.split('\n').findIndex((l) => /OFFSET/i.test(l));
  const pulse =
    gone > 0 ? 0.55 + 0.45 * Math.sin(((frame - cues.questionStart) / 15) * Math.PI) ** 2 : 0;

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
      <GlowBlob color={gone > 0.5 ? colors.accent : color} opacity={0.26} style={{ top: '30%' }} />
      {props.kicker ? <Kicker {...props.kicker} tone="accent" /> : <div style={{ height: 56 }} />}
      <div style={{ position: 'relative', flex: 1 }}>
        {/* Stage A: giant page number scrubbing 1 -> 10.000 with the gauge. */}
        <div
          style={{
            ...fill,
            justifyContent: 'space-between',
            opacity: (1 - gone) * enter,
            transform: `translateY(${-40 * gone}px) scale(${1 - 0.06 * gone})`,
          }}
        >
          <div
            style={{
              transform: `scale(${drift})`,
              transformOrigin: 'center top',
              color,
            }}
          >
            <div
              style={{
                fontSize: PAGE_LABEL_SIZE,
                lineHeight: TEXT_LINE,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: colors.textMuted,
              }}
            >
              {props.pageLabel}
            </div>
            <div
              style={{
                fontWeight: 800,
                lineHeight: PAGE_LINE,
                textShadow: `0 0 52px color-mix(in srgb, ${color} 65%, transparent)`,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <DigitSlots text={formatPage(page)} size={layout.pageSize} />
            </div>
            <div style={{ fontWeight: 800, fontSize: LATENCY_SIZE, lineHeight: TEXT_LINE }}>
              {latency}
            </div>
          </div>
          <div style={{ position: 'relative', height: GAUGE_H }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: (GAUGE_H - TRACK_H) / 2,
                height: TRACK_H,
                borderRadius: TRACK_H / 2,
                background: colors.card,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                width: `calc((100% - ${KNOB}px) * ${drag} + ${KNOB / 2}px)`,
                top: (GAUGE_H - TRACK_H) / 2,
                height: TRACK_H,
                borderRadius: TRACK_H / 2,
                background: `linear-gradient(90deg, ${colors.correct}, ${color})`,
                boxShadow: `0 0 28px ${color}`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `calc((100% - ${KNOB}px) * ${drag})`,
                top: (GAUGE_H - KNOB) / 2,
                width: KNOB,
                height: KNOB,
                borderRadius: KNOB / 2,
                background: colors.text,
                border: `10px solid ${color}`,
                boxSizing: 'border-box',
                boxShadow: `0 0 32px ${color}`,
              }}
            />
          </div>
        </div>
        {/* Stage B: the open question and the pinned-comment call to action. */}
        <div style={{ ...fill, opacity: gone, pointerEvents: 'none' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {layout.questionLines.map((q, i) => {
              const p = spring({
                frame: frame - cues.questionStart - i * 8,
                fps,
                config: springs.bouncy,
              });
              return (
                <div
                  key={q.text}
                  style={{
                    opacity: Math.min(1, p * 1.5),
                    transform: `scale(${interpolate(p, [0, 1], [0.6, 1]) * (i === 0 ? drift : 1)})`,
                    fontSize: q.size,
                    fontWeight: 800,
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                    color: i === 0 ? colors.accent : colors.text,
                    textShadow: i === 0 ? glow(colors.accent) : 'none',
                  }}
                >
                  {q.text}
                </div>
              );
            })}
          </div>
          <div
            style={{
              height: layout.ctaHeight * Math.min(1, ctaGrow),
              opacity: Math.min(1, ctaGrow * 1.5),
              overflow: 'visible',
            }}
          >
            <GlassCard
              tone="accent"
              glow={0.6}
              style={{
                height: layout.ctaHeight,
                padding: `${CTA_PAD}px`,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  flex: 'none',
                  transform: `scale(${pinIn}) rotate(${(1 - pinIn) * -50}deg)`,
                }}
              >
                <Pin size={PIN_ICON} color={colors.accent} />
              </span>
              <span
                style={{
                  fontSize: CTA_SIZE,
                  fontWeight: 800,
                  lineHeight: TEXT_LINE,
                  textWrap: 'balance',
                }}
              >
                {props.pinText}
              </span>
            </GlassCard>
          </div>
        </div>
      </div>
      <div
        style={{
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
        }}
      >
        <CodeBlock
          code={props.code}
          language="sql"
          fontSize={layout.codeSize}
          highlightLines={offsetLine >= 0 ? [offsetLine] : []}
          highlightColor={colors.wrong}
          highlightAmount={pulse}
          style={{ borderRadius: 36, textAlign: 'left' }}
        />
      </div>
    </div>
  );
};
