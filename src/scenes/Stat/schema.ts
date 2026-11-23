import { z } from 'zod';
import { SpokenAtSchema, ToneSchema, sceneBaseShape } from '../../schemas/common';

/** Big animated numbers: "10.000.000 bản ghi -> 24 bước". Counters tick up when the number is spoken. */
export const StatPropsSchema = z.strictObject({
  title: z.string().min(1),
  /** 1-4 rows shown one after another. */
  items: z
    .array(
      z.strictObject({
        /** What is counted, e.g. "10.000.000 bản ghi". */
        label: z.string().min(1),
        /** The number the counter animates to. */
        value: z.number().nonnegative(),
        unit: z.string().optional(),
        /** Small line under the number. */
        caption: z.string().optional(),
        tone: ToneSchema.default('neutral'),
        /** Phrase of the narration at which this row appears. */
        at: SpokenAtSchema.optional(),
      }),
    )
    .min(1)
    .max(4),
  footnote: z.string().optional(),
});

export const StatSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('stat'),
  props: StatPropsSchema,
});

export type StatScene = z.infer<typeof StatSceneSchema>;
