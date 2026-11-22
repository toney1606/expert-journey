import { MIN_ROW_SIZE, chooseLayout } from '../../src/scenes/Tradeoff/layout';
import { SUMMARY_BOX, summaryLayout } from '../../src/scenes/Summary/layout';
import type { QaCheck, QaIssue } from './types';

const TRADEOFF_BOX = { width: 850, height: 1350 } as const;
/** Smallest summary font; not exported by the Summary layout helper. */
const SUMMARY_MIN_FONT = 30;

export const checkLayout: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  for (const scene of ctx.video.scenes) {
    if (scene.type === 'tradeoff') {
      const layout = chooseLayout(scene.props.title, scene.props.options, TRADEOFF_BOX);
      if (!layout.fits) {
        issues.push({
          severity: 'error',
          code: 'layout.tradeoff-overflow',
          sceneId: scene.id,
          message:
            'tradeoff text does not fit even at the smallest font; shorten the text (fewer or shorter pros/cons)',
        });
      } else if (layout.rowSize <= MIN_ROW_SIZE) {
        issues.push({
          severity: 'warn',
          code: 'layout.tradeoff-tight',
          sceneId: scene.id,
          message: `tradeoff only fits at the smallest row font (${layout.rowSize}px); consider shortening text`,
        });
      }
    } else if (scene.type === 'summary') {
      const layout = summaryLayout(scene.props.points, scene.props.loopLine, SUMMARY_BOX);
      if (!layout.fits) {
        issues.push({
          severity: 'error',
          code: 'layout.summary-overflow',
          sceneId: scene.id,
          message:
            'summary text does not fit even at the smallest font; shorten the points or loop line',
        });
      } else if (layout.fontSize <= SUMMARY_MIN_FONT) {
        issues.push({
          severity: 'warn',
          code: 'layout.summary-tight',
          sceneId: scene.id,
          message: `summary only fits at the smallest font (${layout.fontSize}px); consider shortening text`,
        });
      }
    }
  }
  return issues;
};
