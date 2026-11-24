import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

/**
 * "Why 3 reads": one page holds a few hundred rows, an index page points to `fanout` child pages, three levels
 * cover `total` rows, so finding one of `population` people takes `levels` page reads.
 */
export const PageTreePropsSchema = z.strictObject({
  /** Top chip + progress dots, e.g. "ĐỌC ĐĨA" step 2 of 8. */
  kicker: z.strictObject({
    label: z.string().min(1),
    step: z.number().int().min(1),
    total: z.number().int().min(1),
  }),
  /** Caption of the enlarged page, e.g. "1 page = vài trăm dòng". */
  pageLabel: z.string().min(1),
  pageAt: SpokenAtSchema.optional(),
  /** Children per index page; shown as "×300" on level 2 and level 3. */
  fanout: z.number().int().min(2),
  /** Phrase at which the root and level 2 appear. */
  fanoutAt: SpokenAtSchema.optional(),
  /** Phrase at which level 3 appears ("ba tầng"). */
  levelsAt: SpokenAtSchema.optional(),
  /** Rows covered by the three levels; the counter counts up to it. */
  total: z.number().positive(),
  totalUnit: z.string().default('dòng'),
  totalAt: SpokenAtSchema.optional(),
  /** The population being searched, e.g. 10.000.000. */
  population: z.number().positive(),
  populationUnit: z.string().default('người'),
  populationAt: SpokenAtSchema.optional(),
  /** Result line, e.g. "~3 lần đọc"; the glowing path counts 1, 2, 3 when it appears. */
  readsLabel: z.string().min(1),
  readsAt: SpokenAtSchema.optional(),
});

export const PageTreeSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('pagetree'),
  props: PageTreePropsSchema,
});

export type PageTreeProps = z.infer<typeof PageTreePropsSchema>;
export type PageTreeScene = z.infer<typeof PageTreeSceneSchema>;
