import { z } from 'zod';
import { VideoSchema } from '../../schemas/video';

export const VideoCompositionPropsSchema = z.strictObject({
  video: VideoSchema,
  debugSafeZone: z.boolean(),
});

export type VideoCompositionProps = z.infer<typeof VideoCompositionPropsSchema>;
