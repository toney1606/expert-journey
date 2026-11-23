/** Pure, deterministic motion helpers for the backdrop (no randomness, driven by the frame only). */

export type BlobSpec = {
  /** Centre as a fraction of the frame, before drift. */
  cx: number;
  cy: number;
  /** Radius in px. */
  radius: number;
  /** Drift amplitude in px and period in frames. */
  ampX: number;
  ampY: number;
  periodX: number;
  periodY: number;
  phase: number;
  opacity: number;
};

export const BLOBS: readonly [BlobSpec, BlobSpec, BlobSpec] = [
  {
    cx: 0.2,
    cy: 0.18,
    radius: 760,
    ampX: 140,
    ampY: 120,
    periodX: 420,
    periodY: 540,
    phase: 0,
    opacity: 0.55,
  },
  {
    cx: 0.85,
    cy: 0.55,
    radius: 820,
    ampX: 120,
    ampY: 160,
    periodX: 510,
    periodY: 380,
    phase: 2.1,
    opacity: 0.45,
  },
  {
    cx: 0.35,
    cy: 0.92,
    radius: 700,
    ampX: 160,
    ampY: 100,
    periodX: 470,
    periodY: 600,
    phase: 4.2,
    opacity: 0.5,
  },
];

export const blobCenter = (
  spec: BlobSpec,
  frame: number,
  width: number,
  height: number,
): { x: number; y: number } => ({
  x: spec.cx * width + Math.sin((frame / spec.periodX) * Math.PI * 2 + spec.phase) * spec.ampX,
  y: spec.cy * height + Math.cos((frame / spec.periodY) * Math.PI * 2 + spec.phase) * spec.ampY,
});

export type Particle = { x: number; y: number; size: number; opacity: number };

const PARTICLE_COUNT = 16;

/** Slow upward-floating dots; positions are a pure function of the frame. */
export const particleAt = (
  index: number,
  frame: number,
  width: number,
  height: number,
): Particle => {
  const seed = (index + 1) * 12.9898;
  const unit = (n: number): number => {
    const v = Math.sin(seed * n) * 43758.5453;
    return v - Math.floor(v);
  };
  const speed = 0.35 + unit(2) * 0.6;
  const travel = height + 120;
  const y = height + 60 - ((unit(3) * travel + frame * speed) % travel);
  const x = unit(1) * width + Math.sin(frame / (90 + unit(4) * 80) + seed) * 24;
  const twinkle = 0.5 + 0.5 * Math.sin(frame / 40 + seed);
  return { x, y, size: 3 + unit(5) * 4, opacity: 0.12 + twinkle * 0.28 };
};

export const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => i);

/** Grid cell size and vertical scroll offset (px) at a frame. */
export const GRID_SIZE = 90;
export const gridOffset = (frame: number): number => (frame * 0.25) % GRID_SIZE;
