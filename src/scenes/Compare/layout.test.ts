import { describe, expect, it } from 'vitest';
import { CONTENT_BOX } from '../../design/tokens';
import {
  MIN_CAPTION_SIZE,
  MIN_LABEL_SIZE,
  MIN_TITLE_SIZE,
  chooseLayout,
  type SideText,
} from './layout';

const side = (label: string, caption?: string, hasIcon = true): SideText => ({
  label,
  caption,
  hasIcon,
});
const BOX = CONTENT_BOX;

describe('chooseLayout', () => {
  it('goes side by side for short labels and captions', () => {
    const l = chooseLayout(
      'Tìm sách',
      undefined,
      [side('Lật trang', 'Chậm'), side('Mục lục', 'Nhanh')],
      BOX,
    );
    expect(l.orientation).toBe('side');
    expect(l.fits).toBe(true);
  });

  it('fits the reel example with a verdict', () => {
    const l = chooseLayout(
      'Index giống cuốn sách',
      'INDEX = mục lục của bảng',
      [
        side('Lật từng trang', '500 trang, 500 lần lật'),
        side('Mở mục lục', 'Nhảy thẳng tới trang cần'),
      ],
      BOX,
    );
    expect(l.fits).toBe(true);
    expect(l.height).toBeLessThanOrEqual(BOX.height);
    expect(l.labelSize).toBeGreaterThanOrEqual(MIN_LABEL_SIZE);
    expect(l.captionSize).toBeGreaterThanOrEqual(MIN_CAPTION_SIZE);
    expect(l.titleSize).toBeGreaterThanOrEqual(MIN_TITLE_SIZE);
  });

  it('fits long Vietnamese labels within limits', () => {
    const l = chooseLayout(
      'Tại sao truy vấn có index lại nhanh hơn',
      'Index = {accent|mục lục} giúp nhảy thẳng tới dòng cần',
      [
        side('Quét toàn bộ bảng từng dòng', 'Dữ liệu càng lớn càng chậm vì phải đọc hết'),
        side('Tra cứu bằng cây B-tree', 'Chỉ vài bước nhảy tới đúng dòng cần'),
      ],
      BOX,
    );
    expect(l.fits).toBe(true);
  });

  it('stacks when a label needs more than 2 lines side by side', () => {
    const l = chooseLayout(
      'Hai cách tìm',
      undefined,
      [
        side('Quét toàn bộ bảng từng dòng một để tìm kiếm', 'Chậm'),
        side('Tra cứu bằng cây B-tree', 'Nhanh'),
      ],
      BOX,
    );
    expect(l.orientation).toBe('stacked');
    expect(l.fits).toBe(true);
  });

  it('reports fits=false when text is far too long', () => {
    const huge = 'rất dài '.repeat(40);
    const l = chooseLayout('T', huge, [side(huge, huge), side(huge, huge)], BOX);
    expect(l.fits).toBe(false);
    expect(l.labelSize).toBe(MIN_LABEL_SIZE);
  });

  it('works without icons or captions', () => {
    const l = chooseLayout(
      'T',
      undefined,
      [side('A', undefined, false), side('B', undefined, false)],
      BOX,
    );
    expect(l.fits).toBe(true);
    expect(l.top).toBeGreaterThan(0);
  });
});
