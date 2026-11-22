import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fontFamily, lineHeight } from '../../design/tokens';
import { springs } from '../../design/springs';
import {
  CARD_PAD_X,
  CARD_PAD_Y,
  ICON_GAP,
  LINE_HEIGHT,
  NAME_GAP,
  NAME_LINE_HEIGHT,
  ROW_GAP,
  SECTION_GAP,
  TITLE_GAP,
  chooseLayout,
} from './layout';
import { buildTimeline } from './timeline';
import type { TradeoffScene } from './schema';

/** Safe-zone content box the scene is designed for (see safeBox). */
const BOX = { width: 850, height: 1350 } as const;

const CheckIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 12.5 L9.5 18 L20 6.5"
      fill="none"
      stroke={colors.correct}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CrossIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 6 L18 18 M18 6 L6 18"
      fill="none"
      stroke={colors.wrong}
      strokeWidth={3.5}
      strokeLinecap="round"
    />
  </svg>
);

export const Tradeoff: React.FC<{ scene: TradeoffScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { title, options } = scene.props;

  const layout = chooseLayout(title, options, BOX);
  const timeline = buildTimeline(
    durationInFrames,
    options.map((option) => option.pros.length + option.cons.length),
  );

  const enter = (start: number): number =>
    spring({ frame: frame - start, fps, config: springs.snappy });

  const rise = (progress: number, distance: number): React.CSSProperties => ({
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: SECTION_GAP,
        boxSizing: 'border-box',
        paddingTop: layout.top,
      }}
    >
      <div
        style={{
          ...rise(enter(timeline.title), 40),
          fontFamily: fontFamily.title,
          fontWeight: 800,
          fontSize: layout.titleSize,
          lineHeight: lineHeight.title,
          color: colors.text,
          marginBottom: TITLE_GAP - SECTION_GAP,
        }}
      >
        {title}
      </div>
      {options.map((option, optionIndex) => {
        const card = timeline.cards[optionIndex];
        if (!card) return null;
        const rows = [
          ...option.pros.map((text) => ({ text, good: true })),
          ...option.cons.map((text) => ({ text, good: false })),
        ];
        return (
          <div
            key={`${optionIndex}-${option.name}`}
            style={{
              ...rise(enter(card.start), 56),
              background: colors.card,
              borderRadius: 24,
              padding: `${CARD_PAD_Y}px ${CARD_PAD_X}px`,
              display: 'flex',
              flexDirection: 'column',
              gap: ROW_GAP,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontFamily: fontFamily.title,
                fontWeight: 800,
                fontSize: layout.nameSize,
                lineHeight: NAME_LINE_HEIGHT,
                color: colors.accent,
                marginBottom: rows.length > 0 ? NAME_GAP - ROW_GAP : 0,
              }}
            >
              {option.name}
            </div>
            {rows.map((row, rowIndex) => {
              const rowStart = card.rows[rowIndex] ?? card.start;
              return (
                <div
                  key={`${rowIndex}-${row.text}`}
                  style={{
                    ...rise(enter(rowStart), 24),
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: ICON_GAP,
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      height: layout.rowSize * LINE_HEIGHT,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {row.good ? (
                      <CheckIcon size={layout.rowSize} />
                    ) : (
                      <CrossIcon size={layout.rowSize} />
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: fontFamily.title,
                      fontWeight: 400,
                      fontSize: layout.rowSize,
                      lineHeight: LINE_HEIGHT,
                      color: colors.text,
                    }}
                  >
                    {row.text}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
