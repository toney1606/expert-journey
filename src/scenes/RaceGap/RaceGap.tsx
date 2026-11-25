import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CodeBlock } from '../../components/CodeBlock/CodeBlock';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { GlassCard, GlowBlob, Kicker, useDrift } from '../../components/ui/ui';
import { springs } from '../../design/springs';
import { colors, fontFamily, glow } from '../../design/tokens';
import { spokenFrames } from '../../lib/cues';
import { Pin } from '../PageSlider/Pin';
import {
  BAR_H,
  CODE_LINE_HEIGHT,
  CTA_PAD,
  CTA_SIZE,
  GAP,
  HERO_LINE,
  LABEL_LINE,
  LABEL_SIZE,
  MARKER_W,
  PIN_ICON,
  ROW_GAP,
  STRIP_PAD,
  raceGapLayout,
} from './layout';
import { RaceGapPropsSchema } from './schema';
import type { RaceGapScene } from './schema';
import { HERO_LINE_DELAY, raceGapCues, typedChars, typedCode } from './timeline';

const MARKER = 84;
/** Request 1 bar creeps up to this share and never completes. */
const BAR1_MAX = 0.82;
const BAR2_OFFSET = 0.34;

/** A progress bar that is still running: fill grows slowly, a lighter band sweeps over it. */
const RunBar: React.FC<{ progress: number; offset: number; color: string; sweep: number }> = ({
  progress,
  offset,
  color,
  sweep,
}) => (
  <div
    style={{
      position: 'relative',
      height: BAR_H,
      borderRadius: BAR_H / 2,
      background: colors.card,
      border: `2px solid ${colors.border}`,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${offset * 100}%`,
        width: `${Math.max(0, progress) * (1 - offset) * 100}%`,
        borderRadius: BAR_H / 2,
        background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})`,
        boxShadow: `0 0 20px ${color}`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${sweep * 100}%`,
        width: '14%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
        opacity: progress > 0 ? 1 : 0,
      }}
    />
  </div>
);

export const RaceGap: React.FC<{ scene: RaceGapScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const props = RaceGapPropsSchema.parse(scene.props);
  const layout = raceGapLayout(props);
  const words = useSceneWords();
  const cues = raceGapCues(
    spokenFrames(
      words,
      [
        props.heroAt,
        props.codeAt,
        props.gapAt,
        props.request1At,
        props.request2At,
        props.whyAt,
        props.pinAt,
      ],
      fps,
    ),
    durationInFrames,
  );
  const drift = useDrift(0.03);

  const heroIn = (line: number): number =>
    spring({
      frame: frame - cues.hero - line * HERO_LINE_DELAY,
      fps,
      config: { ...springs.bouncy, mass: 1 },
    });
  // Short deterministic shake right after each hero line lands.
  const shake = (line: number): number => {
    const t = frame - cues.hero - line * HERO_LINE_DELAY;
    return t < 0 || t > 12 ? 0 : Math.sin(t * 2.6) * (1 - t / 12) * 8;
  };

  const codeIn = spring({ frame: frame - cues.code, fps, config: springs.snappy });
  const chars = typedChars(props.code, frame, cues.code);
  const lines = props.code.split('\n');
  const typedDone = chars >= props.code.length;
  const caret = !typedDone && chars > 0;

  const gapIn = spring({ frame: frame - cues.gap, fps, config: { ...springs.bouncy, mass: 1 } });
  const whyKick = spring({ frame: frame - cues.why, fps, config: { ...springs.bouncy, mass: 1 } });
  const pulse = 0.5 + 0.5 * Math.sin((frame / 15) * Math.PI);
  const markerScale = gapIn * (1 + 0.1 * pulse + 0.18 * whyKick * (1 - whyKick * 0.5));

  const firstComment = lines.findIndex((l) => l.trimStart().startsWith('--'));
  const gapStart = Math.max(0, (firstComment < 0 ? lines.length - 2 : firstComment) - 1);
  const gapEnd = lines.length - 1;
  const codeFont = layout.codeSize;
  const lineH = codeFont * CODE_LINE_HEIGHT;
  const lineCenter = (i: number): number => 20 + i * lineH + lineH / 2;
  const bracketTop = lineCenter(gapStart);
  const bracketBottom = lineCenter(gapEnd);
  const markerY = (bracketTop + bracketBottom) / 2;

  const r1 = spring({ frame: frame - cues.request1, fps, config: springs.snappy });
  const r2 = spring({ frame: frame - cues.request2, fps, config: springs.snappy });
  const bar1 = Math.min(BAR1_MAX, Math.max(0, (frame - cues.request1) / (durationInFrames * 0.55)));
  const bar2 = Math.min(0.6, Math.max(0, (frame - cues.request2) / (durationInFrames * 0.7)));
  const sweep1 = (((frame - cues.request1) % 45) / 45) * 0.9;
  const sweep2 = (((frame - cues.request2) % 45) / 45) * 0.9;

  const pinSpring = spring({
    frame: frame - cues.pin,
    fps,
    config: { ...springs.bouncy, mass: 1 },
  });
  const ctaGrow = spring({ frame: frame - cues.pin, fps, config: springs.snappy });

  const heroSizes = layout.heroSizes;
  const heroTexts = [props.heroTop, props.heroBottom];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: GAP,
        fontFamily: fontFamily.title,
        textAlign: 'center',
        color: colors.text,
      }}
    >
      <GlowBlob color={colors.accent} opacity={0.2} style={{ top: '12%' }} />
      {props.kicker ? <Kicker {...props.kicker} tone="accent" /> : <div style={{ height: 64 }} />}

      <div style={{ transform: `scale(${drift})`, transformOrigin: 'center top' }}>
        {heroTexts.map((text, i) => {
          const p = heroIn(i);
          return (
            <div
              key={i}
              style={{
                fontSize: heroSizes[i],
                fontWeight: 800,
                lineHeight: HERO_LINE,
                whiteSpace: 'nowrap',
                opacity: Math.min(1, p * 1.6),
                transform: `translateX(${shake(i)}px) scale(${interpolate(p, [0, 1], [0.55, 1])})`,
                textShadow: i === 0 ? glow(colors.accent) : 'none',
              }}
            >
              <RichText text={text} />
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'relative',
          opacity: Math.min(1, codeIn * 1.5),
          transform: `translateY(${interpolate(codeIn, [0, 1], [40, 0])}px)`,
        }}
      >
        <CodeBlock
          code={typedCode(props.code, chars)}
          language="sql"
          fontSize={codeFont}
          style={{
            borderRadius: 36,
            textAlign: 'left',
            paddingRight: MARKER_W,
            borderColor: caret ? colors.diagram : colors.border,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 56,
            top: 0,
            bottom: 0,
            width: MARKER,
            opacity: Math.min(1, gapIn * 1.5),
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: MARKER / 2 - 3,
              width: 6,
              top: bracketTop + 2,
              height: Math.max(0, (bracketBottom - bracketTop) * gapIn),
              borderRadius: 3,
              background: colors.pending,
              boxShadow: `0 0 18px ${colors.pending}`,
              opacity: 0.55,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: markerY - MARKER / 2,
              width: MARKER,
              height: MARKER,
              borderRadius: MARKER / 2,
              background: colors.card,
              border: `5px solid ${colors.pending}`,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fontFamily.title,
              fontWeight: 800,
              fontSize: 56,
              lineHeight: 1,
              color: colors.pending,
              boxShadow: `0 0 ${Math.round(20 + 34 * pulse)}px ${colors.pending}`,
              transform: `scale(${markerScale})`,
            }}
          >
            ?
          </div>
        </div>
      </div>

      <GlassCard
        style={{
          padding: `${STRIP_PAD}px`,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: ROW_GAP * 2,
          height: layout.stripHeight,
          opacity: Math.min(1, r1 * 1.5),
        }}
      >
        <div
          style={{
            opacity: Math.min(1, r1 * 1.5),
            transform: `translateY(${interpolate(r1, [0, 1], [24, 0])}px)`,
          }}
        >
          <div
            style={{
              fontSize: LABEL_SIZE,
              lineHeight: LABEL_LINE,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              marginBottom: ROW_GAP,
            }}
          >
            {props.request1Label}
          </div>
          <RunBar progress={bar1} offset={0} color={colors.pending} sweep={sweep1} />
        </div>
        <div
          style={{
            opacity: Math.min(1, r2 * 1.5),
            transform: `translateX(${interpolate(r2, [0, 1], [320, 0])}px)`,
          }}
        >
          <div
            style={{
              fontSize: LABEL_SIZE,
              lineHeight: LABEL_LINE,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              marginBottom: ROW_GAP,
              paddingLeft: `${BAR2_OFFSET * 100}%`,
            }}
          >
            {props.request2Label}
          </div>
          <RunBar progress={bar2} offset={BAR2_OFFSET} color={colors.diagram} sweep={sweep2} />
        </div>
      </GlassCard>

      <div
        style={{
          height: layout.ctaHeight,
          opacity: Math.min(1, ctaGrow * 1.5),
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
              transform: `scale(${pinSpring}) rotate(${(1 - pinSpring) * -50}deg)`,
            }}
          >
            <Pin size={PIN_ICON} color={colors.accent} />
          </span>
          <span style={{ fontSize: CTA_SIZE, fontWeight: 800, lineHeight: 1.3 }}>
            {props.pinText}
          </span>
        </GlassCard>
      </div>
    </div>
  );
};
