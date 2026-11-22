import { z } from 'zod';
import { LevelSchema, SlugSchema, SourcesSchema } from './common';

export const InterviewKitSchema = z.strictObject({
  topic: SlugSchema,
  title: z.string().min(1),
  level: LevelSchema,
  question: z.string().min(1),
  followUps: z.array(z.string().min(1)),
  keyPoints: z.array(z.string().min(1)).min(1),
  weakAnswer: z.string().min(1),
  strongAnswer: z.string().min(1),
  pitfalls: z.array(z.string().min(1)),
  sources: SourcesSchema,
});

export type InterviewKit = z.infer<typeof InterviewKitSchema>;
