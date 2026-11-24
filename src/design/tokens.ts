/** Single source of truth for visual constants. Near-black ground, yellow / red / green signals. */

export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

export const colors = {
  bg: '#0A0A0A',
  card: '#141414',
  border: '#262626',
  text: '#FFFFFF',
  textMuted: '#9A9A9A',
  /** Yellow: the one main concept of a screen (glows). Only one accent word per screen. */
  accent: '#FFD60A',
  /** Dim yellow for small labels (step chip). */
  accentMuted: '#B8A030',
  correct: '#3DDC84',
  wrong: '#FF4D3D',
  /** Neutral strokes and structure (light grey; the palette has no blue). */
  diagram: '#D4D4D4',
  /** Orange: pending orders and the word "guess". */
  pending: '#FF8A3D',
} as const;

/** Neon glow for text in `color` (yellow hero word, big numbers). */
export const glow = (color: string): string =>
  `0 0 12px color-mix(in srgb, ${color} 60%, transparent), 0 0 36px color-mix(in srgb, ${color} 40%, transparent), 0 0 80px color-mix(in srgb, ${color} 20%, transparent)`;

/**
 * Margins in px for 1080x1920 that keep content clear of TikTok and Facebook Reels UI (largest of each
 * side). Based on third-party measurements and Meta's ad-safe-zone percentages, NOT official pixel
 * values: tune after checking on real devices. See docs/design-system.md.
 */
export const safeZone = { top: 200, bottom: 420, right: 160, left: 90 } as const;

export type SafeZone = { top: number; bottom: number; right: number; left: number };

/** Height of the caption band pinned to the bottom of the safe box. */
export const CAPTION_BAND_HEIGHT = 170;

/** Size of the safe box (inside the margins). */
export const SAFE_BOX = {
  width: VIDEO.width - safeZone.left - safeZone.right,
  height: VIDEO.height - safeZone.top - safeZone.bottom,
} as const;

/** Area every scene lays itself out in: the safe box minus the caption band. */
export const CONTENT_BOX = {
  width: SAFE_BOX.width,
  height: SAFE_BOX.height - CAPTION_BAND_HEIGHT,
} as const;

export const spacing = { xs: 8, sm: 16, md: 32, lg: 48, xl: 72 } as const;

export const fontFamily = {
  title: '"Be Vietnam Pro", sans-serif',
  code: '"JetBrains Mono", monospace',
} as const;

/** Vietnamese stacked diacritics need generous line height to avoid clipping. */
export const lineHeight = { title: 1.3, body: 1.45 } as const;
