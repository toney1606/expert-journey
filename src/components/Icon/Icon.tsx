import type { Icon as IconName } from '../../schemas/common';
import { colors } from '../../design/tokens';

/** SVG path data on a 24-unit grid, stroke only (round caps/joins). One string per path. */
export const ICON_PATHS: Record<IconName, readonly string[]> = {
  book: [
    'M12 6.5C10.2 5 7.5 4.5 4 4.5v13c3.5 0 6.2.5 8 2',
    'M12 6.5C13.8 5 16.5 4.5 20 4.5v13c-3.5 0-6.2.5-8 2',
    'M12 6.5v13',
  ],
  pages: [
    'M8 3.5h8.5l3 3V17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z',
    'M16 3.5v3.5h3.5',
    'M9.5 11h6M9.5 14.5h6',
    'M3.5 8v11a2 2 0 0 0 2 2H15',
  ],
  list: ['M9 6h11M9 12h11M9 18h11', 'M4 6h.01M4 12h.01M4 18h.01'],
  search: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.3 15.3 20 20'],
  database: [
    'M12 3.5c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z',
    'M4 6.5v11c0 1.7 3.6 3 8 3s8-1.3 8-3v-11',
    'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  ],
  server: [
    'M6 4h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    'M6 13h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z',
    'M7.5 7.5h.01M7.5 16.5h.01',
  ],
  tree: [
    'M12 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    'M6 16.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    'M18 16.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    'M12 7.5v4M12 11.5H6v5M12 11.5h6v5',
  ],
  clock: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M12 7.5V12l3 2'],
  bolt: ['M13.5 3 5.5 13.5H12l-1.5 7.5 8-10.5H12z'],
  warning: ['M12 4 2.8 19.5h18.4z', 'M12 10v4.5', 'M12 17.2h.01'],
  check: ['M4.5 12.5l5 5 10-11'],
  cross: ['M6 6l12 12M18 6 6 18'],
  lock: [
    'M7 11h10a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 7 11z',
    'M8 11V8a4 4 0 0 1 8 0v3',
    'M12 14.5v2',
  ],
  cloud: ['M7 18.5a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.5a4.5 4.5 0 0 1 0 9z'],
  code: ['M8.5 7 3.5 12l5 5', 'M15.5 7l5 5-5 5', 'M13.5 5 10.5 19'],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4.5 20c.5-3.8 3.6-6 7.5-6s7 2.2 7.5 6'],
};

/** Stroke icon on a 24-unit grid drawn in a `size` x `size` box. Pure: callers animate a wrapper. */
export const Icon: React.FC<{ name: IconName; size?: number; color?: string }> = ({
  name,
  size = 96,
  color = colors.diagram,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: 'block', overflow: 'visible' }}
  >
    {ICON_PATHS[name].map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);
