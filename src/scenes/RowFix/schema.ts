import { z } from 'zod';
import { KickerPropSchema } from '../../components/RowStrip/kicker';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/** Three steps in one scene: read EXPLAIN, see that ANALYZE changes nothing, reorganise with a composite index. */
export const RowFixPropsSchema = z.strictObject({
  /** Top chip with progress dots ("CÁCH SỬA", step 6 of 8). */
  kicker: KickerPropSchema.optional(),
  /** Heading of step 1 ("EXPLAIN ANALYZE"). */
  explainTitle: z.string().min(1),
  /** Plan text; the "…" on the "Rows Removed by Filter" line is replaced by `rowsRemoved` at render time. */
  explainCode: z.string().min(1),
  /** Rows the filter removed (measured; placeholder until the lead replaces it). */
  rowsRemoved: z.number().nonnegative(),
  /** Step 2: the button, the statistics card, the stamp. */
  analyzeLabel: z.string().min(1),
  statLabel: z.string().min(1),
  /** Share of pending cells in percent: drives the strip AND the statistics card (which never changes). */
  pendingPercent: z.number().min(1).max(25),
  stampText: z.string().min(1),
  /** Step 3: the fix, the counter, the end result ("10 dòng"). */
  fixCode: z.string().min(1),
  readLabel: z.string().min(1),
  /** Pending cells the cursor collects before it stops (the LIMIT). */
  limit: z.number().int().min(1).max(50).default(10),
  resultText: z.string().min(1),
  atRows: SpokenAtSchema.optional(),
  atAnalyze: SpokenAtSchema.optional(),
  atStamp: SpokenAtSchema.optional(),
  atStrip: SpokenAtSchema.optional(),
  atFixCode: SpokenAtSchema.optional(),
  atMorph: SpokenAtSchema.optional(),
  atCursor: SpokenAtSchema.optional(),
  atResult: SpokenAtSchema.optional(),
});

export const RowFixSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('rowfix'),
  props: RowFixPropsSchema,
});

export type RowFixProps = z.output<typeof RowFixPropsSchema>;
export type RowFixScene = z.infer<typeof RowFixSceneSchema>;
