import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_BOX } from '../../src/design/tokens';
import { fitFontSize } from '../../src/scenes/CodeDiff/fit';
import type { QaCheck, QaIssue } from './types';

/** CodeDiff.tsx CARD_PAD (not exported there). */
const CODE_CARD_PAD = 20;
/** Same inner width CodeDiff uses: content box minus the card padding on both sides. */
export const CODE_INNER_WIDTH = CONTENT_BOX.width - 2 * CODE_CARD_PAD;
export const CODE_MIN_COMFORT_FONT = 26;

const lines = (text: string): string[] => text.split('\n');

export const checkCode: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  for (const scene of ctx.video.scenes) {
    if (scene.type !== 'code') continue;
    const { testPath, before, after } = scene.props;
    if (!existsSync(join(ctx.root, testPath))) {
      issues.push({
        severity: 'error',
        code: 'code.test-missing',
        sceneId: scene.id,
        message: `testPath "${testPath}" does not exist`,
      });
    }
    // Ask for the unclamped ideal size; the real scene clamps to its own minimum.
    const { fontSize } = fitFontSize([...lines(before), ...lines(after)], CODE_INNER_WIDTH, {
      min: 1,
    });
    if (fontSize < CODE_MIN_COMFORT_FONT) {
      issues.push({
        severity: 'warn',
        code: 'code.line-too-long',
        sceneId: scene.id,
        message: `longest code line needs ${fontSize}px (< ${CODE_MIN_COMFORT_FONT}px); shorten or break the line`,
      });
    }
  }
  return issues;
};
