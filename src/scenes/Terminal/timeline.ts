export type TerminalLine = { command: string; output?: string };

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

const MIN_FONT = 28;
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

/** Rows a text occupies when hard-wrapped at `cols` characters (break-all). Empty text is one row. */
export const wrappedRows = (text: string, cols: number): number =>
  text
    .split('\n')
    .reduce(
      (sum, row) => sum + Math.max(1, Math.ceil(Array.from(row).length / Math.max(1, cols))),
      0,
    );

export const columnsFor = (innerWidth: number, fontSize: number): number =>
  Math.max(1, Math.floor(innerWidth / (fontSize * CHAR_WIDTH_EM)));

/** Rows of the whole transcript (every command and output shown, plus the trailing prompt). */
export const totalRows = (lines: readonly TerminalLine[], cols: number): number =>
  lines.reduce(
    (sum, line) =>
      sum +
      wrappedRows(PROMPT + line.command, cols) +
      (line.output ? wrappedRows(line.output, cols) : 0),
    0,
  ) + 1;

/**
 * Largest font size in [28, 40] whose full transcript fits `innerHeight`; 28 when none does
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
    const chars = visibleChars(frame, tl, line.command.length);
    rows += wrappedRows(PROMPT + line.command.slice(0, chars), cols);
    if (line.output && frame >= tl.outputStart) rows += wrappedRows(line.output, cols);
  }
  const last = lines.length - 1;
  const lastTl = timeline[last];
  const lastLine = lines[last];
  if (lastTl && lastLine && frame >= (lastLine.output ? lastTl.outputStart : lastTl.typeEnd)) {
    rows += 1;
  }
  return Math.max(1, rows);
};

/** Upward scroll in px so the newest rows stay visible. */
export const scrollOffset = (rows: number, rowHeight: number, innerHeight: number): number =>
  Math.max(0, rows * rowHeight - innerHeight);
