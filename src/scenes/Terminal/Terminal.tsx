import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fontFamily, spacing } from '../../design/tokens';
import type { TerminalScene } from './schema';
import {
  LINE_HEIGHT,
  PROMPT,
  buildTimeline,
  columnsFor,
  cursorVisible,
  pickFontSize,
  rowsAtFrame,
  scrollOffset,
  totalRows,
  visibleChars,
} from './timeline';

const HEADER_HEIGHT = 72;
const BODY_PADDING = spacing.md;
const DOT_SIZE = 22;
/** Safe-zone box is 850px wide; used only to size the text before layout is measured. */
const BOX_WIDTH = 850;
const BOX_HEIGHT = 1350;

const NUMBER_PATTERN = /(\d+(?:[.,]\d+)*)/;

/** Output text with numbers highlighted. */
const HighlightedOutput: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(NUMBER_PATTERN).map((part, index) =>
      index % 2 === 1 ? (
        <span key={index} style={{ color: colors.accent }}>
          {part}
        </span>
      ) : (
        part
      ),
    )}
  </>
);

export const Terminal: React.FC<{ scene: TerminalScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const { lines } = scene.props;

  // The scene root fills the safe-zone box; fall back to its nominal size scaled to the canvas.
  const boxWidth = Math.min(BOX_WIDTH, width);
  const boxHeight = Math.min(BOX_HEIGHT, height);
  const innerWidth = boxWidth - BODY_PADDING * 2;
  const maxInnerHeight = boxHeight - HEADER_HEIGHT - BODY_PADDING * 2;

  const fontSize = pickFontSize(lines, innerWidth, maxInnerHeight);
  const cols = columnsFor(innerWidth, fontSize);
  const rowHeight = fontSize * LINE_HEIGHT;

  const timeline = buildTimeline(lines, durationInFrames, fps);
  const bodyHeight = Math.min(maxInnerHeight, Math.ceil(totalRows(lines, cols) * rowHeight));
  const scroll = scrollOffset(rowsAtFrame(frame, lines, timeline, cols), rowHeight, bodyHeight);

  const lastIndex = lines.length - 1;
  const lastTl = timeline[lastIndex];
  const lastLine = lines[lastIndex];
  const allDone =
    lastTl !== undefined &&
    lastLine !== undefined &&
    frame >= (lastLine.output ? lastTl.outputStart : lastTl.typeEnd);
  const blink = cursorVisible(frame, fps);

  const cursor = (
    <span
      style={{
        display: 'inline-block',
        width: fontSize * 0.55,
        height: fontSize * 1.05,
        verticalAlign: 'text-bottom',
        background: blink ? colors.text : 'transparent',
      }}
    />
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: colors.card,
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: `0 0 0 3px ${colors.bg}`,
        }}
      >
        <div
          style={{
            height: HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: `0 ${BODY_PADDING}px`,
            borderBottom: `3px solid ${colors.bg}`,
            boxSizing: 'border-box',
          }}
        >
          {[colors.wrong, colors.accent, colors.correct].map((dot) => (
            <div
              key={dot}
              style={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE, background: dot }}
            />
          ))}
        </div>
        <div style={{ height: bodyHeight, margin: BODY_PADDING, overflow: 'hidden' }}>
          <div
            style={{
              transform: `translateY(${-scroll}px)`,
              fontFamily: fontFamily.code,
              fontSize,
              lineHeight: LINE_HEIGHT,
              color: colors.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineBreak: 'anywhere',
            }}
          >
            {lines.map((line, index) => {
              const tl = timeline[index];
              if (!tl || frame < tl.typeStart) return null;
              const chars = visibleChars(frame, tl, line.command.length);
              const typing = frame < tl.typeEnd;
              const showOutput = Boolean(line.output) && frame >= tl.outputStart;
              const showCursor = typing || (!showOutput && !allDone && index === lastIndex);
              const fade = interpolate(frame, [tl.outputStart, tl.outputStart + 5], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div key={index}>
                  <div>
                    <span style={{ color: colors.correct, fontWeight: 700 }}>{PROMPT}</span>
                    {line.command.slice(0, chars)}
                    {showCursor ? cursor : null}
                  </div>
                  {showOutput && line.output ? (
                    <div style={{ color: colors.textMuted, opacity: fade }}>
                      <HighlightedOutput text={line.output} />
                    </div>
                  ) : null}
                </div>
              );
            })}
            {allDone ? (
              <div>
                <span style={{ color: colors.correct, fontWeight: 700 }}>{PROMPT}</span>
                {cursor}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
