import type { SpringConfig } from 'remotion';

export const springs = {
  /** Quick settle, no overshoot. Default for entrances. */
  snappy: { damping: 22, stiffness: 180, mass: 1 },
  /** Slow, smooth. For backgrounds and large movements. */
  soft: { damping: 200 },
  /** Playful overshoot. Use sparingly. */
  bouncy: { damping: 12, stiffness: 140 },
} satisfies Record<string, Partial<SpringConfig>>;
