/** Number of decimals needed to show `value` (max 3, trailing zeros trimmed, Vietnamese style "3,5"). */
export const decimalsOf = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const [, fraction = ''] = value.toFixed(3).split('.');
  return fraction.replace(/0+$/, '').length;
};

/**
 * Vietnamese number format: dot for thousands, comma for decimals.
 * formatNumber(10000000) -> "10.000.000", formatNumber(3.5, 1) -> "3,5".
 * Decimals default to what the number needs (max 3); a counter passes the final value's decimals so the width stays fixed.
 */
export const formatNumber = (value: number, decimals: number = decimalsOf(value)): string => {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const places = Math.max(0, Math.min(6, Math.floor(decimals)));
  const [intPart = '0', fraction] = safe.toFixed(places).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction ? `${grouped},${fraction}` : grouped;
};
