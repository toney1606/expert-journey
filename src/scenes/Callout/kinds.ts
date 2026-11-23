import { colors } from '../../design/tokens';
import type { CalloutScene } from './schema';

export type CalloutKind = CalloutScene['props']['kind'];

/** Accent colour (a design token) and default kicker per callout kind. */
export const CALLOUT_KIND_STYLE: Record<CalloutKind, { color: string; kicker: string }> = {
  myth: { color: colors.wrong, kicker: 'HIỂU LẦM' },
  fact: { color: colors.diagram, kicker: 'SỰ THẬT' },
  warning: { color: colors.accent, kicker: 'CẢNH BÁO' },
  tip: { color: colors.correct, kicker: 'MẸO' },
};

export const kickerFor = (kind: CalloutKind, kicker?: string): string =>
  kicker && kicker.trim() ? kicker : CALLOUT_KIND_STYLE[kind].kicker;
