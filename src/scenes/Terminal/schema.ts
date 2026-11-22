import { z } from 'zod';
import { sceneBaseShape } from '../../schemas/common';

export const TerminalPropsSchema = z.strictObject({
  lines: z
    .array(
      z.strictObject({
        command: z.string().min(1),
        output: z.string().optional(),
      }),
    )
    .min(1),
});

export const TerminalSceneSchema = z.strictObject({
  ...sceneBaseShape,
  type: z.literal('terminal'),
  props: TerminalPropsSchema,
});

export type TerminalScene = z.infer<typeof TerminalSceneSchema>;
