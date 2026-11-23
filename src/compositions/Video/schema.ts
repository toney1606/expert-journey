import { z } from 'zod';
import { AudioManifestSchema, BedInfoSchema } from '../../schemas/audio-manifest';
import { VideoSchema } from '../../schemas/video';

export const VideoCompositionPropsSchema = z.strictObject({
  video: VideoSchema,
  debugSafeZone: z.boolean(),
  /** Filled in by calculateMetadata from the `pnpm tts` manifest; absent until audio exists. */
  audio: AudioManifestSchema.optional(),
  /** Filled in by calculateMetadata from bed.json (`pnpm sfx`); the music/sfx bed plays when present. */
  bed: BedInfoSchema.optional(),
});

export type VideoCompositionProps = z.infer<typeof VideoCompositionPropsSchema>;
