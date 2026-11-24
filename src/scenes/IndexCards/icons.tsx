import { colors } from '../../design/tokens';
import type { CARD_ICONS } from './schema';

export type CardIcon = (typeof CARD_ICONS)[number];

const B = colors.diagram;
const A = colors.accent;
const G = colors.correct;
const P = colors.pending;
const SW = 7;

const common = {
  fill: 'none',
  strokeWidth: SW,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** One motif per index type, drawn in a 220x160 box. */
const Motif: React.FC<{ icon: CardIcon }> = ({ icon }) => {
  switch (icon) {
    case 'tree':
      return (
        <g {...common}>
          <path d="M110 40v22M110 62H46M110 62h64M46 62v18M110 62v18M174 62v18" stroke={B} />
          <rect x="82" y="8" width="56" height="34" rx="10" stroke={A} fill={`${A}33`} />
          <rect x="22" y="80" width="48" height="30" rx="9" stroke={B} fill={`${B}33`} />
          <rect x="86" y="80" width="48" height="30" rx="9" stroke={B} fill={`${B}33`} />
          <rect x="150" y="80" width="48" height="30" rx="9" stroke={B} fill={`${B}33`} />
          <path d="M70 128h16M134 128h16" stroke={G} />
          <rect x="22" y="116" width="48" height="24" rx="8" stroke={G} fill={`${G}22`} />
          <rect x="86" y="116" width="48" height="24" rx="8" stroke={G} fill={`${G}22`} />
          <rect x="150" y="116" width="48" height="24" rx="8" stroke={G} fill={`${G}22`} />
        </g>
      );
    case 'key':
      return (
        <g {...common}>
          <circle cx="62" cy="80" r="40" stroke={A} fill={`${A}26`} />
          <circle cx="62" cy="80" r="13" stroke={A} />
          <path d="M102 80h92M168 80v28M192 80v20" stroke={A} />
        </g>
      );
    case 'columns':
      return (
        <g {...common}>
          <rect x="14" y="24" width="52" height="112" rx="12" stroke={A} fill={`${A}26`} />
          <rect x="84" y="24" width="52" height="112" rx="12" stroke={B} fill={`${B}26`} />
          <rect x="154" y="24" width="52" height="112" rx="12" stroke={B} fill={`${B}1a`} />
          <path d="M40 54v16M40 90v8M110 54v16M110 90v8M180 54v16M180 90v8" stroke={colors.text} />
        </g>
      );
    case 'bag':
      return (
        <g {...common}>
          <path d="M70 52V40a40 40 0 0180 0v12" stroke={B} />
          <path d="M42 52h136l10 88H32z" stroke={B} fill={`${B}26`} />
          <path d="M80 98l22 22 40-44" stroke={G} strokeWidth={11} />
        </g>
      );
    case 'funnel':
      return (
        <g {...common}>
          <path d="M20 22h180L128 84v52l-36 -18V84z" stroke={P} fill={`${P}26`} />
          <circle cx="62" cy="8" r="6" fill={B} stroke="none" />
          <circle cx="110" cy="6" r="6" fill={B} stroke="none" />
          <circle cx="156" cy="8" r="6" fill={B} stroke="none" />
          <circle cx="110" cy="152" r="7" fill={P} stroke="none" />
        </g>
      );
    case 'search':
      return (
        <g {...common}>
          <circle cx="72" cy="68" r="44" stroke={A} fill={`${A}22`} />
          <path d="M104 100l38 38" stroke={A} strokeWidth={14} />
          <path d="M52 56h40M52 72h40M52 88h24" stroke={colors.text} strokeWidth={6} />
          <path d="M150 34h56M150 54h40M164 118h42M180 138h26" stroke={B} strokeWidth={6} />
        </g>
      );
  }
};

export const IconArt: React.FC<{ icon: CardIcon }> = ({ icon }) => (
  <svg
    viewBox="-6 -6 232 172"
    style={{ overflow: 'visible', height: '100%', width: '100%', padding: '16px 0' }}
  >
    <Motif icon={icon} />
  </svg>
);

/** Default motif order, matching the six index types of the lesson. */
export const defaultIcon = (index: number): CardIcon =>
  (['tree', 'key', 'columns', 'bag', 'funnel', 'search'] as const)[index % 6] ?? 'tree';
