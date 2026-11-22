import { CONTENT_BOX } from '../../src/design/tokens';
import { DIAGRAM_BOX, layoutDiagram } from '../../src/scenes/Diagram/layout';
import { MIN_ROW_SIZE, chooseLayout } from '../../src/scenes/Tradeoff/layout';
import { MIN_FONT, SUMMARY_BOX, summaryLayout } from '../../src/scenes/Summary/layout';
import type { QaCheck, QaIssue } from './types';

/** Tradeoff lays itself out in the shared content box. */
const TRADEOFF_BOX = CONTENT_BOX;

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
      } else if (layout.fontSize <= MIN_FONT) {
        issues.push({
          severity: 'warn',
          code: 'layout.summary-tight',
          sceneId: scene.id,
          message: `summary only fits at the smallest font (${layout.fontSize}px); consider shortening text`,
        });
      }
    } else if (scene.type === 'diagram') {
      const { nodes, edges } = scene.props;
      const layout = layoutDiagram(nodes, edges, DIAGRAM_BOX);
      if (!layout.fits) {
        issues.push({
          severity: 'error',
          code: 'layout.diagram-overflow',
          sceneId: scene.id,
          message: `diagram does not fit (${layout.layerCount} layers, ${nodes.length} nodes) even at the smallest sizes; shorten the labels, use fewer layers or nodes per layer, or split it into two diagram scenes`,
        });
      }
    }
  }
  return issues;
};
