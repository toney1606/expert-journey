import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { spokenFrames } from '../../lib/cues';
import { colors, fontFamily, lineHeight } from '../../design/tokens';
import { springs } from '../../design/springs';
import { decimalsOf, formatNumber } from './format';
import { BAR_GAP, BAR_H, PAD_X, PAD_Y, TITLE_GAP, statLayout } from './layout';
import type { StatLayout } from './layout';
import { barFraction, pickScale } from './scale';
import type { BarScale } from './scale';
import type { StatScene } from './schema';
import { statRowFrames, statTimeline } from './timeline';
import { toneColor } from './tones';

type Item = StatScene['props']['items'][number];

/** Frames the landing glow takes to fade. */
const GLOW_FRAMES = 24;

/** Digits in equal-width slots so the counter never jitters in width while ticking. */
const Slots: React.FC<{ text: string; size: number }> = ({ text, size }) => (
  <span style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}>
    {[...text].map((ch, i) => (
      <span
        key={i}
        style={{
          display: 'inline-block',
          width: `${/\d/.test(ch) ? 0.62 : 0.3}em`,
          textAlign: 'center',
          fontSize: size,
        }}
      >
        {ch}
      </span>
    ))}
  </span>
);

const Row: React.FC<{
  item: Item;
  layout: StatLayout;
  start: number;
  countFrames: number;
  values: readonly number[];
  scale: BarScale;
}> = ({ item, layout, start, countFrames, values, scale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = toneColor[item.tone];

  const enter = spring({ frame: frame - start, fps, config: springs.snappy });
  const count = spring({
    frame: frame - start - 4,
    fps,
    durationInFrames: countFrames,
    config: springs.soft,
  });
  const decimals = decimalsOf(item.value);
  const shown = formatNumber(item.value * count, decimals);
  const landed = start + 4 + countFrames;
  const since = frame - landed;
  const glow = since >= 0 ? Math.max(0, 1 - since / GLOW_FRAMES) : 0;
  const pop = since >= 0 ? 1 + 0.05 * Math.max(0, Math.sin((since / GLOW_FRAMES) * Math.PI)) : 1;
  const fill = barFraction(item.value, values, scale) * count;

  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [48, 0])}px)`,
        background: colors.card,
        border: `2px solid ${color}`,
        borderRadius: 24,
        padding: `${PAD_Y}px ${PAD_X}px`,
        boxShadow: `0 0 ${8 + 36 * glow}px ${color}`,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontFamily: fontFamily.title,
          fontWeight: 600,
          fontSize: layout.labelSize,
          lineHeight: 1.35,
          color: colors.text,
        }}
      >
        <RichText text={item.label} />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 16,
          fontFamily: fontFamily.title,
          fontWeight: 800,
          lineHeight: 1.2,
          color,
          fontVariantNumeric: 'tabular-nums',
          transform: `scale(${pop})`,
          transformOrigin: 'left center',
          textShadow: `0 0 ${28 * glow}px ${color}`,
        }}
      >
        <Slots text={shown} size={layout.numberSize} />
        {item.unit ? (
          <span style={{ fontSize: layout.unitSize, fontWeight: 700, color: colors.text }}>
            {item.unit}
          </span>
        ) : null}
      </div>
      <div
        style={{
          marginTop: BAR_GAP,
          height: BAR_H,
          borderRadius: BAR_H / 2,
          background: colors.bg,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            borderRadius: BAR_H / 2,
            background: color,
            boxShadow: `0 0 ${12 + 16 * glow}px ${color}`,
          }}
        />
      </div>
      {item.caption && layout.showCaptions ? (
        <div
          style={{
            marginTop: 4,
            fontFamily: fontFamily.title,
            fontSize: layout.captionSize,
            lineHeight: 1.35,
            color: colors.textMuted,
          }}
        >
          <RichText text={item.caption} />
        </div>
      ) : null}
    </div>
  );
};

export const Stat: React.FC<{ scene: StatScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { title, items, footnote } = scene.props;

  const layout = statLayout(title, items, footnote);
  const timeline = statTimeline(durationInFrames, items.length);
  const words = useSceneWords();
  const rowStarts = statRowFrames(
    spokenFrames(
      words,
      items.map((item) => item.at),
      fps,
    ),
    durationInFrames,
  );
  const values = items.map((item) => item.value);
  const scale = pickScale(values);
  const titleIn = spring({ frame, fps, config: springs.snappy });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: layout.gap,
      }}
    >
      <div
        style={{
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [32, 0])}px)`,
          fontFamily: fontFamily.title,
          fontWeight: 800,
          fontSize: layout.titleSize,
          lineHeight: lineHeight.title,
          color: colors.accent,
          marginBottom: TITLE_GAP - layout.gap,
        }}
      >
        <RichText text={title} />
      </div>
      {items.map((item, i) => (
        <Row
          key={`${i}-${item.label}`}
          item={item}
          layout={layout}
          start={rowStarts[i] ?? 0}
          countFrames={timeline.countFrames}
          values={values}
          scale={scale}
        />
      ))}
      {footnote ? (
        <div
          style={{
            fontFamily: fontFamily.title,
            fontSize: layout.footnoteSize,
            lineHeight: lineHeight.body,
            color: colors.textMuted,
          }}
        >
          <RichText text={footnote} />
        </div>
      ) : null}
    </div>
  );
};
