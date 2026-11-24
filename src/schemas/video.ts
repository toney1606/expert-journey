import { z } from 'zod';
import { CalloutSceneSchema } from '../scenes/Callout/schema';
import { CodeSceneSchema } from '../scenes/CodeDiff/schema';
import { CompareSceneSchema } from '../scenes/Compare/schema';
import { DiagramSceneSchema } from '../scenes/Diagram/schema';
import { EndCardSceneSchema } from '../scenes/EndCard/schema';
import { HookSceneSchema } from '../scenes/HookCard/schema';
import { StatSceneSchema } from '../scenes/Stat/schema';
import { SummarySceneSchema } from '../scenes/Summary/schema';
import { TerminalSceneSchema } from '../scenes/Terminal/schema';
import { TradeoffSceneSchema } from '../scenes/Tradeoff/schema';
import { CounterHookSceneSchema } from '../scenes/CounterHook/schema';
import { PageTreeSceneSchema } from '../scenes/PageTree/schema';
import { CostRoadsSceneSchema } from '../scenes/CostRoads/schema';
import { RowSetupSceneSchema } from '../scenes/RowSetup/schema';
import { RowTwistSceneSchema } from '../scenes/RowTwist/schema';
import { RowFixSceneSchema } from '../scenes/RowFix/schema';
import { IndexCardsSceneSchema } from '../scenes/IndexCards/schema';
import { PageSliderSceneSchema } from '../scenes/PageSlider/schema';
import { LevelSchema, SlugSchema, SourcesSchema } from './common';

export const SceneSchema = z.discriminatedUnion('type', [
  HookSceneSchema,
  DiagramSceneSchema,
  CodeSceneSchema,
  TerminalSceneSchema,
  TradeoffSceneSchema,
  SummarySceneSchema,
  StatSceneSchema,
  CompareSceneSchema,
  CalloutSceneSchema,
  EndCardSceneSchema,
  CounterHookSceneSchema,
  PageTreeSceneSchema,
  CostRoadsSceneSchema,
  RowSetupSceneSchema,
  RowTwistSceneSchema,
  RowFixSceneSchema,
  IndexCardsSceneSchema,
  PageSliderSceneSchema,
]);

export const VideoMetaSchema = z.strictObject({
  id: SlugSchema,
  title: z.string().min(1),
  /** Slug of the topic folder: content/<level>/<ddmmyyyy>/<topic>/. */
  topic: SlugSchema,
  level: LevelSchema,
  /** The real interview question this video answers. */
  question: z.string().min(1),
  status: z.enum(['draft', 'review', 'approved', 'published']).default('draft'),
  /** Content policy: AI voice label must be on. */
  aiVoiceLabel: z.boolean().default(true),
  /** `private`: produced for the owner only (e.g. it belongs to a later point of the path). */
  visibility: z.enum(['public', 'private']).default('public'),
});

export const VideoSchema = z
  .strictObject({
    meta: VideoMetaSchema,
    /** Content policy: every video cites its sources (may be empty only for original material). */
    sources: SourcesSchema,
    scenes: z.array(SceneSchema).min(1),
  })
  .superRefine((video, ctx) => {
    const seen = new Set<string>();
    video.scenes.forEach((scene, index) => {
      if (seen.has(scene.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate scene id "${scene.id}"`,
          path: ['scenes', index, 'id'],
        });
      }
      seen.add(scene.id);
    });
  });

export type Scene = z.infer<typeof SceneSchema>;
export type SceneType = Scene['type'];
export type Video = z.output<typeof VideoSchema>;
export type VideoInput = z.input<typeof VideoSchema>;
