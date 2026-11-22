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
    }),
  ),
});

export type AudioManifest = z.infer<typeof AudioManifestSchema>;
