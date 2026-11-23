import { z } from 'zod';

export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug (a-z, 0-9, hyphens)');

/** Learning path order: each level is published (and researched) before the next. */
export const LEVELS = ['intern', 'fresher', 'junior', 'middle', 'senior', 'expert'] as const;
export const LevelSchema = z.enum(LEVELS);

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

/** Emotional colour of a scene: drives the animated background (problem=red, concept=blue/purple, ...). */
export const MOODS = ['neutral', 'problem', 'concept', 'solution', 'warning'] as const;
export const MoodSchema = z.enum(MOODS);

/** A phrase of the narration; the item it belongs to appears exactly when the phrase is spoken. */
export const SpokenAtSchema = z.string().min(1);

/** Icons the visual scenes can draw (inline SVG). */
export const ICONS = [
  'book',
  'pages',
  'list',
  'search',
  'database',
  'server',
  'tree',
  'clock',
  'bolt',
  'warning',
  'check',
  'cross',
  'lock',
  'cloud',
  'code',
  'user',
] as const;
export const IconSchema = z.enum(ICONS);

export const TONES = ['good', 'bad', 'neutral'] as const;
export const ToneSchema = z.enum(TONES);

/** Fields shared by every scene. Each scene schema extends this with `type` and `props`. */
export const sceneBaseShape = {
  id: SlugSchema,
  voice: z.string().min(1),
  sources: SourcesSchema.optional(),
  draft: DraftSchema,
  /** Background colour mood; defaults to the scene type's natural mood. */
  mood: MoodSchema.optional(),
};

export type Source = z.infer<typeof SourceSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type Mood = z.infer<typeof MoodSchema>;
export type Icon = z.infer<typeof IconSchema>;
export type Tone = z.infer<typeof ToneSchema>;
