import { z } from 'zod';
import { SlugSchema } from './common';

export const AudioManifestSchema = z.strictObject({
  videoId: SlugSchema,
  provider: z.string().min(1),
  scenes: z.array(
    z.strictObject({
      sceneId: SlugSchema,
      /** Path relative to public/, ready for staticFile(). */
      file: z.string().min(1),
      format: z.enum(['wav', 'mp3']),
      durationSec: z.number().positive(),
      /** Hash of provider + options + text; used to skip unchanged scenes. */
      textHash: z.string().min(1),
      /** Optional sentence/word timing cues in seconds (edge provider). */
      cues: z
        .array(
          z.strictObject({ start: z.number().min(0), end: z.number().min(0), text: z.string() }),
        )
        .optional(),
    }),
  ),
});

export type AudioManifest = z.infer<typeof AudioManifestSchema>;
