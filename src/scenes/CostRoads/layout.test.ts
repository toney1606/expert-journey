import { describe, expect, it } from 'vitest';
import { CONTENT_BOX } from '../../design/tokens';
import {
  costRoadsLayout,
  formulaRowsText,
  formulaTailText,
  paramChipText,
  statsLine,
} from './layout';

const props = {
  randomLabel: 'Nhảy ngẫu nhiên',
  seqLabel: 'Đọc liền mạch',
  formulaBefore: 'số dòng',
  guessWord: 'nghĩ',
  formulaAfter: 'là khớp',
  priceLabel: 'giá',
  costLabel: 'chi phí',
  pendingLabel: 'pending',
  pendingPercent: 5,
  doneLabel: 'done',
  donePercent: 95,
  engine: 'PostgreSQL',
  engineParam: 'random_page_cost',
  randomCost: 4,
};

describe('costRoadsLayout', () => {
  it('fits the real scene and stacks inside the box', () => {
    const l = costRoadsLayout(props);
    expect(l.fits).toBe(true);
    expect(l.multSize).toBeGreaterThanOrEqual(140);
    expect(l.laneLabelSize).toBeGreaterThanOrEqual(56);
    expect(l.formulaRowsSize).toBeGreaterThanOrEqual(56);
    expect(l.statsSize).toBeGreaterThanOrEqual(44);
    expect(l.chipParamSize).toBeGreaterThanOrEqual(44);
    expect(l.bubbleSize).toBeGreaterThanOrEqual(96);
    const used = 56 + l.roadsHeight + l.formulaHeight + l.bottomHeight + 4 * l.gap;
    expect(used).toBeLessThanOrEqual(CONTENT_BOX.height);
    expect(used).toBeGreaterThanOrEqual(CONTENT_BOX.height * 0.9);
  });
  it('reports overflow instead of hiding it', () => {
    expect(
      costRoadsLayout({ ...props, randomLabel: 'Nhảy ngẫu nhiên rất rất dài dòng' }).fits,
    ).toBe(false);
    expect(costRoadsLayout({ ...props, formulaBefore: 'số dòng '.repeat(8) }).fits).toBe(false);
    expect(costRoadsLayout({ ...props, guessWord: 'nghĩ '.repeat(8) }).fits).toBe(false);
    expect(
      costRoadsLayout({ ...props, engineParam: 'random_page_cost_but_much_longer' }).fits,
    ).toBe(false);
    expect(costRoadsLayout(props, { width: 830, height: 760 }).fits).toBe(false);
  });
  it('builds the formula and stats text', () => {
    expect(formulaRowsText(props)).toBe('số dòng NGHĨ là khớp');
    expect(formulaTailText(props)).toBe('× giá = chi phí');
    expect(paramChipText(props)).toBe('random_page_cost=4');
    expect(statsLine('pending', 5)).toBe('pending 5%');
    expect(statsLine('done', 95.5)).toBe('done 95,5%');
  });
});
