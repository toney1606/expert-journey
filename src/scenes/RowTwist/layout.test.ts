import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RowTwistSceneSchema } from './schema';
import { rowTwistLayout } from './layout';

const scene = RowTwistSceneSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'content/junior/23112026/database-index-guess/scenes/05-twist.json'),
      'utf8',
    ),
  ),
);

describe('rowTwistLayout', () => {
  it('fits the fragment with big legible text', () => {
    const l = rowTwistLayout(scene.props);
    expect(l.fits).toBe(true);
    expect(l.textSize).toBeGreaterThanOrEqual(44);
    expect(l.statLabelSize).toBeGreaterThanOrEqual(44);
    expect(l.assumptionSize).toBeGreaterThanOrEqual(44);
    expect(l.counterSize).toBeGreaterThanOrEqual(132);
    expect(l.total).toBeLessThanOrEqual(960);
    expect(l.total).toBeGreaterThanOrEqual(800);
  });
  it('reports overflow for very long texts', () => {
    expect(rowTwistLayout({ ...scene.props, beliefText: 'rất dài '.repeat(60) }).fits).toBe(false);
  });
  it('reports overflow for a counter too wide for the box', () => {
    expect(rowTwistLayout({ ...scene.props, skippedCount: 9999999999999 }).fits).toBe(false);
  });
});
