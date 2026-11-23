/** Single source of truth for visual constants. Catppuccin Mocha palette. */

export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

export const colors = {
  bg: '#1e1e2e',
  card: '#313244',
  text: '#cdd6f4',
  textMuted: '#a6adc8',
  accent: '#f9e2af',
  correct: '#a6e3a1',
  wrong: '#f38ba8',
  diagram: '#89b4fa',
} as const;

/**
 * Margins in px for 1080x1920 that keep content clear of TikTok and Facebook Reels UI (largest of each
 * side). Based on third-party measurements and Meta's ad-safe-zone percentages, NOT official pixel
 * values: tune after checking on real devices. See docs/design-system.md.
 */
export const safeZone = { top: 230, bottom: 560, right: 160, left: 90 } as const;

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
