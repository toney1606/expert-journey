import { z } from 'zod';
import { KickerPropSchema } from '../../components/RowStrip/kicker';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/** Auto-approve is switched on: pending orders slide to the old side, statistics still say 5%. */
export const RowTwistPropsSchema = z.strictObject({
  /** Top chip with progress dots ("BƯỚC NGOẶT", step 5 of 8). */
  kicker: KickerPropSchema.optional(),
  /** "Tự động duyệt" and the text of the ON state ("BẬT"). */
  toggleLabel: z.string().min(1),
  toggleOnText: z.string().min(1),
  /** Share of pending cells in percent: drives the strip AND the statistics card (which never changes). */
  pendingPercent: z.number().min(1).max(25),
  /** Statistics card label: "Thống kê: vẫn". */
  statLabel: z.string().min(1),
  /** What the database still believes: "Database vẫn tin: ~200 đơn là đủ". */
  beliefText: z.string().min(1),
  /** The wrong assumption, struck through in red: "Giả định: nằm rải đều". */
  assumptionText: z.string().min(1),
  /** Floating label on cells the cursor passes: "bỏ". */
  skipLabel: z.string().min(1),
  /** Counter label: "đã bỏ qua". */
  skippedLabel: z.string().min(1),
  /** Rows the real query skipped (measured; placeholder until the lead replaces it). */
  skippedCount: z.number().nonnegative(),
  atToggle: SpokenAtSchema.optional(),
  atSlide: SpokenAtSchema.optional(),
  atStat: SpokenAtSchema.optional(),
  atBelief: SpokenAtSchema.optional(),
  atCursor: SpokenAtSchema.optional(),
  atAssumption: SpokenAtSchema.optional(),
  atStrike: SpokenAtSchema.optional(),
});

export const RowTwistSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('rowtwist'),
  props: RowTwistPropsSchema,
});

export type RowTwistProps = z.output<typeof RowTwistPropsSchema>;
export type RowTwistScene = z.infer<typeof RowTwistSceneSchema>;
