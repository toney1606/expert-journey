import type { QaCheck, QaIssue } from './types';
import { boundaries, totalSeconds } from './timing';

export const REHOOK_TOLERANCE_SEC = 15;
/** [target second, minimum video length for the target to apply] per docs/story-arc.md. */
export const REHOOK_TARGETS: readonly (readonly [number, number])[] = [
  [45, 90],
  [100, 130],
];

export const checkRehook: QaCheck = (ctx) => {
  const total = totalSeconds(ctx);
  const cuts = boundaries(ctx);
  const issues: QaIssue[] = [];
  for (const [target, minTotal] of REHOOK_TARGETS) {
    if (total <= minTotal) continue;
    if (!cuts.some((cut) => Math.abs(cut - target) <= REHOOK_TOLERANCE_SEC)) {
      issues.push({
        severity: 'warn',
        code: 'rehook.missing',
        message: `no scene boundary within ${REHOOK_TOLERANCE_SEC}s of ${target}s for a re-hook`,
      });
    }
  }
  return issues;
};
