import { z } from 'zod';
import { SlugSchema, sceneBaseShape } from '../../schemas/common';

export const DiagramPropsSchema = z
  .strictObject({
    title: z.string().min(1),
    nodes: z.array(z.strictObject({ id: SlugSchema, label: z.string().min(1) })).min(1),
    edges: z.array(
      z.strictObject({ from: SlugSchema, to: SlugSchema, label: z.string().optional() }),
    ),
  })
  .superRefine((props, ctx) => {
    const seen = new Set<string>();
    props.nodes.forEach((node, index) => {
      if (seen.has(node.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['nodes', index, 'id'],
          message: `duplicate node id "${node.id}"`,
        });
      }
      seen.add(node.id);
    });
    props.edges.forEach((edge, index) => {
      for (const end of ['from', 'to'] as const) {
        if (!seen.has(edge[end])) {
          ctx.addIssue({
            code: 'custom',
            path: ['edges', index, end],
            message: `edge ${end} "${edge[end]}" does not match any node id`,
          });
        }
      }
    });
  });

export const DiagramSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('diagram'),
  props: DiagramPropsSchema,
});

export type DiagramScene = z.infer<typeof DiagramSceneSchema>;
