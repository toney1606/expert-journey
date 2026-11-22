import { colors } from '../../design/tokens';
import type { TokenType } from './tokenize';

/**
 * Extra syntax colors not present in design tokens. Values come from the Catppuccin Mocha palette
 * (the same palette as src/design/tokens.ts): mauve, peach, overlay0, overlay2.
 */
const mocha = {
  mauve: '#cba6f7',
  peach: '#fab387',
  overlay0: '#6c7086',
  overlay2: '#9399b2',
} as const;

export const tokenColors: Record<TokenType, string> = {
  keyword: mocha.mauve,
  string: colors.correct,
  comment: mocha.overlay0,
  number: mocha.peach,
  punctuation: mocha.overlay2,
  identifier: colors.text,
  type: colors.accent,
  plain: colors.text,
};
