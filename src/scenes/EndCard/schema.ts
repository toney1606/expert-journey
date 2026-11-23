import { z } from 'zod';
import { sceneBaseShape } from '../../schemas/common';

/** Closing card: recap line, call to action and the loop line that leads back into the hook. */
export const EndCardPropsSchema = z.strictObject({
  headline: z.string().min(1),
  subline: z.string().optional(),
  /** Call to action, e.g. "Theo dõi để xem câu hỏi tiếp theo". */
  cta: z.string().optional(),
  /** Channel name shown in the footer. */
  brand: z.string().optional(),
  loopLine: z.string().optional(),
});

export const EndCardSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('endcard'),
  props: EndCardPropsSchema,
});

export type EndCardScene = z.infer<typeof EndCardSceneSchema>;
