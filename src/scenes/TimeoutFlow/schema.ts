import { z } from 'zod';
import { KickerPropSchema } from '../../components/RowStrip/kicker';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/** Client/server sequence diagram: request, charge, lost reply, timeout, retry, second charge. */
export const TimeoutFlowPropsSchema = z.strictObject({
  /** Hero line with markup, e.g. "{accent|Timeout} ≠ {wrong|thất bại}". */
  hero: z.string().min(1),
  clientLabel: z.string().min(1).default('Client'),
  serverLabel: z.string().min(1).default('Server'),
  /** Step 1 arrow label (client -> server). */
  requestLabel: z.string().min(1),
  /** Step 2 chip and counter. */
  chargeLabel: z.string().min(1),
  counterLabel: z.string().min(1).default('Đã trừ:'),
  /** Step 3 arrow label (server -> client, red, breaks). */
  lostLabel: z.string().min(1),
  /** Step 4 label next to the clock ring. */
  timeoutLabel: z.string().min(1),
  /** Step 5 arrow label. */
  retryLabel: z.string().min(1),
  /** Step 6 chip (red). */
  chargeAgainLabel: z.string().min(1),
  /** Narration phrases (from `voice`) at which each step starts; lessonAt makes the red cross pulse. */
  requestAt: SpokenAtSchema.optional(),
  chargeAt: SpokenAtSchema.optional(),
  lostAt: SpokenAtSchema.optional(),
  timeoutAt: SpokenAtSchema.optional(),
  retryAt: SpokenAtSchema.optional(),
  chargeAgainAt: SpokenAtSchema.optional(),
  lessonAt: SpokenAtSchema.optional(),
  kicker: KickerPropSchema.optional(),
});

export const TimeoutFlowSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('timeoutflow'),
  props: TimeoutFlowPropsSchema,
});

export type TimeoutFlowProps = z.infer<typeof TimeoutFlowPropsSchema>;
export type TimeoutFlowScene = z.infer<typeof TimeoutFlowSceneSchema>;
