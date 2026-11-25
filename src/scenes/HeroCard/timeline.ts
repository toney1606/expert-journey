import { resolveCueFrames } from '../../lib/cues';
import type { HeroCardProps } from './schema';

/** Narration phrases of the reveal items, in reveal order: hero lines, code, rows, footer. */
export const heroCardPhrases = (props: HeroCardProps): (string | undefined)[] => [
  ...props.hero.map((line) => line.at),
  ...(props.code ? [props.code.at] : []),
  ...(props.rows ?? []).map((row) => row.at),
  ...(props.footer ? [props.footer.at] : []),
];

const FIRST_SHARE = 0.03;
const LAST_SHARE = 0.8;

/** Fallback frames (derived from the scene length): the items spread evenly from 3% to 80% of the scene. */
export const heroCardTimeline = (durationInFrames: number, count: number): number[] => {
  const d = Math.max(1, durationInFrames);
  const first = Math.round(d * FIRST_SHARE);
  const last = Math.round(d * LAST_SHARE);
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    count <= 1 ? first : Math.round(first + ((last - first) * i) / (count - 1)),
  );
};

export type HeroCardCues = {
  hero: number[];
  /** Undefined when the scene has no code block. */
  code: number | undefined;
  rows: number[];
  footer: number | undefined;
};

/** Resolve spoken frames (same order as `heroCardPhrases`) against the fallback timeline. */
export const heroCardCues = (
  props: HeroCardProps,
  spoken: readonly (number | undefined)[],
  durationInFrames: number,
): HeroCardCues => {
  const heroCount = props.hero.length;
  const rowCount = props.rows?.length ?? 0;
  const count = heroCount + (props.code ? 1 : 0) + rowCount + (props.footer ? 1 : 0);
  const frames = resolveCueFrames(
    spoken,
    heroCardTimeline(durationInFrames, count),
    durationInFrames,
  );
  let at = 0;
  const hero = frames.slice(at, (at += heroCount));
  const code = props.code ? frames[at++] : undefined;
  const rows = frames.slice(at, (at += rowCount));
  const footer = props.footer ? frames[at] : undefined;
  return { hero, code, rows, footer };
};
