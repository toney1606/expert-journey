import { columnsFor, totalRows, LINE_HEIGHT } from '../../src/scenes/Terminal/timeline';
import type { QaCheck, QaIssue } from './types';

/** Mirrors Terminal.tsx: 850x1350 box, 72px header, 32px body padding. Min font is 28 (not exported). */
export const TERMINAL_INNER_WIDTH = 850 - 2 * 32;
export const TERMINAL_INNER_HEIGHT = 1350 - 72 - 2 * 32;
export const TERMINAL_MIN_FONT = 28;

export const checkTerminal: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  for (const scene of ctx.video.scenes) {
    if (scene.type !== 'terminal') continue;
    const cols = columnsFor(TERMINAL_INNER_WIDTH, TERMINAL_MIN_FONT);
    const rows = totalRows(scene.props.lines, cols);
    if (rows * TERMINAL_MIN_FONT * LINE_HEIGHT > TERMINAL_INNER_HEIGHT) {
      issues.push({
        severity: 'warn',
        code: 'terminal.auto-scroll',
        sceneId: scene.id,
        message: `transcript (${rows} rows) needs auto-scroll at the minimum ${TERMINAL_MIN_FONT}px font; trim lines or output`,
      });
    }
  }
  return issues;
};
