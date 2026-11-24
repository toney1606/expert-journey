import { CONTENT_BOX } from '../../design/tokens';
import type { CostRoadsProps } from './schema';

export const COST_ROADS_BOX = CONTENT_BOX;

const CHAR_EM = 0.58;
const CHIP_PAD = 46;
/** The parameter chip's underscores and digits run wider than the average glyph. */
const PARAM_EXTRA = 1.15;
/** Extra height of the engine chip row; it collapses when the formula arrives. */
export const ENGINE_ROW = 70;
export const KICKER_HEIGHT = 56;
export const GAP = 12;
/** Padding of a glass card and width reserved right of each lane for the "×4" multiplier. */
export const CARD_PAD_X = 28;
export const MULT_WIDTH = 200;
export const MULT_SIZE = 150;
export const LANE_LABEL_SIZE = 56;
export const LANE_LABEL_ROW = Math.ceil(LANE_LABEL_SIZE * 1.3);
export const LANE_PAD_Y = 14;
export const CHIP_SIZE = 44;
export const CHIP_PARAM_SIZE = 44;
export const CHIP_ROW = 68;
export const STATS_SIZE = 44;
export const STATS_WIDTH = 430;
export const FORMULA_HEIGHT = 210;
export const BOTTOM_HEIGHT = 230;
const FORMULA_PAD_X = 28;
const BUBBLE_MAX = 150;
const BUBBLE_MIN = 96;

export type CostRoadsLayout = {
  laneLabelSize: number;
  multSize: number;
  chipSize: number;
  chipParamSize: number;
  /** Size of the first formula line ("số dòng NGHĨ là khớp"). */
  formulaRowsSize: number;
  /** Size of the second formula line ("× giá = chi phí"). */
  formulaTailSize: number;
  statsSize: number;
  bubbleSize: number;
  /** Heights of the blocks once every element is on screen. */
  roadsHeight: number;
  formulaHeight: number;
  bottomHeight: number;
  laneHeight: number;
  /** Width of the road strip inside a lane. */
  stripWidth: number;
  statsWidth: number;
  bubbleWidth: number;
  gap: number;
  /** True when every line fits on one line and the stacked blocks leave each lane at least MIN_LANE. */
  fits: boolean;
};

/** Smallest lane (label row + a road strip) that still reads. */
export const MIN_LANE = LANE_LABEL_ROW + 2 * LANE_PAD_Y + 60;

const textWidth = (text: string, size: number): number => text.length * size * CHAR_EM;

/** Text of the first formula line, with the guess word in capitals. */
export const formulaRowsText = (
  p: Pick<CostRoadsProps, 'formulaBefore' | 'guessWord' | 'formulaAfter'>,
): string => `${p.formulaBefore} ${p.guessWord.toLocaleUpperCase('vi')} ${p.formulaAfter}`;

/** Text of the second formula line. */
export const formulaTailText = (p: Pick<CostRoadsProps, 'priceLabel' | 'costLabel'>): string =>
  `× ${p.priceLabel} = ${p.costLabel}`;

/** Text of the parameter chip, e.g. "random_page_cost=4". */
export const paramChipText = (p: Pick<CostRoadsProps, 'engineParam' | 'randomCost'>): string =>
  `${p.engineParam}=${p.randomCost}`;

/** Legend text of one stats bar, e.g. "pending 5%". */
export const statsLine = (label: string, percent: number): string =>
  `${label} ${Number.isInteger(percent) ? percent : String(percent).replace('.', ',')}%`;

type LayoutProps = Pick<
  CostRoadsProps,
  | 'randomLabel'
  | 'seqLabel'
  | 'formulaBefore'
  | 'guessWord'
  | 'formulaAfter'
  | 'priceLabel'
  | 'costLabel'
  | 'pendingLabel'
  | 'pendingPercent'
  | 'doneLabel'
  | 'donePercent'
  | 'engine'
  | 'engineParam'
  | 'randomCost'
>;

/** Stacked blocks (kicker, 2 lanes + chips, formula, bubble + stats) sized to fill the 830x960 box. */
export const costRoadsLayout = (
  p: LayoutProps,
  box: { width: number; height: number } = COST_ROADS_BOX,
): CostRoadsLayout => {
  const stripWidth = box.width - 2 * CARD_PAD_X - MULT_WIDTH - 20;
  const lanesFit =
    textWidth(p.randomLabel, LANE_LABEL_SIZE) <= stripWidth &&
    textWidth(p.seqLabel, LANE_LABEL_SIZE) <= stripWidth;
  const chipsFit =
    textWidth(p.engine, CHIP_SIZE) + 2 * CHIP_PAD <= box.width &&
    textWidth(paramChipText(p), CHIP_PARAM_SIZE) * PARAM_EXTRA + 2 * CHIP_PAD <= box.width;
  const inner = box.width - 2 * FORMULA_PAD_X - 6;
  const rowsText = formulaRowsText(p);
  const tailText = formulaTailText(p);
  let rowsSize = 60;
  while (rowsSize > 56 && textWidth(rowsText, rowsSize) > inner) rowsSize -= 4;
  let tailSize = 80;
  while (tailSize > 56 && textWidth(tailText, tailSize) > inner) tailSize -= 4;
  const formulaFits =
    textWidth(rowsText, rowsSize) <= inner &&
    textWidth(tailText, tailSize) <= inner &&
    Math.ceil(rowsSize * 1.3) + Math.ceil(tailSize * 1.3) + 28 <= FORMULA_HEIGHT;
  const statsInner = STATS_WIDTH - 2 * 24 - 40;
  const statsFit =
    textWidth(statsLine(p.pendingLabel, p.pendingPercent), STATS_SIZE) <= statsInner &&
    textWidth(statsLine(p.doneLabel, p.donePercent), STATS_SIZE) <= statsInner;
  const bubbleWidth = box.width - STATS_WIDTH - 20;
  let bubbleSize = BUBBLE_MAX;
  while (bubbleSize > BUBBLE_MIN && textWidth(p.guessWord, bubbleSize) > bubbleWidth - 56) {
    bubbleSize -= 4;
  }
  const bubbleFits = textWidth(p.guessWord, bubbleSize) <= bubbleWidth - 56;

  const roadsHeight = box.height - KICKER_HEIGHT - FORMULA_HEIGHT - BOTTOM_HEIGHT - 4 * GAP;
  const laneHeight = Math.floor((roadsHeight - CHIP_ROW - 2 * GAP) / 2);
  return {
    laneLabelSize: LANE_LABEL_SIZE,
    multSize: MULT_SIZE,
    chipSize: CHIP_SIZE,
    chipParamSize: CHIP_PARAM_SIZE,
    formulaRowsSize: rowsSize,
    formulaTailSize: tailSize,
    statsSize: STATS_SIZE,
    bubbleSize,
    roadsHeight,
    formulaHeight: FORMULA_HEIGHT,
    bottomHeight: BOTTOM_HEIGHT,
    laneHeight,
    stripWidth,
    statsWidth: STATS_WIDTH,
    bubbleWidth,
    gap: GAP,
    fits: lanesFit && chipsFit && formulaFits && statsFit && bubbleFits && laneHeight >= MIN_LANE,
  };
};
