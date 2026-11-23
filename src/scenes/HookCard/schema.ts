import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

export const HookPropsSchema = z.strictObject({
  /** The interview question or provocative statement shown big. */
  headline: z.string().min(1),
  subline: z.string().optional(),
  /** Small label above the headline, e.g. "Junior · Database". */
  badge: z.string().optional(),
  /** Narration phrase at which the headline appears (default: automatic timing). */
  atHeadline: SpokenAtSchema.optional(),
  /** Narration phrase at which the subline appears. */
  atSubline: SpokenAtSchema.optional(),
});

export const HookSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('hook'),
  props: HookPropsSchema,
});

export type HookProps = z.infer<typeof HookPropsSchema>;
export type HookScene = z.infer<typeof HookSceneSchema>;
