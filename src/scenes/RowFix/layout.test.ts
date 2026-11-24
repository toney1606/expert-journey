import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_BOX } from '../../design/tokens';
import { RowFixSceneSchema } from './schema';
import { rowFixLayout } from './layout';

const scene = RowFixSceneSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'content/junior/23112026/database-index-guess/scenes/06-fix.json'),
      'utf8',
    ),
  ),
);

describe('rowFixLayout', () => {
  it('fits all three steps with big legible text', () => {
    const l = rowFixLayout(scene.props);
    expect(l.fits).toBe(true);
    expect(l.codeSize).toBeGreaterThanOrEqual(46);
    expect(l.counterSize).toBeGreaterThanOrEqual(124);
    expect(l.resultSize).toBeGreaterThanOrEqual(168);
    for (const h of [l.step1Height, l.step2Height, l.step3Height]) {
      expect(h).toBeLessThanOrEqual(CONTENT_BOX.height - 64 - 16);
      expect(h).toBeGreaterThanOrEqual(680);
    }
  });
  it('reports overflow instead of hiding it', () => {
    const explainCode = Array.from(
      { length: 16 },
      (_, i) => `node ${i} using idx_some_long_name`,
    ).join('\n');
    expect(rowFixLayout({ ...scene.props, explainCode }).fits).toBe(false);
  });
  it('reports a result text that is too wide', () => {
    expect(rowFixLayout({ ...scene.props, resultText: '10 dòng đọc được' }).fits).toBe(false);
  });
});
