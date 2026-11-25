import { z } from 'zod';
import { KickerPropSchema } from '../../components/RowStrip/kicker';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/** Unique constraint: typed SQL, then a table where a duplicate row hits the UNIQUE wall and is stamped. */
export const UniqueKeyPropsSchema = z.strictObject({
  /** SQL typed out in the code card (language sql). Line breaks are final: they are laid out to the card width. */
  code: z.string().min(1),
  /** Hero lines (1-2) with `{accent|x}` / `{wrong|x}` markup, each as large as fits the width. */
  hero: z.array(z.string().min(1)).min(1).max(2),
  /** Table name and the muted header line (same font/size as the rows). */
  tableName: z.string().min(1).default('payments'),
  header: z.string().min(1).default('mã · số tiền'),
  /** The accepted row (green) and the duplicate row (red). */
  rowOk: z.string().min(1),
  rowDup: z.string().min(1),
  /** Rotated red stamp on the duplicate row. */
  badge: z.string().min(1).default('TỪ CHỐI'),
  /** Narration phrases: hero line 1 / 2 pop, typing starts, row 1 arrives, row 2 arrives, stamp slams. */
  heroAt: z.array(SpokenAtSchema).max(2).optional(),
  codeAt: SpokenAtSchema.optional(),
  rowOkAt: SpokenAtSchema.optional(),
  rowDupAt: SpokenAtSchema.optional(),
  badgeAt: SpokenAtSchema.optional(),
  kicker: KickerPropSchema.optional(),
});

export const UniqueKeySceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('uniquekey'),
  props: UniqueKeyPropsSchema,
});

export type UniqueKeyProps = z.infer<typeof UniqueKeyPropsSchema>;
export type UniqueKeyScene = z.infer<typeof UniqueKeySceneSchema>;
