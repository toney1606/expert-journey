import { z } from 'zod';
import { KickerPropSchema } from '../../components/RowStrip/kicker';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/**
 * Idempotency key scene: a glowing key chip is generated, then travels with every attempt (client -> server).
 * Attempt 1 is charged and stored in a ledger; attempt 2 hits a "known key" stamp and gets the old result back.
 */
export const IdemKeyPropsSchema = z.strictObject({
  /** Huge headline lines with `{accent|x}` / `{wrong|x}` markup (fit-to-width). */
  hero: z.array(z.string().min(1)).min(1).max(2),
  /** First (bold) line of the key chip, e.g. "Idempotency-Key:". */
  keyLabel: z.string().min(1).default('Idempotency-Key:'),
  /** The generated key, shown in the chip and riding on every packet. */
  keyValue: z.string().min(1).default('a1b2-c3d4'),
  counterLabel: z.string().min(1).default('Trừ tiền'),
  /** Retry badge on lane 2, e.g. "×10". */
  retryBadge: z.string().min(1).default('×10'),
  lane1: z.strictObject({
    title: z.string().min(1),
    note: z.string().min(1),
    ledger: z.string().min(1),
    outcome: z.string().min(1),
  }),
  lane2: z.strictObject({
    title: z.string().min(1),
    note: z.string().min(1),
    stamp: z.string().min(1),
    returnText: z.string().min(1),
    outcome: z.string().min(1),
  }),
  /** Narration phrases (in this order): hero, lanes, key chip, attempt 1, retry, ledger, stamp, "no charge", return. */
  heroAt: SpokenAtSchema.optional(),
  lanesAt: SpokenAtSchema.optional(),
  chipAt: SpokenAtSchema.optional(),
  sendAt: SpokenAtSchema.optional(),
  retryAt: SpokenAtSchema.optional(),
  saveAt: SpokenAtSchema.optional(),
  stampAt: SpokenAtSchema.optional(),
  noChargeAt: SpokenAtSchema.optional(),
  returnAt: SpokenAtSchema.optional(),
  kicker: KickerPropSchema.optional(),
});

export const IdemKeySceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('idemkey'),
  props: IdemKeyPropsSchema,
});

export type IdemKeyProps = z.infer<typeof IdemKeyPropsSchema>;
export type IdemKeyScene = z.infer<typeof IdemKeySceneSchema>;
