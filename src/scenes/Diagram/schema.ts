import { z } from 'zod';
import { SlugSchema, sceneBaseShape } from '../../schemas/common';

export const DiagramPropsSchema = z.strictObject({
  title: z.string().min(1),
  nodes: z.array(z.strictObject({ id: SlugSchema, label: z.string().min(1) })).min(1),
  edges: z.array(
    z.strictObject({ from: SlugSchema, to: SlugSchema, label: z.string().optional() }),
  ),
});

export const DiagramSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('diagram'),
  props: DiagramPropsSchema,
});

export type DiagramScene = z.infer<typeof DiagramSceneSchema>;
