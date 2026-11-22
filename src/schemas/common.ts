import { z } from 'zod';

export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug (a-z, 0-9, hyphens)');

export const LevelSchema = z.enum(['intern', 'junior', 'mid', 'senior']);

export const SourceSchema = z.strictObject({
  title: z.string().min(1),
  url: z.url().optional(),
});

export const SourcesSchema = z.array(SourceSchema);

/**
 * Temporary, author-declared timing. Until real TTS audio exists, every scene must
 * declare how long it lasts. Once audio drives timing this becomes optional.
 */
export const DraftSchema = z.strictObject({
  durationSec: z.number().positive().max(120),
});

/** Fields shared by every scene. Each scene schema extends this with `type` and `props`. */
export const sceneBaseShape = {
  id: SlugSchema,
  voice: z.string().min(1),
  sources: SourcesSchema.optional(),
  draft: DraftSchema,
};

export type Source = z.infer<typeof SourceSchema>;
export type Level = z.infer<typeof LevelSchema>;
