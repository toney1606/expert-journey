import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

export const CALLOUT_KINDS = ['myth', 'fact', 'warning', 'tip'] as const;

/** One bold statement card: myth-buster ("INDEX ≠ LUÔN NHANH HƠN"), warning, fact or tip. */
export const CalloutPropsSchema = z
  .strictObject({
    kind: z.enum(CALLOUT_KINDS),
    /** Small label above, e.g. "MYTH BUSTER". Defaults from `kind`. */
    kicker: z.string().optional(),
    /** The big statement. Supports {accent|highlighted words} markup. */
    statement: z.string().min(1),
    explanation: z.string().optional(),
    statementAt: SpokenAtSchema.optional(),
    explanationAt: SpokenAtSchema.optional(),
  })
  .refine((props) => props.explanationAt === undefined || props.explanation !== undefined, {
    message: '`explanationAt` needs an `explanation` to reveal',
    path: ['explanationAt'],
  });

export const CalloutSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('callout'),
  props: CalloutPropsSchema,
});

export type CalloutScene = z.infer<typeof CalloutSceneSchema>;
