import { z } from 'zod';
import { SlugSchema, sceneBaseShape } from '../../schemas/common';

export const DiagramPropsSchema = z
  .strictObject({
    title: z.string().min(1),
    nodes: z
      .array(
        z.strictObject({
          id: SlugSchema,
          label: z.string().min(1),
          /** Narration phrase at which the node appears (default: layer-by-layer timing). */
          at: z.string().min(1).optional(),
        }),
      )
      .min(1),
    edges: z.array(
      z.strictObject({
        from: SlugSchema,
        to: SlugSchema,
        label: z.string().optional(),
        /** Narration phrase at which the edge is drawn (default: right after its source node). */
        at: z.string().min(1).optional(),
      }),
    ),
    /** Node ids in visiting order: a token travels along the edges between them. */
    path: z.array(SlugSchema).min(1).optional(),
    /** Narration phrase at which the traversal starts (default: after the reveal). */
    pathAt: z.string().min(1).optional(),
    /** Step badge text with {k} (current step) and {n} (total) placeholders. Default `Bước {k}/{n}`. */
    stepLabel: z.string().min(1).optional(),
    /** Node id that gets a soft pulsing halo (the node that matters). */
    emphasis: SlugSchema.optional(),
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
    const path = props.path ?? [];
    path.forEach((id, index) => {
      if (!seen.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['path', index],
          message: `path node "${id}" does not match any node id`,
        });
        return;
      }
      const prev = path[index - 1];
      if (prev === undefined || !seen.has(prev)) return;
      const linked = props.edges.some(
        (edge) => (edge.from === prev && edge.to === id) || (edge.from === id && edge.to === prev),
      );
      if (!linked) {
        ctx.addIssue({
          code: 'custom',
          path: ['path', index],
          message: `path step "${prev}" -> "${id}" is not connected by an edge`,
        });
      }
    });
    if (props.emphasis !== undefined && !seen.has(props.emphasis)) {
      ctx.addIssue({
        code: 'custom',
        path: ['emphasis'],
        message: `emphasis "${props.emphasis}" does not match any node id`,
      });
    }
  });

export const DiagramSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('diagram'),
  props: DiagramPropsSchema,
});

export type DiagramScene = z.infer<typeof DiagramSceneSchema>;
