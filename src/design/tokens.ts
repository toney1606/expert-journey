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

/** Starting values in px for 1080x1920; to be tuned against real TikTok/Reels UI. */
export const safeZone = { top: 150, bottom: 420, right: 170, left: 60 } as const;

export type SafeZone = { top: number; bottom: number; right: number; left: number };

export const spacing = { xs: 8, sm: 16, md: 32, lg: 48, xl: 72 } as const;

export const fontFamily = {
  title: '"Be Vietnam Pro", sans-serif',
  code: '"JetBrains Mono", monospace',
} as const;

/** Vietnamese stacked diacritics need generous line height to avoid clipping. */
export const lineHeight = { title: 1.3, body: 1.45 } as const;
