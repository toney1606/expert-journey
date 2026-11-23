export type EndCardTimeline = {
  headlineStart: number;
  sublineStart: number | null;
  ctaStart: number | null;
  loopStart: number | null;
  brandStart: number | null;
};

const FIRST_SHARE = 0.04;
const LAST_SHARE = 0.62;

/** Evenly spaced reveal of the items that exist; the last item starts at 62% so springs settle by ~80%. */
export const endCardTimeline = (
  durationInFrames: number,
  has: { subline: boolean; cta: boolean; loopLine: boolean; brand: boolean },
): EndCardTimeline => {
  const duration = Math.max(1, durationInFrames);
  const order = ['headline', 'subline', 'cta', 'loopLine', 'brand'] as const;
  const present = order.filter((key) => key === 'headline' || has[key]);
  const first = Math.round(duration * FIRST_SHARE);
  const last = Math.round(duration * LAST_SHARE);
  const startOf = (key: (typeof order)[number]): number | null => {
    const slot = present.indexOf(key);
    if (slot === -1) return null;
    return present.length <= 1
      ? first
      : Math.round(first + ((last - first) * slot) / (present.length - 1));
  };
  return {
    headlineStart: startOf('headline') ?? 0,
    sublineStart: startOf('subline'),
    ctaStart: startOf('cta'),
    loopStart: startOf('loopLine'),
    brandStart: startOf('brand'),
  };
};
