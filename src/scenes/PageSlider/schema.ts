import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/** Closing cliffhanger: a page slider dragged from page 1 to page 10.000 while a gauge turns green to red. */
export const PageSliderPropsSchema = z.strictObject({
  /** SQL shown on top (language sql, >= 46px). */
  code: z.string().min(1),
  /** Word before the page number, e.g. "Trang". */
  pageLabel: z.string().min(1).default('Trang'),
  firstPage: z.number().int().positive().default(1),
  lastPage: z.number().int().positive().default(10000),
  /** Measured latency (ms) at the first / last page, from a measurements file; null or missing = use the label. */
  page1Ms: z.number().nonnegative().nullish(),
  page10000Ms: z.number().nonnegative().nullish(),
  /** Qualitative latency shown when the matching `...Ms` is null/missing. */
  page1Label: z.string().min(1).default('vài ms'),
  page10000Label: z.string().min(1).default('chậm hẳn'),
  /** The open question, e.g. "Vì sao? Sửa thế nào?". */
  question: z.string().min(1),
  /** Last line next to the pin, e.g. "Trả lời ở bình luận". */
  pinText: z.string().min(1),
  /** Narration phrases at which the slider starts moving / the question / the pin line appear. */
  dragAt: SpokenAtSchema.optional(),
  questionAt: SpokenAtSchema.optional(),
  pinAt: SpokenAtSchema.optional(),
  /** Top chip + progress dots shared by every scene. */
  kicker: z
    .strictObject({
      label: z.string().min(1),
      step: z.number().int().positive(),
      total: z.number().int().positive(),
    })
    .optional(),
});

export const PageSliderSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('pageslider'),
  props: PageSliderPropsSchema,
});

export type PageSliderProps = z.infer<typeof PageSliderPropsSchema>;
export type PageSliderScene = z.infer<typeof PageSliderSceneSchema>;
