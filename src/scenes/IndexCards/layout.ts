import { CONTENT_BOX } from '../../design/tokens';
import type { IndexCardsProps } from './schema';

export const INDEXCARDS_BOX = CONTENT_BOX;

/** Size ranges (px): the largest that fits wins, never below the minimum. */
export const MIN_NAME = 120;
export const MIN_USE = 60;
export const MIN_EXAMPLE = 52;
export const MIN_CODE = 46;
const MAX_NAME = 136;
const MAX_USE = 64;
const MAX_EXAMPLE = 56;
const MAX_CODE = 50;
/** Rail chips (the six index types). */
export const CHIP_SIZE = 48;
export const BAR_LABEL_SIZE = 48;
export const BAR_H = 40;

export const KICKER_H = 54;
export const GAP = 16;
export const RAIL_COLS = 2;
export const RAIL_GAP = 10;
export const CHIP_H = Math.ceil(CHIP_SIZE * 1.25) + 6;
export const CARD_PAD = 28;
/** Smallest illustration area (px of height) when nothing else shares it. */
export const STAGE_MIN = 150;
const LH = 1.28;
const NAME_LH = 1.25;
const CODE_LH = 1.45;
const CHAR_EM = 0.6;
const CODE_EM = 0.6;
const WRAP_SLACK = 1.06;
const STEPS = 8;
const BAR_GAP = 14;
const CHIP_PAD_Y = 12;
const CODE_PAD_Y = 40;
const STAGE_GAP = 14;

export type IndexCardsLayout = {
  nameSize: number;
  useSize: number;
  exampleSize: number;
  codeSize: number;
  chipSize: number;
  barLabelSize: number;
  /** Height of the rail of type chips. */
  railHeight: number;
  /** Height left for the active card (the hero). */
  cardHeight: number;
  /** Estimated heights of the collapsible text blocks of the worst-case card. */
  useHeight: number;
  exampleHeight: number;
  /** Worst-case total height of the scene over all cards and phases. */
  height: number;
  /** True when the worst case fits CONTENT_BOX at sizes >= the minimums. */
  fits: boolean;
};

const lines = (text: string, size: number, width: number, em = CHAR_EM): number =>
  Math.max(1, Math.ceil((text.length * size * em * WRAP_SLACK) / width));

export const railRows = (count: number): number => Math.ceil(count / RAIL_COLS);

export const railHeightOf = (count: number): number =>
  railRows(count) * CHIP_H + Math.max(0, railRows(count) - 1) * RAIL_GAP;

/** Inner width of the active card. */
export const CARD_INNER = INDEXCARDS_BOX.width - 2 * CARD_PAD - 6;

type Sizes = Pick<
  IndexCardsLayout,
  'nameSize' | 'useSize' | 'exampleSize' | 'codeSize' | 'barLabelSize'
>;

export const lineUseHeight = (text: string, s: Sizes): number =>
  lines(text, s.useSize, CARD_INNER) * Math.ceil(s.useSize * LH);
export const exampleHeightOf = (text: string, s: Sizes): number =>
  lines(text, s.exampleSize, CARD_INNER - 56) * Math.ceil(s.exampleSize * LH) + 2 * CHIP_PAD_Y;
const nameHeightOf = (text: string, s: Sizes): number =>
  lines(text, s.nameSize, CARD_INNER) * Math.ceil(s.nameSize * NAME_LH);

export const barsHeight = (count: number, s: Pick<Sizes, 'barLabelSize'>): number =>
  count * (Math.ceil(s.barLabelSize * LH) + BAR_H + 6) + Math.max(0, count - 1) * BAR_GAP;

export const codeHeight = (code: string, size: number): number =>
  code.split('\n').reduce((sum, line) => sum + lines(line, size, CARD_INNER - 56, CODE_EM), 0) *
    Math.ceil(size * CODE_LH) +
  CODE_PAD_Y;

/** Smallest card height at which card `index` fits in every phase (text, bars, code). */
const cardNeed = (card: IndexCardsProps['cards'][number], s: Sizes): number => {
  const name = nameHeightOf(card.name, s);
  const use = lineUseHeight(card.use, s);
  const example = exampleHeightOf(card.example, s);
  const base = 2 * CARD_PAD + name + use + 2 * STAGE_GAP;
  const barsNeed = card.extra?.bars?.length ? barsHeight(card.extra.bars.length, s) : 0;
  let need = base + Math.max(STAGE_MIN + example, barsNeed);
  if (card.extra?.code) {
    need = Math.max(
      need,
      2 * CARD_PAD + name + STAGE_GAP + codeHeight(card.extra.code, s.codeSize),
    );
  }
  return need;
};

const lerp = (max: number, min: number, t: number): number => Math.round(max - (max - min) * t);

/** Largest sizes (name 136..120, use 64..60, example 56..52, code 50..46) at which every card fits. */
export const indexCardsLayout = (props: IndexCardsProps): IndexCardsLayout => {
  const { cards } = props;
  const railHeight = railHeightOf(cards.length);
  const cardHeight = INDEXCARDS_BOX.height - KICKER_H - railHeight - 2 * GAP;
  let last: IndexCardsLayout | undefined;
  for (let step = 0; step <= STEPS; step += 1) {
    const t = step / STEPS;
    const s: Sizes = {
      nameSize: lerp(MAX_NAME, MIN_NAME, t),
      useSize: lerp(MAX_USE, MIN_USE, t),
      exampleSize: lerp(MAX_EXAMPLE, MIN_EXAMPLE, t),
      codeSize: lerp(MAX_CODE, MIN_CODE, t),
      barLabelSize: BAR_LABEL_SIZE,
    };
    const need = Math.max(0, ...cards.map((c) => cardNeed(c, s)));
    const first = cards[0];
    last = {
      ...s,
      chipSize: CHIP_SIZE,
      railHeight,
      cardHeight,
      useHeight: Math.max(0, ...cards.map((c) => lineUseHeight(c.use, s))),
      exampleHeight: Math.max(0, ...cards.map((c) => exampleHeightOf(c.example, s))),
      height: KICKER_H + railHeight + 2 * GAP + need,
      fits: need <= cardHeight && first !== undefined,
    };
    if (last.fits) return last;
  }
  return last as IndexCardsLayout;
};
