/** Colour helpers for the Diagram effects: every colour is derived from the design tokens. */
import { colors } from '../../design/tokens';

const channels = (hex: string): [number, number, number] => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

/** `rgba()` string from a `#rrggbb` token. */
export const withAlpha = (hex: string, alpha: number): string => {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
};

/** Linear mix of two `#rrggbb` colours (t=0 gives `a`, t=1 gives `b`), as `rgb()`. */
export const mixHex = (a: string, b: string, t: number): string => {
  const k = Math.min(1, Math.max(0, t));
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const mix = (x: number, y: number): number => Math.round(x + (y - x) * k);
  return `rgb(${mix(ar, br)}, ${mix(ag, bg)}, ${mix(ab, bb)})`;
};

export const diagramPalette = {
  base: colors.diagram,
  /** Visited nodes, the lit trail and the travelling token. */
  lit: colors.accent,
  /** Halo around the node that matters. */
  emphasis: colors.correct,
  card: colors.card,
} as const;
