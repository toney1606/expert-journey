import { CONTENT_BOX } from '../../src/design/tokens';
import { DIAGRAM_BOX, DIAGRAM_PATH_BOX, layoutDiagram } from '../../src/scenes/Diagram/layout';
import { MIN_ROW_SIZE, chooseLayout } from '../../src/scenes/Tradeoff/layout';
import { MIN_FONT, SUMMARY_BOX, summaryLayout } from '../../src/scenes/Summary/layout';
import { calloutLayout } from '../../src/scenes/Callout/layout';
import { chooseLayout as chooseCompareLayout } from '../../src/scenes/Compare/layout';
import { endCardLayout } from '../../src/scenes/EndCard/layout';
import { statLayout } from '../../src/scenes/Stat/layout';
import type { QaCheck, QaIssue } from './types';

/** Tradeoff lays itself out in the shared content box. */
const TRADEOFF_BOX = CONTENT_BOX;

const overflow = (sceneId: string, type: string, advice: string): QaIssue => ({
  severity: 'error',
  code: `layout.${type}-overflow`,
  sceneId,
  message: `${type} text does not fit even at the smallest font; ${advice} (shorten or split)`,
});

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
      const layout = layoutDiagram(
        nodes,
        edges,
        scene.props.path === undefined ? DIAGRAM_BOX : DIAGRAM_PATH_BOX,
      );
      if (!layout.fits) {
        issues.push({
          severity: 'error',
          code: 'layout.diagram-overflow',
          sceneId: scene.id,
          message: `diagram does not fit (${layout.layerCount} layers, ${nodes.length} nodes) even at the smallest sizes; shorten the labels, use fewer layers or nodes per layer, or split it into two diagram scenes`,
        });
      }
    } else if (scene.type === 'stat') {
      const { title, items, footnote } = scene.props;
      if (!statLayout(title, items, footnote).fits) {
        issues.push(
          overflow(
            scene.id,
            'stat',
            'shorten the labels or numbers, or split into two stat scenes',
          ),
        );
      }
    } else if (scene.type === 'compare') {
      const { title, left, right, verdict } = scene.props;
      const side = (s: typeof left) => ({
        label: s.label,
        caption: s.caption,
        hasIcon: s.icon !== undefined,
      });
      if (!chooseCompareLayout(title, verdict, [side(left), side(right)], CONTENT_BOX).fits) {
        issues.push(
          overflow(
            scene.id,
            'compare',
            'shorten the labels, captions or verdict, or split the comparison',
          ),
        );
      }
    } else if (scene.type === 'callout') {
      if (!calloutLayout(scene.props.statement, scene.props.explanation).fits) {
        issues.push(
          overflow(
            scene.id,
            'callout',
            'shorten the statement (max 3 lines) or the explanation, or split it',
          ),
        );
      }
    } else if (scene.type === 'endcard') {
      if (!endCardLayout(scene.props).fits) {
        issues.push(
          overflow(scene.id, 'endcard', 'shorten the headline, subline, cta or loop line'),
        );
      }
    }
  }
  return issues;
};
