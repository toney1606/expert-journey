import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/**
 * "How the planner prices two roads": random jumps (cost x4) versus sequential reading (x1), the formula
 * rows-it-THINKS-match x price = cost, a statistics card and the glowing word "nghĩ" (guess).
 */
export const CostRoadsPropsSchema = z.strictObject({
  /** Top chip + progress dots, e.g. "CHI PHÍ" step 3 of 8. */
  kicker: z.strictObject({
    label: z.string().min(1),
    step: z.number().int().min(1),
    total: z.number().int().min(1),
  }),
  randomLabel: z.string().min(1),
  /** Relative cost of a random page jump, e.g. 4 (PostgreSQL random_page_cost). */
  randomCost: z.number().positive(),
  seqLabel: z.string().min(1),
  /** Relative cost of sequential reading, e.g. 1. */
  seqCost: z.number().positive(),
  /** Formula "{formulaBefore} {GUESS} {formulaAfter} × {priceLabel} = {costLabel}". */
  formulaBefore: z.string().min(1),
  /** The word "nghĩ": shown upper-case in the formula, lower-case in the thought bubble, orange. */
  guessWord: z.string().min(1),
  formulaAfter: z.string().min(1),
  priceLabel: z.string().min(1),
  costLabel: z.string().min(1),
  /** Statistics card: share of pending vs done rows (0-100). */
  pendingLabel: z.string().min(1),
  pendingPercent: z.number().min(0).max(100),
  doneLabel: z.string().min(1),
  donePercent: z.number().min(0).max(100),
  /** Engine chip, e.g. "PostgreSQL"; the chip beside it reads "{engineParam}={randomCost}". */
  engine: z.string().min(1),
  engineParam: z.string().min(1).default('random_page_cost'),
  roadsAt: SpokenAtSchema.optional(),
  randomAt: SpokenAtSchema.optional(),
  seqAt: SpokenAtSchema.optional(),
  engineAt: SpokenAtSchema.optional(),
  /** Phrase at which "×4" and "×1" appear. */
  multAt: SpokenAtSchema.optional(),
  /** Formula parts, in this order: rows, "× giá", "= chi phí". */
  rowsAt: SpokenAtSchema.optional(),
  priceAt: SpokenAtSchema.optional(),
  costAt: SpokenAtSchema.optional(),
  /** Phrase at which the thought bubble with the glowing guess word appears (roads dim). */
  guessAt: SpokenAtSchema.optional(),
  statsAt: SpokenAtSchema.optional(),
});

export const CostRoadsSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('costroads'),
  props: CostRoadsPropsSchema,
});

export type CostRoadsProps = z.infer<typeof CostRoadsPropsSchema>;
export type CostRoadsScene = z.infer<typeof CostRoadsSceneSchema>;
