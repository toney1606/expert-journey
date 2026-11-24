import { CONTENT_BOX } from '../../design/tokens';
import { formatNumber } from '../Stat/format';
import type { PageTreeProps } from './schema';

export const PAGE_TREE_BOX = CONTENT_BOX;

/** The tree graphic may bleed past the 830px box to the full 1080px frame; text stays in the box. */
export const TREE_BLEED = 125;
export const TREE_WIDTH = PAGE_TREE_BOX.width + 2 * TREE_BLEED;
export const LEVELS = 3;
const MID_COUNT = 3;
const LEAVES_PER_MID = 3;
/** Index of the mid node and of the leaf that the glowing path follows (leaf sits right under its mid). */
export const PATH_MID = 0;
export const PATH_LEAF = PATH_MID * LEAVES_PER_MID + 1;

const DIGIT_EM = 0.62;
const SEP_EM = 0.3;
const CHAR_EM = 0.58;
export const KICKER_HEIGHT = 56;
const GAP = 16;
export const UNIT_SIZE = 56;
export const LEVEL_LABEL_SIZE = 80;
export const POP_SIZE = 76;
export const POP_UNIT_SIZE = 52;
export const HERO_SIZE = 170;
export const HERO_REST_SIZE = 56;
const PAGE_LABEL_SIZES = [64, 60, 56, 52, 48] as const;
const MIN_TOTAL = 112;
const MAX_TOTAL = 140;
const TREE_HEIGHT = 400;
const CARD_HEIGHT = 284;

export type TreeNode = { x: number; y: number; r: number };
export type TreeGeometry = {
  root: TreeNode;
  mids: TreeNode[];
  leaves: TreeNode[];
  /** y of each level row. */
  levelY: [number, number, number];
};

/** Node positions of the 3-level tree inside a `width` x `height` area (centered, nodes large). */
export const treeGeometry = (width: number, height: number): TreeGeometry => {
  const side = 62;
  const span = Math.max(1, width - 2 * side);
  const leafCount = MID_COUNT * LEAVES_PER_MID;
  const levelY: [number, number, number] = [58, height / 2 + 6, height - 44];
  const leaves = Array.from({ length: leafCount }, (_, i) => ({
    x: side + (span * (i + 0.5)) / leafCount,
    y: levelY[2],
    r: 36,
  }));
  const mids = Array.from({ length: MID_COUNT }, (_, m) => {
    const group = leaves.slice(m * LEAVES_PER_MID, (m + 1) * LEAVES_PER_MID);
    return { x: group.reduce((s, l) => s + l.x, 0) / group.length, y: levelY[1], r: 44 };
  });
  const root = { x: width / 2, y: levelY[0], r: 52 };
  return { root, mids, leaves, levelY };
};

export type PageTreeLayout = {
  /** Size of the 27.000.000 counter. */
  totalSize: number;
  unitSize: number;
  pageLabelSize: number;
  levelLabelSize: number;
  treeHeight: number;
  totalRowHeight: number;
  cardHeight: number;
  popSize: number;
  heroSize: number;
  gap: number;
  /** True when every line fits the box on one line and the stacked blocks fit the box height. */
  fits: boolean;
};

export const counterWidth = (value: number, size: number): number =>
  [...formatNumber(value)].reduce((sum, ch) => sum + size * (/\d/.test(ch) ? DIGIT_EM : SEP_EM), 0);

const lineWidth = (text: string, size: number): number => text.length * size * CHAR_EM;

type LayoutProps = Pick<
  PageTreeProps,
  'pageLabel' | 'total' | 'totalUnit' | 'population' | 'populationUnit' | 'readsLabel'
>;

/** Splits "~3 lần đọc" into the hero token ("~3") and the rest ("lần đọc"). */
export const splitReads = (label: string): { hero: string; rest: string } => {
  const m = /^(\S*\d\S*)\s*(.*)$/.exec(label.trim());
  return m ? { hero: m[1] ?? label, rest: m[2] ?? '' } : { hero: label, rest: '' };
};

/** Largest counter (140px down to 112px, step 4) whose number + unit fit the box, then the stacked block height check. */
export const pageTreeLayout = (
  props: LayoutProps,
  box: { width: number; height: number } = PAGE_TREE_BOX,
): PageTreeLayout => {
  const pageLabelSize =
    PAGE_LABEL_SIZES.find((s) => lineWidth(props.pageLabel, s) <= box.width) ?? 48;
  const unitW = (unit: string, size: number): number => 16 + lineWidth(unit, size);
  let totalSize = MAX_TOTAL;
  while (
    totalSize > MIN_TOTAL &&
    counterWidth(props.total, totalSize) + unitW(props.totalUnit, UNIT_SIZE) > box.width
  ) {
    totalSize -= 4;
  }
  const { hero, rest } = splitReads(props.readsLabel);
  const colLeft = counterWidth(props.population, POP_SIZE);
  const colRight = Math.max(lineWidth(hero, HERO_SIZE), lineWidth(rest, HERO_REST_SIZE));
  const widthsFit =
    counterWidth(props.total, totalSize) + unitW(props.totalUnit, UNIT_SIZE) <= box.width &&
    lineWidth(props.pageLabel, pageLabelSize) <= box.width &&
    lineWidth(props.populationUnit, POP_UNIT_SIZE) <= colLeft &&
    colLeft + colRight + 3 * 20 <= box.width;
  const totalRowHeight = Math.ceil(totalSize * 1.2);
  const used = KICKER_HEIGHT + TREE_HEIGHT + totalRowHeight + CARD_HEIGHT + 3 * GAP;
  return {
    totalSize,
    unitSize: UNIT_SIZE,
    pageLabelSize,
    levelLabelSize: LEVEL_LABEL_SIZE,
    treeHeight: TREE_HEIGHT,
    totalRowHeight,
    cardHeight: CARD_HEIGHT,
    popSize: POP_SIZE,
    heroSize: HERO_SIZE,
    gap: GAP,
    fits: widthsFit && used <= box.height,
  };
};

/** Deterministic width share (0.5..0.95) of the i-th tiny row inside the enlarged page. */
export const pageRowShare = (i: number): number => 0.5 + (((i * 53 + 11) % 9) / 8) * 0.45;

/** How many tiny rows fit a page card of `height` px. */
export const pageRowCount = (height: number): number => Math.max(4, Math.floor((height - 48) / 30));
