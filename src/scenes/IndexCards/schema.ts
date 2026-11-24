import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/** Colours a bar may use (keys of `colors`). */
export const BAR_TONES = ['diagram', 'pending', 'correct', 'wrong'] as const;

/** Extra visuals of one card: size comparison bars and/or a code sample. */
export const CardExtraSchema = z.strictObject({
  /** 1-3 horizontal bars; `fraction` (0..1) is the length relative to the track. */
  bars: z
    .array(
      z.strictObject({
        label: z.string().min(1),
        fraction: z.number().gt(0).max(1),
        tone: z.enum(BAR_TONES).default('diagram'),
      }),
    )
    .max(3)
    .optional(),
  /** Narration phrase at which the bars grow. */
  barsAt: SpokenAtSchema.optional(),
  /** Code shown in a CodeBlock (>= 40px). */
  code: z.string().min(1).optional(),
  language: z.string().min(1).default('sql'),
  /** Narration phrase at which the code appears. */
  codeAt: SpokenAtSchema.optional(),
});

/** Illustration motif of a card (inline SVG). */
export const CARD_ICONS = ['tree', 'key', 'columns', 'bag', 'funnel', 'search'] as const;

/** Index kinds one after another: one large active card, earlier ones collapse to chips. */
export const IndexCardsPropsSchema = z.strictObject({
  /** Top chip + progress dots of the shared kit. */
  kicker: z
    .strictObject({
      label: z.string().min(1),
      step: z.number().int().min(1),
      total: z.number().int().min(1),
    })
    .optional(),
  /** 2-6 cards in narration order. */
  cards: z
    .array(
      z.strictObject({
        /** Card name, e.g. "B+Tree". */
        name: z.string().min(1),
        /** One-line use. */
        use: z.string().min(1),
        /** Example chip. */
        example: z.string().min(1),
        /** Narration phrase at which this card becomes active. */
        at: SpokenAtSchema.optional(),
        /** Illustration; defaults to the motif at the card's position. */
        icon: z.enum(CARD_ICONS).optional(),
        extra: CardExtraSchema.optional(),
      }),
    )
    .min(2)
    .max(6),
});

export const IndexCardsSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('indexcards'),
  props: IndexCardsPropsSchema,
});

export type IndexCardsProps = z.infer<typeof IndexCardsPropsSchema>;
export type IndexCardsScene = z.infer<typeof IndexCardsSceneSchema>;
