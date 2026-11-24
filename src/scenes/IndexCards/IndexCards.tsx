import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CodeBlock } from '../../components/CodeBlock/CodeBlock';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { CheckIcon, GlassCard, Kicker, useDrift, useEnter } from '../../components/ui/ui';
import { spokenFrames } from '../../lib/cues';
import { colors, fontFamily } from '../../design/tokens';
import { springs } from '../../design/springs';
import {
  BAR_H,
  CARD_PAD,
  CHIP_H,
  GAP,
  RAIL_COLS,
  RAIL_GAP,
  STAGE_MIN,
  indexCardsLayout,
  lineUseHeight,
} from './layout';
import type { IndexCardsLayout } from './layout';
import { IconArt, defaultIcon } from './icons';
import type { IndexCardsScene } from './schema';
import { activeCardIndex, extraFrames, indexCardFrames } from './timeline';

type Card = IndexCardsScene['props']['cards'][number];

const barColor = {
  diagram: colors.diagram,
  pending: colors.pending,
  correct: colors.correct,
  wrong: colors.wrong,
};

/** One chip of the progress rail: dim = not yet, lit = being spoken, checked = done. */
const RailChip: React.FC<{
  name: string;
  size: number;
  state: 'todo' | 'active' | 'done';
  index: number;
  litAt: number;
}> = ({ name, size, state, index, litAt }) => {
  const enter = useEnter(index * 4, { ...springs.bouncy, mass: 1 });
  const pop = useEnter(litAt, { ...springs.bouncy, mass: 1 });
  const lit = state === 'active';
  const done = state === 'done';
  const scale = lit ? interpolate(pop, [0, 1], [0.92, 1.04]) : 1;
  return (
    <div
      style={{
        height: CHIP_H,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 22px',
        borderRadius: 36,
        opacity: Math.min(1, enter),
        transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px) scale(${scale})`,
        background: lit
          ? `color-mix(in srgb, ${colors.accent} 20%, ${colors.bg})`
          : done
            ? `color-mix(in srgb, ${colors.correct} 10%, ${colors.card})`
            : `color-mix(in srgb, ${colors.card} 55%, transparent)`,
        border: `3px solid ${
          lit
            ? colors.accent
            : done
              ? `color-mix(in srgb, ${colors.correct} 55%, transparent)`
              : `color-mix(in srgb, ${colors.card} 90%, transparent)`
        }`,
        boxShadow: lit ? `0 0 34px ${colors.accent}66` : 'none',
        fontFamily: fontFamily.title,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.25,
        color: lit ? colors.accent : done ? colors.text : colors.textMuted,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ flex: 1, opacity: lit || done ? 1 : 0.7 }}>{name}</span>
      {done ? <CheckIcon size={size - 6} /> : null}
    </div>
  );
};

type Bar = NonNullable<NonNullable<Card['extra']>['bars']>[number];

const BarRow: React.FC<{ bar: Bar; start: number }> = ({ bar, start }) => {
  const grow = useEnter(start, { ...springs.soft, stiffness: 100, mass: 1 });
  const color = barColor[bar.tone];
  return (
    <div>
      <div
        style={{
          fontFamily: fontFamily.title,
          fontWeight: 800,
          fontSize: 48,
          lineHeight: 1.28,
          color: colors.text,
        }}
      >
        <RichText text={bar.label} />
      </div>
      <div style={{ height: BAR_H, borderRadius: BAR_H / 2, background: colors.card }}>
        <div
          style={{
            width: `${Math.max(bar.fraction * 100 * grow, grow > 0.02 ? 2.5 : 0)}%`,
            height: '100%',
            borderRadius: BAR_H / 2,
            background: `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, ${colors.bg}), ${color})`,
            boxShadow: `0 0 22px ${color}99`,
          }}
        />
      </div>
    </div>
  );
};

const Stage: React.FC<{
  card: Card;
  iconKey: ReturnType<typeof defaultIcon>;
  layout: IndexCardsLayout;
  start: number;
  barsFrame: number;
  codeFrame: number;
}> = ({ card, iconKey, layout, start, barsFrame, codeFrame }) => {
  const barsIn = useEnter(barsFrame, springs.snappy);
  const codeIn = useEnter(codeFrame, springs.snappy);
  const iconIn = useEnter(start + 8, { ...springs.bouncy, mass: 1 });
  const chipIn = useEnter(start + 14, { ...springs.bouncy, mass: 1 });
  const extra = card.extra;
  const hasBars = Boolean(extra?.bars?.length);
  const hasCode = Boolean(extra?.code);
  const toBars = hasBars ? barsIn : 0;
  const toCode = hasCode ? codeIn : 0;
  const iconVisible = Math.max(0, 1 - Math.max(toBars, toCode));
  const barsVisible = Math.max(0, toBars - toCode);
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: STAGE_MIN }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 28,
          background: `radial-gradient(ellipse at 50% 55%, ${colors.diagram}2e, ${colors.diagram}0a 70%)`,
          border: `2px solid ${colors.diagram}33`,
          opacity: iconVisible,
          transform: `scale(${interpolate(iconIn, [0, 1], [0.7, 1])})`,
        }}
      >
        <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
          <IconArt icon={iconKey} />
        </div>
        <div
          style={{
            padding: '10px 30px',
            margin: '0 0 22px',
            borderRadius: 999,
            background: `color-mix(in srgb, ${colors.diagram} 16%, ${colors.bg})`,
            border: `3px solid ${colors.diagram}`,
            fontWeight: 800,
            fontSize: layout.exampleSize,
            lineHeight: 1.28,
            color: colors.diagram,
            textAlign: 'center',
            opacity: Math.min(1, chipIn),
            transform: `scale(${interpolate(chipIn, [0, 1], [0.7, 1])})`,
          }}
        >
          <RichText text={card.example} />
        </div>
      </div>
      {hasBars ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 14,
            opacity: barsVisible,
          }}
        >
          {extra?.bars?.map((bar, i) => (
            <BarRow key={i} bar={bar} start={barsFrame + i * 8} />
          ))}
        </div>
      ) : null}
      {hasCode && extra?.code ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            opacity: toCode,
            transform: `translateY(${interpolate(toCode, [0, 1], [40, 0])}px)`,
          }}
        >
          <CodeBlock
            code={extra.code}
            language={extra.language}
            fontSize={layout.codeSize}
            style={{ width: '100%', borderRadius: 28, padding: '20px 28px' }}
          />
        </div>
      ) : null}
    </div>
  );
};

const ActiveCard: React.FC<{
  card: Card;
  index: number;
  layout: IndexCardsLayout;
  start: number;
  end: number;
  spokenBars: number | undefined;
  spokenCode: number | undefined;
}> = ({ card, index, layout, start, end, spokenBars, spokenCode }) => {
  const frame = useCurrentFrame();
  const drift = useDrift(0.03);
  const enter = useEnter(start, { ...springs.bouncy, mass: 1 });
  const nameIn = useEnter(start + 3, { ...springs.bouncy, mass: 1 });
  const useIn = useEnter(start + 8, springs.snappy);
  const when = extraFrames(start, end, spokenBars, spokenCode);
  const hasCode = Boolean(card.extra?.code);
  const codeIn = useEnter(when.code, springs.snappy);
  const collapse = hasCode ? Math.min(1, Math.max(0, codeIn)) : 0;
  const keep = 1 - collapse;
  const beat = interpolate(frame - start, [0, 6, 14], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const useH = lineUseHeight(card.use, layout);
  return (
    <GlassCard
      tone="accent"
      glow={0.5 + 0.35 * beat}
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: CARD_PAD,
        opacity: Math.min(1, enter * 1.4),
        transform: `translateX(${interpolate(enter, [0, 1], [110, 0])}px) scale(${drift})`,
        transformOrigin: '50% 40%',
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: layout.nameSize,
          lineHeight: 1.25,
          color: colors.accent,
          textShadow: `0 0 ${20 + 30 * beat}px ${colors.accent}66`,
          opacity: Math.min(1, nameIn * 1.4),
          transform: `scale(${interpolate(nameIn, [0, 1], [0.8, 1])})`,
          transformOrigin: '0% 50%',
        }}
      >
        <RichText text={card.name} />
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: layout.useSize,
          lineHeight: 1.28,
          color: colors.text,
          opacity: Math.min(1, useIn) * keep,
          maxHeight: collapse > 0 ? (useH + 8) * keep : undefined,
          overflow: collapse > 0 ? 'hidden' : undefined,
          transform: `translateY(${interpolate(useIn, [0, 1], [24, 0])}px)`,
        }}
      >
        <RichText text={card.use} />
      </div>
      <Stage
        card={card}
        iconKey={card.icon ?? defaultIcon(index)}
        layout={layout}
        start={start}
        barsFrame={when.bars}
        codeFrame={when.code}
      />
    </GlassCard>
  );
};

export const IndexCards: React.FC<{ scene: IndexCardsScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { cards, kicker } = scene.props;
  const layout = indexCardsLayout(scene.props);
  const words = useSceneWords();
  const starts = indexCardFrames(
    spokenFrames(
      words,
      cards.map((c) => c.at),
      fps,
    ),
    durationInFrames,
  );
  const active = Math.max(0, activeCardIndex(frame, starts));
  const card = cards[active];
  if (!card) return null;
  const end = starts[active + 1] ?? durationInFrames;
  const [spokenBars, spokenCode] = spokenFrames(
    words,
    [card.extra?.barsAt, card.extra?.codeAt],
    fps,
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: GAP,
      }}
    >
      {kicker ? <Kicker {...kicker} /> : null}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${Math.ceil(cards.length / RAIL_COLS)}, ${CHIP_H}px)`,
          gridAutoFlow: 'column',
          gridAutoColumns: '1fr',
          gap: RAIL_GAP,
        }}
      >
        {cards.map((c, i) => (
          <RailChip
            key={i}
            name={c.name}
            size={layout.chipSize}
            index={i}
            litAt={starts[i] ?? 0}
            state={i === active ? 'active' : i < active ? 'done' : 'todo'}
          />
        ))}
      </div>
      <ActiveCard
        key={active}
        card={card}
        index={active}
        layout={layout}
        start={starts[active] ?? 0}
        end={end}
        spokenBars={spokenBars}
        spokenCode={spokenCode}
      />
    </div>
  );
};
