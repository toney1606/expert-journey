import { cursorRunFrames } from '../../components/RowStrip/motion';
import { resolveCueFrames } from '../../lib/cues';

/** Frames the cursor must have finished before the scene ends (hold time to read the counter). */
export const SETUP_HOLD = 30;

export type RowSetupCues = { table: number; code: number; pending: number; cursor: number };

/** Fallback start of each element (share of the scene), used when its phrase is not found. */
export const rowSetupFallback = (durationInFrames: number): number[] => {
  const d = Math.max(1, durationInFrames);
  return [0.02, 0.12, 0.3, 0.5].map((share) => Math.round(d * share));
};

/** Start frame of table, code, pending cells and cursor from spoken frames (undefined = not spoken). */
export const rowSetupFrames = (
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): RowSetupCues => {
  const [table = 0, code = 0, pending = 0, cursor = 0] = resolveCueFrames(
    spoken,
    rowSetupFallback(durationInFrames),
    durationInFrames,
  );
  return { table, code, pending, cursor };
};

/** Cursor walk length: ~20% of the scene, shortened so it ends SETUP_HOLD frames before the scene does. */
export const rowSetupRunFrames = (durationInFrames: number, cursorStart: number): number =>
  Math.max(
    12,
    Math.min(
      cursorRunFrames(durationInFrames, 0.2, 45, 120),
      durationInFrames - SETUP_HOLD - cursorStart,
    ),
  );
