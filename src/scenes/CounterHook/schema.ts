import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/** Opening hook: a latency number counts up from fast (green) to slow (red), three facts, then the punchline. */
export const CounterHookPropsSchema = z.strictObject({
  /** Fast latency in ms (green), shown first. */
  fastMs: z.number().nonnegative(),
  /** Slow latency in ms (red), the counter ticks up to it. */
  slowMs: z.number().positive(),
  unit: z.string().min(1).default('ms'),
  /** Phrase of the narration at which the counter starts ticking up. */
  countAt: SpokenAtSchema.optional(),
  /** 1-3 facts that appear one by one, e.g. "Không đổi code". */
  lines: z
    .array(
      z.strictObject({
        text: z.string().min(1),
        /** Phrase of the narration at which this line appears. */
        at: SpokenAtSchema.optional(),
      }),
    )
    .min(1)
    .max(3),
  /** Punchline: `finalText` followed by `accentWord` drawn in orange (pending/guess colour), e.g. "Database" + "ĐOÁN". */
  finalText: z.string().min(1),
  accentWord: z.string().min(1),
  /** Phrase of the narration at which the punchline appears (with one shake beat). */
  finalAt: SpokenAtSchema.optional(),
  /** Short line under the punchline (>= 44px), e.g. "Hôm nay nó đoán sai". */
  footText: z.string().min(1).optional(),
  /** Top chip + progress dots shared by every scene. */
  kicker: z
    .strictObject({
      label: z.string().min(1),
      step: z.number().int().positive(),
      total: z.number().int().positive(),
    })
    .optional(),
});

export const CounterHookSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('counterhook'),
  props: CounterHookPropsSchema,
});

export type CounterHookProps = z.infer<typeof CounterHookPropsSchema>;
export type CounterHookScene = z.infer<typeof CounterHookSceneSchema>;
