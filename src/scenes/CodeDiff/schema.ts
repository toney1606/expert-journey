import { z } from 'zod';
import { SpokenAtSchema, sceneBaseShape } from '../../schemas/common';

export const CodePropsSchema = z.strictObject({
  language: z.string().min(1),
  filename: z.string().optional(),
  before: z.string().min(1),
  after: z.string().min(1),
  /** Repo-relative path of the test proving the code runs (required by content policy). */
  testPath: z.string().min(1),
  /** Narration phrase at which the before -> after morph starts. */
  morphAt: SpokenAtSchema.optional(),
  /** Narration phrase at which the "tested" badge appears. */
  testedAt: SpokenAtSchema.optional(),
});

export const CodeSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('code'),
  props: CodePropsSchema,
});

export type CodeScene = z.infer<typeof CodeSceneSchema>;
