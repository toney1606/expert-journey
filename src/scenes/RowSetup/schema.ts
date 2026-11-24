import { z } from 'zod';
import { KickerPropSchema } from '../../components/RowStrip/kicker';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/** The orders table has 10.000.000 rows, 5% pending: the planner guesses ~200 rows are enough for LIMIT 10. */
export const RowSetupPropsSchema = z.strictObject({
  /** Top chip with progress dots ("THIẾT LẬP", step 4 of 8). */
  kicker: KickerPropSchema.optional(),
  /** Rows of the table, shown big ("10.000.000 dòng"). */
  rowCount: z.number().positive(),
  rowUnit: z.string().min(1),
  /** Share of pending (orange) cells, in percent. */
  pendingPercent: z.number().min(1).max(25),
  /** Legend text: "5% = đơn chờ". */
  pendingLabel: z.string().min(1),
  /** The SQL query (4 lines at most). */
  code: z.string().min(1),
  /** Counter label: "đã đọc". */
  readLabel: z.string().min(1),
  /** What the counter ends at (planner estimate, "~200"). */
  readCount: z.number().nonnegative().default(200),
  /** Pending cells the cursor collects before it stops (the LIMIT). */
  limit: z.number().int().min(1).max(50).default(10),
  /** Narration phrases at which each element appears. */
  atTable: SpokenAtSchema.optional(),
  atCode: SpokenAtSchema.optional(),
  atPending: SpokenAtSchema.optional(),
  atCursor: SpokenAtSchema.optional(),
});

export const RowSetupSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('rowsetup'),
  props: RowSetupPropsSchema,
});

export type RowSetupProps = z.output<typeof RowSetupPropsSchema>;
export type RowSetupScene = z.infer<typeof RowSetupSceneSchema>;
