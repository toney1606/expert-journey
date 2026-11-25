import { z } from 'zod';
import { KickerPropSchema } from '../../components/RowStrip/kicker';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/** Closing cliffhanger: SELECT-then-INSERT code with a pulsing gap marker and two overlapping request bars. */
export const RaceGapPropsSchema = z.strictObject({
  /** Two hero lines, `{accent|x}` / `{wrong|x}` markup allowed. */
  heroTop: z.string().min(1),
  heroBottom: z.string().min(1),
  /** SQL, exact line breaks kept (language sql, >= 40px). The last line is the one after the gap. */
  code: z.string().min(1),
  /** Timeline strip labels (>= 44px). */
  request1Label: z.string().min(1),
  request2Label: z.string().min(1),
  /** Footer next to the pin. */
  pinText: z.string().min(1),
  /** Narration phrases: hero pops, code types, gap marker, request 1 bar, request 2 slides in, "why" pulse, footer. */
  heroAt: SpokenAtSchema.optional(),
  codeAt: SpokenAtSchema.optional(),
  gapAt: SpokenAtSchema.optional(),
  request1At: SpokenAtSchema.optional(),
  request2At: SpokenAtSchema.optional(),
  whyAt: SpokenAtSchema.optional(),
  pinAt: SpokenAtSchema.optional(),
  kicker: KickerPropSchema.optional(),
});

export const RaceGapSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('racegap'),
  props: RaceGapPropsSchema,
});

export type RaceGapProps = z.infer<typeof RaceGapPropsSchema>;
export type RaceGapScene = z.infer<typeof RaceGapSceneSchema>;
