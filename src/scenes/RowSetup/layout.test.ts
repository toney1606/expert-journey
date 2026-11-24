import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RowSetupSceneSchema } from './schema';
import { rowSetupLayout } from './layout';

const scene = RowSetupSceneSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'content/junior/23112026/database-index-guess/scenes/04-setup.json'),
      'utf8',
    ),
  ),
);

describe('rowSetupLayout', () => {
  it('fits the fragment with big legible text', () => {
    const l = rowSetupLayout(scene.props);
    expect(l.fits).toBe(true);
    expect(l.headlineSize).toBeGreaterThanOrEqual(80);
    expect(l.codeSize).toBeGreaterThanOrEqual(40);
    expect(l.total).toBeLessThanOrEqual(960);
  });
  it('reports overflow instead of hiding it', () => {
    const code = Array.from({ length: 14 }, (_, i) => `SELECT column_${i} FROM orders`).join('\n');
    expect(rowSetupLayout({ ...scene.props, code }).fits).toBe(false);
  });
});
