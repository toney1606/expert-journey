import { colors } from '../../design/tokens';
import type { Tone } from '../../schemas/common';

/** Accent colour per tone: good = green, bad = red, neutral = blue. */
export const toneColor: Record<Tone, string> = {
  good: colors.correct,
  bad: colors.wrong,
  neutral: colors.diagram,
};

/** Hex alpha suffixes (00-ff) appended to a token colour. */
export const alpha = { faint: '1f', soft: '33', glow: '66' } as const;
