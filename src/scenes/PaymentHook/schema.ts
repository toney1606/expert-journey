import { z } from 'zod';
import { KickerPropSchema } from '../../components/RowStrip/kicker';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/**
 * Opening hook of the payment video: two red charge chips slam in ("-500.000đ" twice, x2 badge), one tap ring,
 * three typed log lines that all say OK, then the question "Lỗi ở đâu?". Amounts are illustrative.
 */
export const PaymentHookPropsSchema = z.strictObject({
  /** Charge shown on each chip, e.g. "−500.000đ" (illustrative amount, not a measurement). */
  moneyLabel: z.string().min(1),
  /** Big badge on the second charge, e.g. "×2". */
  badgeText: z.string().min(1).default('×2'),
  /** Hero line 1 (markup): "Bị trừ {wrong|2 lần}."; pops at `chargeAt`. */
  chargedLine: z.string().min(1),
  /** Hero line 2 (markup): "Bấm {accent|1 lần}."; pops at `tapAt`. */
  tappedLine: z.string().min(1),
  /** Label next to the tap ring, e.g. "1 tap". */
  tapLabel: z.string().min(1).default('1 tap'),
  chargeAt: SpokenAtSchema.optional(),
  chargeAgainAt: SpokenAtSchema.optional(),
  tapAt: SpokenAtSchema.optional(),
  /** Exactly three log lines, typed one by one, each ending with a green check. */
  logs: z
    .array(z.strictObject({ text: z.string().min(1), at: SpokenAtSchema.optional() }))
    .length(3),
  /** Final question (markup): "Lỗi ở {accent|đâu}?". */
  question: z.string().min(1),
  questionAt: SpokenAtSchema.optional(),
  kicker: KickerPropSchema.optional(),
});

export const PaymentHookSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('paymenthook'),
  props: PaymentHookPropsSchema,
});

export type PaymentHookProps = z.infer<typeof PaymentHookPropsSchema>;
export type PaymentHookScene = z.infer<typeof PaymentHookSceneSchema>;
