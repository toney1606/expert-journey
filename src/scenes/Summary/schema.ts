import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

export const SummaryPropsSchema = z.strictObject({
  points: z.array(z.string().min(1)).min(1),
  /** Line that leads back into the hook so the video loops. */
  loopLine: z.string().optional(),
  /** Narration phrases aligned by index with `points`; missing entries keep the automatic timing. */
  pointsAt: z.array(SpokenAtSchema).optional(),
  /** Narration phrase at which the loop line appears. */
  loopAt: SpokenAtSchema.optional(),
});

export const SummarySceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('summary'),
  props: SummaryPropsSchema,
});

export type SummaryScene = z.infer<typeof SummarySceneSchema>;
