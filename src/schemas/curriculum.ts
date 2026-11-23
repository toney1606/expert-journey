import { z } from 'zod';
import { LevelSchema, SlugSchema, SourceSchema } from './common';

/** content/curriculum.json: the publishing calendar. Dates are derived, never stored per topic. */
export const CurriculumSchema = z
  .strictObject({
    /** ISO date (YYYY-MM-DD) of the first day of the first level. */
    startDate: z.iso.date(),
    /** Publish times per day, in order; the number of slots is the number of videos per day. */
    slots: z.array(z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM')).min(1),
    daysPerLevel: z.number().int().positive(),
    /** Levels in publishing order. */
    levels: z.array(LevelSchema).min(1),
  })
  .superRefine((config, ctx) => {
    if (new Set(config.levels).size !== config.levels.length) {
      ctx.addIssue({ code: 'custom', message: 'duplicate level', path: ['levels'] });
    }
  });

export const TOPIC_AREAS = [
  'language',
  'algorithms',
  'database',
  'backend',
  'frontend',
  'networking',
  'security',
  'devops',
  'testing',
  'architecture',
  'tooling',
  'soft-skills',
] as const;

export const TopicEntrySchema = z.strictObject({
  /** Globally unique across all levels; used in folder names and video ids. */
  slug: SlugSchema,
  title: z.string().min(1),
  /** The real interview question this video answers. */
  question: z.string().min(1),
  area: z.enum(TOPIC_AREAS),
  /** One sentence: why interviewers ask it / what it separates. */
  why: z.string().min(1),
  /** Sources that back the topic (at least one). */
  sources: z.array(SourceSchema).min(1),
});

/** content/<level>/topics.json: ordered topic list; position decides the publishing day and slot. */
export const LevelTopicsSchema = z
  .strictObject({
    level: LevelSchema,
    topics: z.array(TopicEntrySchema).min(1),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.topics.forEach((topic, index) => {
      if (seen.has(topic.slug)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate topic slug "${topic.slug}"`,
          path: ['topics', index, 'slug'],
        });
      }
      seen.add(topic.slug);
    });
  });

export type Curriculum = z.infer<typeof CurriculumSchema>;
export type TopicEntry = z.infer<typeof TopicEntrySchema>;
export type LevelTopics = z.infer<typeof LevelTopicsSchema>;
