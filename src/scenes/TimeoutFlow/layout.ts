import { plainText } from '../../components/RowStrip/layout';
import { CONTENT_BOX } from '../../design/tokens';
import type { TimeoutFlowProps } from './schema';

export const KICKER_H = 64;
export const GAP = 16;
export const HERO_MAX = 96;
export const HERO_MIN = 56;
export const HERO_LINE = 1.25;
export const HERO_CHAR_EM = 0.62;
export const WIDTH_USE = 0.94;
/** Diagram text sizes (px), all >= 44. */
export const LABEL_SIZE = 46;
export const NODE_SIZE = 52;
export const COUNTER_SIZE = 48;
export const CHIP_SIZE = 46;
export const MARKER_D = 64;
export const MARKER_SIZE = 44;
export const CHAR_EM = 0.6;
/** Header row of the diagram (Client / Server boxes + counter). */
export const HEADER_H = 92;
export const MIN_ROW_H = 120;
/** Lifeline x positions inside the 830 wide diagram. */
export const CLIENT_X = 150;
export const SERVER_X = 650;
export const CHIP_ICON = 46;
export const CHIP_PAD = 28;
export const CHIP_GAP = 12;

export type TimeoutFlowLayout = {
  fits: boolean;
  heroSize: number;
  heroHeight: number;
  diagramHeight: number;
  rowHeight: number;
  chipWidths: { charge: number; again: number };
};

const textWidth = (text: string, size: number): number => text.length * CHAR_EM * size;

export const chipWidth = (label: string): number =>
  textWidth(label, CHIP_SIZE) + CHIP_ICON + CHIP_GAP + 2 * CHIP_PAD;

export const timeoutFlowLayout = (props: TimeoutFlowProps): TimeoutFlowLayout => {
  const heroFit = Math.floor(
    (CONTENT_BOX.width * WIDTH_USE) / (Math.max(1, plainText(props.hero).length) * HERO_CHAR_EM),
  );
  const heroSize = Math.min(HERO_MAX, heroFit);
  const heroHeight = heroSize * HERO_LINE;
  const diagramHeight = CONTENT_BOX.height - KICKER_H - heroHeight - 2 * GAP;
  const rowHeight = Math.floor((diagramHeight - HEADER_H) / 6);
  const chipWidths = {
    charge: chipWidth(props.chargeLabel),
    again: chipWidth(props.chargeAgainLabel),
  };
  const arrowSpan = SERVER_X - CLIENT_X;
  const W = CONTENT_BOX.width;
  const counterMax = textWidth(`${props.counterLabel} 2`, COUNTER_SIZE);
  const fits =
    heroSize >= HERO_MIN &&
    rowHeight >= MIN_ROW_H &&
    // Arrow labels sit centred over the arrow and may overhang a bit, never past the box.
    textWidth(props.requestLabel, LABEL_SIZE) <= W - 40 &&
    textWidth(props.retryLabel, LABEL_SIZE) <= W - 40 &&
    textWidth(props.lostLabel, LABEL_SIZE) <= W - 40 &&
    textWidth(props.lostLabel, LABEL_SIZE) <= arrowSpan + 120 &&
    textWidth(props.requestLabel, LABEL_SIZE) <= arrowSpan + 120 &&
    // Timeout label sits right of the clock ring.
    CLIENT_X + 80 + textWidth(props.timeoutLabel, LABEL_SIZE) <= W &&
    // Chips are right-aligned to the box edge and must not reach the client lifeline.
    Math.max(chipWidths.charge, chipWidths.again) <= W - CLIENT_X - 60 &&
    // Counter sits between the Client and Server boxes.
    counterMax + 20 <= SERVER_X - 100 - (CLIENT_X + 100) &&
    textWidth(props.clientLabel, NODE_SIZE) <= 2 * CLIENT_X - 40 &&
    textWidth(props.serverLabel, NODE_SIZE) <= 2 * (W - SERVER_X) - 20;
  return { fits, heroSize, heroHeight, diagramHeight, rowHeight, chipWidths };
};
