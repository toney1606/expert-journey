import { z } from 'zod';
import { sceneBaseShape } from '../../schemas/common';

export const SummaryPropsSchema = z.strictObject({
  points: z.array(z.string().min(1)).min(1),
  /** Line that leads back into the hook so the video loops. */
  loopLine: z.string().optional(),
});

export const SummarySceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('summary'),
  props: SummaryPropsSchema,
});

export type SummaryScene = z.infer<typeof SummarySceneSchema>;
