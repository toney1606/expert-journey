import { interpolate, useVideoConfig } from 'remotion';
import { CodeBlock } from '../../components/CodeBlock/CodeBlock';
import { useSceneWords } from '../../components/SceneTiming';
import {
  CheckIcon,
  Chip,
  GlassCard,
  Kicker,
  useBounceEnter,
  useDrift,
  useEnter,
} from '../../components/ui/ui';
import type { UiTone } from '../../components/ui/ui';
import { springs } from '../../design/springs';
import { CONTENT_BOX, colors, fontFamily, glow } from '../../design/tokens';
import { spokenFrames } from '../../lib/cues';
import { parseRichText } from '../../lib/rich-text';
import { Pin } from '../PageSlider/Pin';
import {
  BADGE_SIZE,
  FOOTER_ICON,
  FOOTER_PAD,
  FOOTER_SIZE,
  GROUP_GAP,
  HERO_LINE,
  LABEL_GAP,
  LABEL_SIZE,
  MARK_SIZE,
  NUMBER_SIZE,
  ROW_GAP,
  ROW_ICON_GAP,
  ROW_PAD_Y,
  ROW_TEXT_LINE,
  heroCardLayout,
  labelInline,
} from './layout';
import { HeroCardPropsSchema } from './schema';
import type { HeroCardProps, HeroCardRow, HeroCardScene } from './schema';
import { heroCardCues, heroCardPhrases } from './timeline';

const rise = (t: number): React.CSSProperties => ({
  opacity: Math.min(1, t * 1.4),
  transform: `translateY(${interpolate(t, [0, 1], [40, 0])}px)`,
});

const TONE: Record<HeroCardRow['tone'], { ui: UiTone; text: string }> = {
  good: { ui: 'good', text: colors.correct },
  bad: { ui: 'bad', text: colors.wrong },
  neutral: { ui: 'neutral', text: colors.text },
};

const CrossIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={3.4} strokeLinecap="round" />
  </svg>
);

/** Hero line: {accent|..} is yellow with a neon glow (one per screen), {wrong|..} red. */
const HeroLine: React.FC<{ text: string; size: number; start: number }> = ({
  text,
  size,
  start,
}) => {
  const pop = useBounceEnter(start);
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 800,
        lineHeight: HERO_LINE,
        whiteSpace: 'nowrap',
        opacity: Math.min(1, pop * 1.5),
        transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`,
        transformOrigin: 'left center',
      }}
    >
      {parseRichText(text).map((segment, index) => (
        <span
          key={index}
          style={{
            color: segment.color ? colors[segment.color] : colors.text,
            textShadow: segment.color === 'accent' ? glow(colors.accent) : undefined,
          }}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
};

const Row: React.FC<{
  row: HeroCardRow;
  index: number;
  size: number;
  start: number;
  props: HeroCardProps;
}> = ({ row, index, size, start, props }) => {
  const { mono, numbered } = props;
  const enter = useEnter(start);
  const tone = TONE[row.tone];
  return (
    <div style={rise(enter)}>
      <GlassCard
        tone={tone.ui}
        glow={0.3}
        style={{
          borderRadius: 22,
          padding: `${ROW_PAD_Y}px 20px`,
          display: 'flex',
          alignItems: 'center',
          gap: ROW_ICON_GAP,
        }}
      >
        {numbered ? (
          <div
            style={{
              flex: 'none',
              width: NUMBER_SIZE,
              height: NUMBER_SIZE,
              borderRadius: '50%',
              boxSizing: 'border-box',
              border: `3px solid ${tone.text}`,
              color: tone.text,
              fontSize: 40,
              fontWeight: 800,
              lineHeight: `${NUMBER_SIZE - 6}px`,
              textAlign: 'center',
            }}
          >
            {index + 1}
          </div>
        ) : null}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            columnGap: LABEL_GAP,
          }}
        >
          {row.label ? (
            <div
              style={{
                flex: 'none',
                fontSize: LABEL_SIZE,
                fontWeight: 700,
                lineHeight: ROW_TEXT_LINE,
                color: colors.textMuted,
                // A label that does not share a line with its text takes a full line of its own.
                width: labelInline(row, size, props, CONTENT_BOX.width) ? undefined : '100%',
              }}
            >
              {row.label}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: mono ? fontFamily.code : fontFamily.title,
              fontSize: size,
              fontWeight: 700,
              lineHeight: ROW_TEXT_LINE,
              color: tone.text,
            }}
          >
            {row.text}
          </div>
        </div>
        {row.badge ? (
          <Chip tone={row.tone === 'neutral' ? 'accent' : tone.ui} size={BADGE_SIZE} solid>
            {row.badge}
          </Chip>
        ) : row.mark === 'check' ? (
          <CheckIcon size={MARK_SIZE} color={tone.text} />
        ) : row.mark === 'cross' ? (
          <CrossIcon size={MARK_SIZE} color={tone.text} />
        ) : null}
      </GlassCard>
    </div>
  );
};

export const HeroCard: React.FC<{ scene: HeroCardScene }> = ({ scene }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const words = useSceneWords();
  const drift = useDrift(0.03);
  // Idempotent: applies schema defaults even when props arrive unparsed (e.g. remotion still --props).
  const props = HeroCardPropsSchema.parse(scene.props);
  const layout = heroCardLayout(props);
  const cues = heroCardCues(
    props,
    spokenFrames(words, heroCardPhrases(props), fps),
    durationInFrames,
  );
  const codeIn = useEnter(cues.code ?? 0);
  const footerIn = useEnter(cues.footer ?? 0, { ...springs.bouncy, mass: 1 });
  const footerPin = useBounceEnter(cues.footer ?? 0);
  const rows = props.rows ?? [];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: fontFamily.title,
      }}
    >
      {props.kicker ? <Kicker {...props.kicker} tone="neutral" /> : <div style={{ height: 56 }} />}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: GROUP_GAP,
        }}
      >
        <div style={{ transform: `scale(${drift})`, transformOrigin: 'left center' }}>
          {props.hero.map((line, index) => (
            <HeroLine
              key={index}
              text={line.text}
              size={layout.heroSizes[index] ?? layout.heroSizes[0] ?? 0}
              start={cues.hero[index] ?? 0}
            />
          ))}
        </div>
        {props.code ? (
          <div style={rise(codeIn)}>
            <CodeBlock
              code={props.code.text}
              language={props.code.language}
              fontSize={layout.codeSize}
              style={{ borderRadius: 28, textAlign: 'left' }}
            />
          </div>
        ) : null}
        {rows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
            {rows.map((row, index) => (
              <Row
                key={index}
                row={row}
                index={index}
                size={layout.rowSize}
                start={cues.rows[index] ?? 0}
                props={props}
              />
            ))}
          </div>
        ) : null}
        {props.footer ? (
          <div style={rise(footerIn)}>
            <GlassCard
              tone="accent"
              glow={0.6}
              style={{
                padding: FOOTER_PAD,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  flex: 'none',
                  transform: `scale(${footerPin}) rotate(${(1 - footerPin) * -50}deg)`,
                }}
              >
                <Pin size={FOOTER_ICON} color={colors.accent} />
              </span>
              <span
                style={{
                  fontSize: FOOTER_SIZE,
                  fontWeight: 800,
                  lineHeight: ROW_TEXT_LINE,
                  textWrap: 'balance',
                }}
              >
                {props.footer.text}
              </span>
            </GlassCard>
          </div>
        ) : null}
      </div>
    </div>
  );
};
