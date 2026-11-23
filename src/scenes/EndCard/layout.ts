import { CONTENT_BOX } from '../../design/tokens';
import { stripMarkup } from '../../lib/rich-text';
import type { EndCardScene } from './schema';

export const ENDCARD_BOX = CONTENT_BOX;

export type EndCardLayout = {
  headlineFontSize: number;
  sublineFontSize: number;
  ctaFontSize: number;
  loopFontSize: number;
  brandFontSize: number;
  lineHeight: number;
  fits: boolean;
};

export const MAX_HEADLINE = 90;
export const MIN_HEADLINE = 48;
export const BODY_FONT = 40;
export const MIN_BODY = 30;
const BRAND_FONT = 34;
const LINE_HEIGHT = 1.3;
const BODY_LINE_HEIGHT = 1.45;
const HEADLINE_EM = 0.62;
const BODY_EM = 0.58;
const WRAP_SLACK = 1.08;
export const GAP = 32;
export const PILL_PADDING = 26;
export const PILL_PADDING_X = 48;
export const LOOP_PADDING = 26;
export const LOOP_GLYPH_GAP = 22;

const linesFor = (chars: number, width: number, fontSize: number, em: number): number => {
  const perLine = Math.max(1, Math.floor(width / (fontSize * em)));
  return Math.max(1, Math.ceil((chars / perLine) * WRAP_SLACK));
};

type Props = EndCardScene['props'];

const heightFor = (
  headlineSize: number,
  props: Props,
  box: { width: number; height: number },
): number => {
  let height =
    linesFor(stripMarkup(props.headline).length, box.width, headlineSize, HEADLINE_EM) *
    headlineSize *
    LINE_HEIGHT;
  const add = (h: number): void => {
    height += GAP + h;
  };
  if (props.subline) {
    add(
      linesFor(stripMarkup(props.subline).length, box.width, BODY_FONT, BODY_EM) *
        BODY_FONT *
        BODY_LINE_HEIGHT,
    );
  }
  if (props.cta) {
    const w = box.width - 2 * PILL_PADDING_X - 40;
    add(
      linesFor(stripMarkup(props.cta).length, w, BODY_FONT, BODY_EM) *
        BODY_FONT *
        BODY_LINE_HEIGHT +
        2 * PILL_PADDING,
    );
  }
  if (props.loopLine) {
    const w = box.width - 2 * LOOP_PADDING - 4 - BODY_FONT * 1.2 - LOOP_GLYPH_GAP;
    add(
      linesFor(stripMarkup(props.loopLine).length, w, BODY_FONT, BODY_EM) *
        BODY_FONT *
        BODY_LINE_HEIGHT +
        2 * LOOP_PADDING,
    );
  }
  if (props.brand) add(BRAND_FONT * BODY_LINE_HEIGHT);
  return height;
};

/** Pure: largest headline font (MAX..MIN, step 2) at which the whole card fits the box. */
export const endCardLayout = (
  props: Props,
  box: { width: number; height: number } = ENDCARD_BOX,
): EndCardLayout => {
  const make = (headline: number, fits: boolean): EndCardLayout => ({
    headlineFontSize: headline,
    sublineFontSize: BODY_FONT,
    ctaFontSize: BODY_FONT,
    loopFontSize: BODY_FONT,
    brandFontSize: BRAND_FONT,
    lineHeight: LINE_HEIGHT,
    fits,
  });
  for (let size = MAX_HEADLINE; size >= MIN_HEADLINE; size -= 2) {
    if (heightFor(size, props, box) <= box.height) return make(size, true);
  }
  return make(MIN_HEADLINE, false);
};
