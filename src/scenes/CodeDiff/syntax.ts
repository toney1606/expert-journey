import { colors } from '../../design/tokens';
import type { TokenType } from './tokenize';

/** Syntax colours follow the channel palette: yellow keywords, red numbers, green strings, white code. */
export const tokenColors: Record<TokenType, string> = {
  keyword: colors.accent,
  string: colors.correct,
  comment: colors.textMuted,
  number: colors.wrong,
  punctuation: colors.text,
  identifier: colors.text,
  type: colors.accent,
  plain: colors.text,
};
