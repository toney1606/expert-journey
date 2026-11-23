import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ICONS } from '../../schemas/common';
import { Icon, ICON_PATHS } from './Icon';

describe('Icon', () => {
  it.each(ICONS)('renders %s as an svg with at least one path', (name) => {
    const html = renderToStaticMarkup(createElement(Icon, { name, size: 48, color: '#ffffff' }));
    expect(html).toContain('<svg');
    expect(html).toContain('width="48"');
    expect(html).toContain('stroke="#ffffff"');
    expect((html.match(/<path /g) ?? []).length).toBeGreaterThan(0);
  });

  it('has path data for exactly the names in ICONS, all distinct', () => {
    expect(Object.keys(ICON_PATHS).sort()).toEqual([...ICONS].sort());
    const sigs = new Set(ICONS.map((n) => ICON_PATHS[n].join('|')));
    expect(sigs.size).toBe(ICONS.length);
  });

  it('defaults size and color', () => {
    const html = renderToStaticMarkup(createElement(Icon, { name: 'book' }));
    expect(html).toContain('width="96"');
  });
});
