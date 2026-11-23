import { z } from 'zod';
import { IconSchema, SpokenAtSchema, ToneSchema, sceneBaseShape } from '../../schemas/common';

const SideSchema = z.strictObject({
  label: z.string().min(1),
  caption: z.string().optional(),
  icon: IconSchema.optional(),
  tone: ToneSchema.default('neutral'),
  at: SpokenAtSchema.optional(),
});

/** Analogy / before-after: two cards side by side or stacked ("lật từng trang" vs "mở mục lục"). */
export const ComparePropsSchema = z
  .strictObject({
    title: z.string().min(1),
    left: SideSchema,
    right: SideSchema,
    /** Conclusion line shown last, e.g. "INDEX = mục lục của bảng". */
    verdict: z.string().optional(),
    verdictAt: SpokenAtSchema.optional(),
  })
  .refine((props) => props.verdictAt === undefined || props.verdict !== undefined, {
    message: '`verdictAt` needs a `verdict` to reveal',
    path: ['verdictAt'],
  });

export const CompareSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('compare'),
  props: ComparePropsSchema,
});

export type CompareScene = z.infer<typeof CompareSceneSchema>;
