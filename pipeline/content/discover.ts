import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEVELS } from '../../src/schemas/common';
import type { Level } from '../../src/schemas/common';
import { CurriculumSchema, LevelTopicsSchema } from '../../src/schemas/curriculum';
import type { Curriculum } from '../../src/schemas/curriculum';

export type TopicFolder = {
  level: Level;
  /** Day folder name as found on disk (expected ddmmyyyy). */
  day: string;
  topic: string;
  /** Absolute path. */
  dir: string;
  /** Path relative to the repo root, e.g. content/junior/20122026/database-index. */
  rel: string;
};

export type SampleFolder = { id: string; dir: string; rel: string };

const subdirs = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

const readJsonOrUndefined = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
};

/** content/curriculum.json when it parses, otherwise undefined (validateCurriculum reports the problem). */
export const loadCurriculum = (root: string): Curriculum | undefined => {
  const parsed = CurriculumSchema.safeParse(
    readJsonOrUndefined(join(root, 'content', 'curriculum.json')),
  );
  return parsed.success ? parsed.data : undefined;
};

/** Levels from the curriculum, falling back to the full LEVELS list. */
export const curriculumLevels = (root: string): readonly Level[] =>
  loadCurriculum(root)?.levels ?? LEVELS;

/** Ordered slugs of content/<level>/topics.json, or undefined when the file is missing or invalid. */
export const levelTopicSlugs = (root: string, level: Level): string[] | undefined => {
  const parsed = LevelTopicsSchema.safeParse(
    readJsonOrUndefined(join(root, 'content', level, 'topics.json')),
  );
  return parsed.success ? parsed.data.topics.map((topic) => topic.slug) : undefined;
};

/** "20122026" -> "2026-12-20"; undefined when not 8 digits or not a real calendar date. */
export const parseDayFolder = (name: string): string | undefined => {
  const match = /^(\d{2})(\d{2})(\d{4})$/.exec(name);
  if (!match) return undefined;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date.toISOString().slice(0, 10) : undefined;
};

/** Every content/<level>/<day>/<topic>/ folder, for the levels that exist on disk. */
export const discoverTopicFolders = (root: string): TopicFolder[] => {
  const content = join(root, 'content');
  const found: TopicFolder[] = [];
  for (const level of curriculumLevels(root)) {
    for (const day of subdirs(join(content, level))) {
      for (const topic of subdirs(join(content, level, day))) {
        found.push({
          level,
          day,
          topic,
          dir: join(content, level, day, topic),
          rel: `content/${level}/${day}/${topic}`,
        });
      }
    }
  }
  return found;
};

/** Every content/samples/<id>/ folder. */
export const discoverSamples = (root: string): SampleFolder[] =>
  subdirs(join(root, 'content', 'samples')).map((id) => ({
    id,
    dir: join(root, 'content', 'samples', id),
    rel: `content/samples/${id}`,
  }));
