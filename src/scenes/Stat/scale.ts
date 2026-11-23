/** Smallest visible bar share for any value > 0, so tiny numbers still show a sliver. */
export const MIN_BAR = 0.07;
/** When max / smallest positive value is above this, bars switch from linear to log scale. */
export const LOG_RATIO = 30;

export type BarScale = 'linear' | 'log';

export const pickScale = (values: readonly number[]): BarScale => {
  const positives = values.filter((v) => v > 0);
  if (positives.length < 2) return 'linear';
  return Math.max(...positives) / Math.min(...positives) > LOG_RATIO ? 'log' : 'linear';
};

/**
 * Bar fill (0..1) of `value` among `values`. Rule: the largest value always fills the bar; zero is empty;
 * every other positive value gets at least MIN_BAR. Linear when values are within LOG_RATIO of each
 * other, otherwise log10(1 + v) so 10.000.000 vs 24 stays readable. Always monotonic: order is preserved.
 */
export const barFraction = (
  value: number,
  values: readonly number[],
  scale: BarScale = pickScale(values),
): number => {
  const max = Math.max(0, ...values);
  if (value <= 0 || max <= 0) return 0;
  const raw = scale === 'log' ? Math.log10(1 + value) / Math.log10(1 + max) : value / max;
  return Math.min(1, Math.max(MIN_BAR, raw));
};
