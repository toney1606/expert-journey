import { MIN_TEXT } from '../../components/ui/ui';
import { CONTENT_BOX } from '../../design/tokens';
import { stripMarkup } from '../../lib/rich-text';
import type { RaceGapProps } from './schema';

export const KICKER_H = 64;
export const GAP = 20;
export const HERO_MAX = 112;
export const HERO_MIN = 64;
export const HERO_LINE = 1.25;
export const HERO_CHAR_EM = 0.62;
export const WIDTH_USE = 0.94;
export const CODE_SIZES = [46, 44, 42, 40] as const;
export const MIN_CODE = 40;
export const CODE_LINE_HEIGHT = 1.45;
const CODE_PAD_Y = 44;
const CODE_PAD_X = 52;
const CODE_CHAR_EM = 0.6;
/** Right strip of the code card kept free for the gap marker. */
export const MARKER_W = 130;
export const LABEL_SIZE = MIN_TEXT;
export const LABEL_LINE = 1.3;
export const LABEL_CHAR_EM = 0.56;
export const BAR_H = 22;
export const ROW_GAP = 8;
export const STRIP_PAD = 24;
export const PIN_ICON = 96;
export const CTA_SIZE = 64;
export const CTA_PAD = 28;
const CTA_CHAR_EM = 0.5;

export type RaceGapLayout = {
  fits: boolean;
  heroSizes: [number, number];
  heroHeight: number;
  codeSize: number;
  codeHeight: number;
  stripHeight: number;
  ctaHeight: number;
  height: number;
};

const heroSize = (text: string): number =>
  Math.min(
    HERO_MAX,
    Math.floor(
      (CONTENT_BOX.width * WIDTH_USE) / (Math.max(1, stripMarkup(text).length) * HERO_CHAR_EM),
    ),
  );

/** Largest code size (>= 40px) for which kicker, hero, code, request strip and footer fit the CONTENT_BOX. */
export const raceGapLayout = (props: RaceGapProps): RaceGapLayout => {
  const s1 = heroSize(props.heroTop);
  const s2 = heroSize(props.heroBottom);
  const heroHeight = (s1 + s2) * HERO_LINE;
  const labelRoom = CONTENT_BOX.width - 2 * STRIP_PAD - 8;
  const labelsFit = [props.request1Label, props.request2Label].every(
    (t) => t.length * LABEL_CHAR_EM * LABEL_SIZE <= labelRoom,
  );
  const stripHeight = 2 * (LABEL_SIZE * LABEL_LINE + ROW_GAP + BAR_H) + ROW_GAP * 2 + 2 * STRIP_PAD;
  const ctaTextWidth = CONTENT_BOX.width - 2 * CTA_PAD - PIN_ICON - 24;
  const ctaLines = Math.ceil((props.pinText.length * CTA_CHAR_EM * CTA_SIZE) / ctaTextWidth);
  const ctaHeight = Math.max(PIN_ICON, ctaLines * CTA_SIZE * 1.3) + 2 * CTA_PAD;
  const lines = props.code.split('\n');
  const longest = Math.max(...lines.map((l) => l.length));
  const stackAt = (size: number): { codeHeight: number; height: number } => {
    const codeHeight = lines.length * size * CODE_LINE_HEIGHT + CODE_PAD_Y;
    return {
      codeHeight,
      height: KICKER_H + heroHeight + codeHeight + stripHeight + ctaHeight + 4 * GAP,
    };
  };
  const chosen = CODE_SIZES.find((s) => stackAt(s).height <= CONTENT_BOX.height) ?? MIN_CODE;
  const { codeHeight, height } = stackAt(chosen);
  const codeWidthFits =
    longest * CODE_CHAR_EM * chosen + CODE_PAD_X + MARKER_W <= CONTENT_BOX.width;
  return {
    fits:
      s1 >= HERO_MIN &&
      s2 >= HERO_MIN &&
      labelsFit &&
      ctaLines <= 2 &&
      codeWidthFits &&
      height <= CONTENT_BOX.height,
    heroSizes: [s1, s2],
    heroHeight,
    codeSize: chosen,
    codeHeight,
    stripHeight,
    ctaHeight,
    height,
  };
};
