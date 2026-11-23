import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Level } from '../../src/schemas/common';
import { LevelTopicsSchema } from '../../src/schemas/curriculum';
import type { TopicEntry } from '../../src/schemas/curriculum';
import { curriculumLevels, loadCurriculum } from '../content/discover';
import { scheduleFor, dayFolderName, topicDir, videoIdFor } from '../content/paths';

/** First line of every scaffolded research.md; its presence means "not researched yet". */
export const SCAFFOLD_MARKER = '<!-- scaffold:research v1 -->';

export const PLAN_STATUSES = [
  'planned',
  'stub',
  'researched',
  'scripted',
  'voiced',
  'rendered',
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export type PlanEntry = {
  level: Level;
  /** 0-based position within the level. */
  index: number;
  topic: string;
  title: string;
  question: string;
  /** ISO date. */
  date: string;
  /** ddmmyyyy. */
  dayFolder: string;
  /** 0-based day within the level. */
  dayIndex: number;
  slot: string;
  videoId: string;
  /** Absolute topic folder. */
  dir: string;
  status: PlanStatus;
  flags: string[];
  entry: TopicEntry;
};

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
};

const isStub = (path: string): boolean => {
  try {
    return readFileSync(path, 'utf8').includes(SCAFFOLD_MARKER);
  } catch {
    return false;
  }
};

const statusOf = (
  root: string,
  dir: string,
  videoId: string,
): { status: PlanStatus; flags: string[] } => {
  const flags: string[] = [];
  const research = join(dir, 'research.md');
  const kit = existsSync(join(dir, 'interview-kit.json'));
  const videoFile = join(dir, 'video.json');
  const video = existsSync(videoFile);
  let status: PlanStatus = 'planned';
  if (existsSync(research)) status = isStub(research) ? 'stub' : 'researched';
  if (kit && (status === 'planned' || status === 'stub')) status = 'researched';
  if (video) status = 'scripted';
  if (video && existsSync(join(root, 'public', 'generated', 'audio', videoId, 'manifest.json'))) {
    status = 'voiced';
  }
  if (video && existsSync(join(root, 'out', `${videoId}.mp4`))) status = 'rendered';
  if (status !== 'planned' && status !== 'stub' && !kit) flags.push('missing-kit');
  if (video) {
    const meta = (readJson(videoFile) as { meta?: { visibility?: string } } | undefined)?.meta;
    if (meta?.visibility === 'private') flags.push('private');
  }
  return { status, flags };
};

/** Ordered plan (levels in curriculum order, topics in topics.json order) with the on-disk status of each. */
export const buildPlan = ({ root }: { root: string }): PlanEntry[] => {
  const config = loadCurriculum(root);
  if (!config) throw new Error('content/curriculum.json is missing or invalid');
  const plan: PlanEntry[] = [];
  for (const level of curriculumLevels(root)) {
    const parsed = LevelTopicsSchema.safeParse(
      readJson(join(root, 'content', level, 'topics.json')),
    );
    if (!parsed.success) continue;
    parsed.data.topics.forEach((entry, index) => {
      const { date, slot, dayIndex } = scheduleFor(config, level, index);
      const videoId = videoIdFor(date, entry.slug);
      const dir = topicDir(root, level, date, entry.slug);
      plan.push({
        level,
        index,
        topic: entry.slug,
        title: entry.title,
        question: entry.question,
        date,
        dayFolder: dayFolderName(date),
        dayIndex,
        slot,
        videoId,
        dir,
        entry,
        ...statusOf(root, dir, videoId),
      });
    });
  }
  return plan;
};
