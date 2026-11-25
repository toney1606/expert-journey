import { plainText } from '../../components/RowStrip/layout';
import { CONTENT_BOX } from '../../design/tokens';
import type { IdemKeyProps } from './schema';

export const KICKER_H = 64;
export const GAP = 12;
export const HERO_MAX = 96;
export const HERO_MIN = 64;
export const HERO_LINE = 1.25;
export const HERO_CHAR_EM = 0.62;
export const WIDTH_USE = 0.94;
export const TEXT = 44;
export const TEXT_LINE = 1.3;
export const CODE_CHAR_EM = 0.6;
export const TEXT_CHAR_EM = 0.58;
/** Key chip (two lines) and counter share one band. */
export const CHIP_SIZE = 52;
export const CHIP_PAD_X = 24;
export const CHIP_PAD_Y = 14;
export const BAND_H = Math.ceil(2 * CHIP_SIZE * 1.4 + 2 * CHIP_PAD_Y + 6);
export const COUNTER_NUM = 112;
/** Packet carrying the key along the arrow. */
export const PACKET_SIZE = 40;
export const PACKET_PAD_X = 16;
export const PACKET_H = 68;
export const LANE_PAD = 12;
export const LANE_PAD_X = 22;
export const ROW_GAP = 4;
export const ARROW_ROW_H = 92;
export const CLIENT_W = 170;
export const SERVER_W = 190;
export const LANE_H = LANE_PAD * 2 + 3 * ROW_GAP + ARROW_ROW_H + 3 * Math.ceil(TEXT * TEXT_LINE);

const textWidth = (s: string, size: number, em: number): number => s.length * size * em;

export type IdemKeyLayout = {
  fits: boolean;
  heroSizes: number[];
  heroHeight: number;
  chipWidth: number;
  packetWidth: number;
  laneHeight: number;
  height: number;
};

/** Each hero line as large as fits the width; the second never larger than the first. */
export const heroSizes = (lines: readonly string[]): number[] => {
  const out: number[] = [];
  for (const line of lines) {
    const fit = Math.floor(
      (CONTENT_BOX.width * WIDTH_USE) / (Math.max(1, plainText(line).length) * HERO_CHAR_EM),
    );
    out.push(Math.min(out[out.length - 1] ?? HERO_MAX, HERO_MAX, fit));
  }
  return out;
};

export const idemKeyLayout = (props: IdemKeyProps): IdemKeyLayout => {
  const sizes = heroSizes(props.hero);
  const heroHeight = Math.ceil(sizes.reduce((s, z) => s + z * HERO_LINE, 0));
  const chipWidth =
    Math.max(props.keyLabel.length, props.keyValue.length) * CHIP_SIZE * CODE_CHAR_EM +
    2 * CHIP_PAD_X +
    6;
  const counterWidth = CONTENT_BOX.width - chipWidth - 16;
  const packetWidth = props.keyValue.length * PACKET_SIZE * CODE_CHAR_EM + 2 * PACKET_PAD_X + 6;
  const zone = CONTENT_BOX.width - 2 * LANE_PAD_X - CLIENT_W - SERVER_W;
  const inner = CONTENT_BOX.width - 2 * LANE_PAD_X;
  const { lane1, lane2 } = props;
  const single = (s: string, em: number, size: number = TEXT, width: number = inner): boolean =>
    textWidth(s, size, em) <= width;
  const textFits =
    sizes.every((s) => s >= HERO_MIN) &&
    // Headers: bold title + note on one line; ledger is code; outcome lines are text.
    single(`${lane1.title} → ${lane1.note}`, TEXT_CHAR_EM) &&
    single(`${lane2.title} → ${lane2.note}`, TEXT_CHAR_EM, TEXT, inner - 150) &&
    single(lane1.ledger, CODE_CHAR_EM) &&
    single(lane1.outcome, TEXT_CHAR_EM) &&
    single(lane2.outcome, TEXT_CHAR_EM) &&
    single(lane2.returnText, TEXT_CHAR_EM, TEXT, zone - 60) &&
    single(lane2.stamp, 0.66, 48, CLIENT_W + SERVER_W + 40) &&
    single(props.counterLabel, TEXT_CHAR_EM, TEXT, counterWidth - 24) &&
    packetWidth <= zone + 60 &&
    counterWidth >= 200 &&
    chipWidth <= CONTENT_BOX.width - 200;
  const height = KICKER_H + heroHeight + BAND_H + 2 * LANE_H + 4 * GAP;
  return {
    fits: textFits && height <= CONTENT_BOX.height,
    heroSizes: sizes,
    heroHeight,
    chipWidth,
    packetWidth,
    laneHeight: LANE_H,
    height,
  };
};
