import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

export const TradeoffPropsSchema = z.strictObject({
  title: z.string().min(1),
  options: z
    .array(
      z.strictObject({
        name: z.string().min(1),
        pros: z.array(z.string().min(1)),
        cons: z.array(z.string().min(1)),
        /** Narration phrase at which this card appears. */
        at: SpokenAtSchema.optional(),
        /**
         * Narration phrases for the rows, aligned by index with `pros` followed by `cons`. Shorter
         * arrays are fine; missing entries keep the automatic timing.
         */
        cueAt: z.array(SpokenAtSchema).optional(),
      }),
    )
    .min(2),
});

export const TradeoffSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('tradeoff'),
  props: TradeoffPropsSchema,
});

export type TradeoffScene = z.infer<typeof TradeoffSceneSchema>;
