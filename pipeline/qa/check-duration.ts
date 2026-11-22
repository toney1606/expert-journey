import { draftSeverity, type QaCheck } from './types';
import { totalSeconds } from './timing';

export const MIN_TOTAL_SEC = 120;
export const MAX_TOTAL_SEC = 240;

export const checkDuration: QaCheck = (ctx) => {
  const total = totalSeconds(ctx);
  if (total >= MIN_TOTAL_SEC && total <= MAX_TOTAL_SEC) return [];
  const source = ctx.manifest ? 'audio' : 'draft';
  return [
    {
      severity: draftSeverity(ctx),
      code: 'duration.out-of-range',
      message: `total length ${total.toFixed(1)}s (${source}) is outside ${MIN_TOTAL_SEC}-${MAX_TOTAL_SEC}s`,
    },
  ];
};
