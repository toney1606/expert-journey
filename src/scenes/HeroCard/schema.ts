import { z } from 'zod';
import { KickerPropSchema } from '../../components/RowStrip/kicker';
import { SpokenAtSchema, ToneSchema, sceneBaseShape } from '../../schemas/common';

/** One line of the hero. Supports {accent|word} and {wrong|word} markup. */
const HeroLineSchema = z.strictObject({
  text: z.string().min(1),
  /** Narration phrase at which this line pops in. */
  at: SpokenAtSchema.optional(),
});

/** One row of the card: a log line, a flow step or a data row. */
const RowSchema = z.strictObject({
  /** Small muted line above the text, e.g. "Client → Server". */
  label: z.string().min(1).optional(),
  text: z.string().min(1),
  tone: ToneSchema.default('neutral'),
  /** Icon at the end of the row (drawn as SVG, no font glyph needed). */
  mark: z.enum(['check', 'cross']).optional(),
  /** Stamp at the end of the row, e.g. "TỪ CHỐI". */
  badge: z.string().min(1).optional(),
  at: SpokenAtSchema.optional(),
});

const CodeSchema = z.strictObject({
  text: z.string().min(1),
  language: z.string().min(1).default('sql'),
  at: SpokenAtSchema.optional(),
});

const FooterSchema = z.strictObject({
  /** Call to action next to a pin icon, e.g. "Trả lời ở bình luận". */
  text: z.string().min(1),
  at: SpokenAtSchema.optional(),
});

/**
 * Hero + card scene: kicker (step chip + progress dots), a one or two line hero with one yellow and one
 * red word, then a card made of an optional code block, rows and a footer. Reveal order: hero lines,
 * code, rows, footer.
 */
export const HeroCardPropsSchema = z
  .strictObject({
    kicker: KickerPropSchema.optional(),
    hero: z.array(HeroLineSchema).min(1).max(2),
    code: CodeSchema.optional(),
    rows: z.array(RowSchema).min(1).max(6).optional(),
    /** Rows in the code font (log lines). */
    mono: z.boolean().default(false),
    /** Number the rows 1..n (flow steps). */
    numbered: z.boolean().default(false),
    footer: FooterSchema.optional(),
  })
  .refine((p) => p.code !== undefined || p.rows !== undefined || p.footer !== undefined, {
    message: 'a hero card needs at least one of `code`, `rows` or `footer`',
    path: ['rows'],
  });

export const HeroCardSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('herocard'),
  props: HeroCardPropsSchema,
});

export type HeroCardProps = z.infer<typeof HeroCardPropsSchema>;
export type HeroCardInput = z.input<typeof HeroCardPropsSchema>;
export type HeroCardRow = z.infer<typeof RowSchema>;
export type HeroCardScene = z.infer<typeof HeroCardSceneSchema>;
