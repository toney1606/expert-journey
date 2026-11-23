import { spring } from 'remotion';
import { spacing } from '../../design/tokens';
import { resolveCueFrames } from '../../lib/cues';
import { wrapRows, type WrapRow } from './wrap';

/** Window chrome sizes (shared with pipeline/qa so checks use the same inner area). */
export const TERMINAL_HEADER_HEIGHT = 56;
export const TERMINAL_BODY_PADDING = spacing.sm + spacing.xs;

export type { WrapRow };
export type TerminalLine = { command: string; output?: string; at?: string };

export type LineTimeline = {
  /** Frame at which the first character of the command appears. */
  typeStart: number;
  /** Frame at which the whole command is typed. */
  typeEnd: number;
  /** Frame at which the output appears (equals typeEnd + pause when there is no output). */
  outputStart: number;
};

/** Share of the scene used by typing/output; the rest is a hold at the end. */
export const TIMELINE_FILL = 0.85;
export const MIN_CPS = 22;
export const MAX_CPS = 90;
const LEAD_IN_SEC = 0.3;
const PAUSE_BEFORE_OUTPUT_SEC = 0.3;
const PAUSE_AFTER_OUTPUT_SEC = 0.4;

const MIN_FONT = 24;
const MAX_FONT = 40;
/** JetBrains Mono advance width relative to font size. */
export const CHAR_WIDTH_EM = 0.6;
export const LINE_HEIGHT = 1.45;
export const PROMPT = '$ ';

type Plan = { typing: number[]; pauseBefore: number; pauseAfter: number; lead: number };

const planFor = (
  lines: readonly TerminalLine[],
  fps: number,
  cps: number,
  scale: number,
): Plan => ({
  typing: lines.map((line) => Math.max(1, Math.round(((line.command.length * fps) / cps) * scale))),
  pauseBefore: Math.max(1, Math.round(PAUSE_BEFORE_OUTPUT_SEC * fps * scale)),
  pauseAfter: Math.max(1, Math.round(PAUSE_AFTER_OUTPUT_SEC * fps * scale)),
  lead: Math.round(LEAD_IN_SEC * fps * scale),
});

const planTotal = (plan: Plan): number =>
  plan.lead +
  plan.typing.reduce((sum, t) => sum + t, 0) +
  plan.typing.length * (plan.pauseBefore + plan.pauseAfter);

/**
 * Typing time is proportional to command length. Typing speed rises from MIN_CPS up to MAX_CPS
 * until everything fits in TIMELINE_FILL of the scene; if it still does not fit, all durations
 * are scaled down uniformly.
 */
export const buildTimeline = (
  lines: readonly TerminalLine[],
  totalFrames: number,
  fps: number,
): LineTimeline[] => {
  const budget = Math.max(1, Math.floor(totalFrames * TIMELINE_FILL));
  let plan = planFor(lines, fps, MIN_CPS, 1);
  for (let cps = MIN_CPS; planTotal(plan) > budget && cps <= MAX_CPS; cps += 2) {
    plan = planFor(lines, fps, cps, 1);
  }
  if (planTotal(plan) > budget) {
    plan = planFor(lines, fps, MAX_CPS, budget / planTotal(plan));
  }

  let cursor = plan.lead;
  return lines.map((_, index) => {
    const typeStart = cursor;
    const typeEnd = typeStart + (plan.typing[index] ?? 1);
    const outputStart = typeEnd + plan.pauseBefore;
    cursor = outputStart + plan.pauseAfter;
    return { typeStart, typeEnd, outputStart };
  });
};

/** Number of command characters visible at a frame. */
export const visibleChars = (
  frame: number,
  timeline: LineTimeline,
  commandLength: number,
): number => {
  if (frame < timeline.typeStart) return 0;
  if (frame >= timeline.typeEnd) return commandLength;
  const span = Math.max(1, timeline.typeEnd - timeline.typeStart);
  const typed = Math.floor(((frame - timeline.typeStart + 1) / span) * commandLength);
  return Math.min(commandLength, Math.max(0, typed));
};

/** Blinks twice per second, computed from the frame number. */
export const cursorVisible = (frame: number, fps: number): boolean =>
  Math.floor(frame / Math.max(1, Math.round(fps / 2))) % 2 === 0;

/** Rows a text occupies when word-wrapped at `cols`. Empty text is one row. */
export const wrappedRows = (text: string, cols: number): number => wrapRows(text, cols).length;

export const columnsFor = (innerWidth: number, fontSize: number): number =>
  Math.max(1, Math.floor(innerWidth / (fontSize * CHAR_WIDTH_EM)));

/** Hanging indent of continuation rows of a command (the prompt width). */
export const HANG_INDENT = PROMPT.length;

/**
 * Rows of a command (without prompt) given the full row width. The prompt (row 0) and the 2-col
 * hanging indent (other rows) are drawn by the renderer; one extra column is kept free so the
 * cursor never clips at the row end.
 */
export const commandRows = (command: string, cols: number): WrapRow[] =>
  wrapRows(command, cols - HANG_INDENT - 1);

export const outputRows = (output: string, cols: number): WrapRow[] => wrapRows(output, cols);

/** Number of code points in a string (the unit of `visibleChars` and `WrapRow.start`). */
export const charCount = (text: string): number => Array.from(text).length;

