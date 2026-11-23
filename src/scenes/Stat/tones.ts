import { colors } from '../../design/tokens';
import type { Tone } from '../../schemas/common';

/** Accent colour of a row per tone: good = green, bad = red, neutral = blue. */
export const toneColor: Record<Tone, string> = {
  good: colors.correct,
  bad: colors.wrong,
  neutral: colors.diagram,
};
