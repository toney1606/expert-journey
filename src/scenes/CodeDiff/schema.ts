import { z } from 'zod';
import { sceneBaseShape } from '../../schemas/common';

export const CodePropsSchema = z.strictObject({
  language: z.string().min(1),
  filename: z.string().optional(),
  before: z.string().min(1),
  after: z.string().min(1),
  /** Repo-relative path of the test proving the code runs (required by content policy). */
  testPath: z.string().min(1),
});

export const CodeSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('code'),
  props: CodePropsSchema,
});

export type CodeScene = z.infer<typeof CodeSceneSchema>;