/** Rows of a command showing its first `chars` code points (row 0 is always shown). */
export const typedRowCount = (rows: readonly WrapRow[], chars: number): number =>
  Math.max(1, rows.filter((row) => row.start < chars).length);

/** Rows of the whole transcript (every command and output shown, plus the trailing prompt). */
export const totalRows = (lines: readonly TerminalLine[], cols: number): number =>
  lines.reduce(
    (sum, line) =>
      sum +
      commandRows(line.command, cols).length +
      (line.output ? outputRows(line.output, cols).length : 0),
    0,
  ) + 1;

/**
 * Largest font size in [24, 40] whose full transcript fits `innerHeight`; 24 when none does
 * (the body then auto-scrolls).
 */
export const pickFontSize = (
  lines: readonly TerminalLine[],
  innerWidth: number,
  innerHeight: number,
): number => {
  for (let size = MAX_FONT; size > MIN_FONT; size -= 1) {
    const rows = totalRows(lines, columnsFor(innerWidth, size));
    if (rows * size * LINE_HEIGHT <= innerHeight) return size;
  }
  return MIN_FONT;
};

/** Rows on screen at a frame (typed part of the command, outputs shown, trailing prompt row). */
export const rowsAtFrame = (
  frame: number,
  lines: readonly TerminalLine[],
  timeline: readonly LineTimeline[],
  cols: number,
): number => {
  let rows = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const tl = timeline[i];
    if (!line || !tl || frame < tl.typeStart) break;
    const chars = visibleChars(frame, tl, charCount(line.command));
    rows += typedRowCount(commandRows(line.command, cols), chars);
    if (line.output && frame >= tl.outputStart) rows += outputRows(line.output, cols).length;
  }
  const last = lines.length - 1;
  const lastTl = timeline[last];
  const lastLine = lines[last];
  if (lastTl && lastLine && frame >= (lastLine.output ? lastTl.outputStart : lastTl.typeEnd)) {
    rows += 1;
  }
  return Math.max(1, rows);
};

/** Frames after which a row-count change has fully settled (spring durationInFrames). */
export const ROW_SPRING_FRAMES = 14;

/**
 * Fractional rows on screen at a frame: every change of `rowsAtFrame` is eased in by a spring
 * (superposition of the recent steps), so the window grows smoothly instead of jumping.
 */
export const smoothedRows = (
  frame: number,
  lines: readonly TerminalLine[],
  timeline: readonly LineTimeline[],
  cols: number,
  fps: number,
): number => {
  const from = Math.max(0, frame - ROW_SPRING_FRAMES);
  let value = rowsAtFrame(from, lines, timeline, cols);
  let prev = value;
  for (let f = from + 1; f <= frame; f += 1) {
    const target = rowsAtFrame(f, lines, timeline, cols);
    if (target !== prev) {
      const progress = spring({
        frame: frame - f,
        fps,
        config: { damping: 200 },
        durationInFrames: ROW_SPRING_FRAMES,
      });
      value += (target - prev) * progress;
      prev = target;
    }
  }
  return value;
};

/** Upward scroll in px so the newest rows stay visible. */
export const scrollOffset = (rows: number, rowHeight: number, innerHeight: number): number =>
  Math.max(0, rows * rowHeight - innerHeight);

/** Gap (frames) kept between the start of consecutive cued commands. */
const LINE_CUE_GAP = 4;

/**
 * Overlay narration cues on the automatic timeline: typing of line i starts at `spoken[i]` (frame; undefined =
 * keep the automatic start). Typing keeps its automatic length and the output follows it; when the next command
 * starts too soon, typing and pause are shortened proportionally. Without any cue the timeline is unchanged.
 */
export const applyCues = (
  timeline: readonly LineTimeline[],
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): LineTimeline[] => {
  if (!timeline.some((_, i) => spoken[i] !== undefined)) return [...timeline];
  const last = timeline[timeline.length - 1];
  const reserve = last ? last.outputStart - last.typeStart + 1 : 0;
  // An uncued line that follows a cued one keeps its full typing slot instead of being squeezed against it.
  const chained: (number | undefined)[] = [];
  let prevEnd = -Infinity;
  timeline.forEach((tl, i) => {
    let start = spoken[i];
    if (start === undefined && prevEnd > tl.typeStart) start = prevEnd;
    chained.push(start);
    const slot = tl.outputStart - tl.typeStart + LINE_CUE_GAP;
    prevEnd = (start ?? tl.typeStart) + slot;
  });
  const starts = resolveCueFrames(
    chained,
    timeline.map((tl) => tl.typeStart),
    durationInFrames - reserve,
    LINE_CUE_GAP,
    0,
  );
  return timeline.map((tl, i) => {
    const typeStart = starts[i] ?? tl.typeStart;
    const typing = tl.typeEnd - tl.typeStart;
    const pause = tl.outputStart - tl.typeEnd;
    const next = starts[i + 1];
    const budget = next === undefined ? Infinity : next - typeStart - 1;
    const k = Math.min(1, budget / (typing + pause));
    const typeEnd = typeStart + Math.max(1, Math.round(typing * k));
    return { typeStart, typeEnd, outputStart: typeEnd + Math.max(1, Math.round(pause * k)) };
  });
};
