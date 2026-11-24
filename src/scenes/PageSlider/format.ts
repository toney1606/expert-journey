import { formatNumber } from '../Stat/format';

/** Page number with Vietnamese dots: 10000 -> "10.000". */
export const formatPage = (page: number): string => formatNumber(Math.round(page));

const msText = (ms: number): string => `${formatNumber(Math.round(ms))} ms`;

/**
 * Latency text under the page number. `fraction` is the slider position (0..1).
 * Both measurements known: the number ticks from first to last. Otherwise the qualitative label switches halfway.
 */
export const latencyText = (
  fraction: number,
  first: { ms?: number | null; label: string },
  last: { ms?: number | null; label: string },
): string => {
  const f = Math.max(0, Math.min(1, fraction));
  if (first.ms != null && last.ms != null) return msText(first.ms + (last.ms - first.ms) * f);
  if (f < 0.5) return first.ms != null ? msText(first.ms) : first.label;
  return last.ms != null ? msText(last.ms) : last.label;
};

/** Page shown at slider position `fraction` (0..1), linear between first and last. */
export const pageAt = (fraction: number, firstPage: number, lastPage: number): number =>
  firstPage + (lastPage - firstPage) * Math.max(0, Math.min(1, fraction));
