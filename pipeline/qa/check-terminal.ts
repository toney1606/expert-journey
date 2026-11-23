import { CONTENT_BOX } from '../../src/design/tokens';
import {
  LINE_HEIGHT,
  TERMINAL_BODY_PADDING,
  TERMINAL_HEADER_HEIGHT,
  columnsFor,
  pickFontSize,
  totalRows,
} from '../../src/scenes/Terminal/timeline';
import type { QaCheck, QaIssue } from './types';

const HEADER_HEIGHT = TERMINAL_HEADER_HEIGHT;
const BODY_PADDING = TERMINAL_BODY_PADDING;
export const TERMINAL_INNER_WIDTH = CONTENT_BOX.width - 2 * BODY_PADDING;
export const TERMINAL_INNER_HEIGHT = CONTENT_BOX.height - HEADER_HEIGHT - 2 * BODY_PADDING;

export const checkTerminal: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  for (const scene of ctx.video.scenes) {
    if (scene.type !== 'terminal') continue;
    const lines = scene.props.lines;
    // pickFontSize returns the scene's own minimum when nothing fits, so overflow at that size means scrolling.
    const fontSize = pickFontSize(lines, TERMINAL_INNER_WIDTH, TERMINAL_INNER_HEIGHT);
    const rows = totalRows(lines, columnsFor(TERMINAL_INNER_WIDTH, fontSize));
    if (rows * fontSize * LINE_HEIGHT > TERMINAL_INNER_HEIGHT) {
      issues.push({
        severity: 'warn',
        code: 'terminal.auto-scroll',
        sceneId: scene.id,
        message: `transcript (${rows} rows) needs auto-scroll at the minimum ${fontSize}px font; trim lines or output`,
      });
    }
  }
  return issues;
};
