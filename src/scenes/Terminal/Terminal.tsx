import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CONTENT_BOX, colors, fontFamily, spacing } from '../../design/tokens';
import type { TerminalScene } from './schema';
import {
  HANG_INDENT,
  LINE_HEIGHT,
  PROMPT,
  buildTimeline,
  charCount,
  columnsFor,
  commandRows,
  cursorVisible,
  outputRows,
  pickFontSize,
  scrollOffset,
  smoothedRows,
  totalRows,
  typedRowCount,
  visibleChars,
} from './timeline';

const HEADER_HEIGHT = 56;
const BODY_PADDING = spacing.sm + spacing.xs;
const DOT_SIZE = 18;

const NUMBER_PATTERN = /(\d+(?:[.,]\d+)*)/;
const INDENT = ' '.repeat(HANG_INDENT);

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
  const lines = scene.props.lines.map((line) => ({
    command: line.command.normalize('NFC'),
    output: line.output?.normalize('NFC'),
  }));

  // The scene root fills the safe-zone box; fall back to its nominal size scaled to the canvas.
  const boxWidth = Math.min(CONTENT_BOX.width, width);
  const boxHeight = Math.min(CONTENT_BOX.height, height);
  const innerWidth = boxWidth - BODY_PADDING * 2;
  const maxInnerHeight = boxHeight - HEADER_HEIGHT - BODY_PADDING * 2;

  const fontSize = pickFontSize(lines, innerWidth, maxInnerHeight);
  const cols = columnsFor(innerWidth, fontSize);
  const rowHeight = fontSize * LINE_HEIGHT;

  const timeline = buildTimeline(lines, durationInFrames, fps);
  // The window grows with the revealed rows (spring-smoothed) up to the box, then scrolls.
  const rows = smoothedRows(frame, lines, timeline, cols, fps);
  const finalBodyHeight = Math.min(maxInnerHeight, Math.ceil(totalRows(lines, cols) * rowHeight));
  const bodyHeight = Math.min(maxInnerHeight, Math.ceil(rows * rowHeight));
  const scroll = scrollOffset(rows, rowHeight, bodyHeight);
  // Top edge is fixed where the fully grown window would be centred, so it only grows downward.
  const windowHeight = HEADER_HEIGHT + BODY_PADDING * 2 + finalBodyHeight;
  const topOffset = Math.max(0, (boxHeight - windowHeight) / 2);

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

  const rowStyle: React.CSSProperties = {
    height: rowHeight,
    whiteSpace: 'pre',
    overflow: 'hidden',
  };
  const prompt = <span style={{ color: colors.correct, fontWeight: 700 }}>{PROMPT}</span>;

  const renderLine = (index: number): React.ReactNode => {
    const line = lines[index];
    const tl = timeline[index];
    if (!line || !tl || frame < tl.typeStart) return null;
    const chars = visibleChars(frame, tl, charCount(line.command));
    const typing = frame < tl.typeEnd;
    const showOutput = Boolean(line.output) && frame >= tl.outputStart;
    const showCursor = typing || (!showOutput && !allDone && index === lastIndex);
    const fade = interpolate(frame, [tl.outputStart, tl.outputStart + 5], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const cmdRows = commandRows(line.command, cols);
    const shown = typedRowCount(cmdRows, chars);
    return (
      <div key={index}>
        {cmdRows.slice(0, shown).map((row, r) => {
          const text = Array.from(row.text)
            .slice(0, Math.max(0, chars - row.start))
            .join('');
          return (
            <div key={r} style={rowStyle}>
              {r === 0 ? prompt : INDENT}
              {text}
              {showCursor && r === shown - 1 ? cursor : null}
            </div>
          );
        })}
        {showOutput && line.output
          ? outputRows(line.output, cols).map((row, r) => (
              <div key={`o${r}`} style={{ ...rowStyle, color: colors.textMuted, opacity: fade }}>
                <HighlightedOutput text={row.text} />
              </div>
            ))
          : null}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', paddingTop: topOffset, boxSizing: 'border-box' }}>
      <div
        style={{
          background: colors.card,
          borderRadius: 24,
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
            }}
          >
            {lines.map((_, index) => renderLine(index))}
            {allDone ? (
              <div style={rowStyle}>
                {prompt}
                {cursor}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
