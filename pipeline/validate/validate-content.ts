import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ZodType } from 'zod';
import { InterviewKitSchema } from '../../src/schemas/interview-kit';
import { VideoSchema } from '../../src/schemas/video';
import { scheduleFor, dayFolderName } from '../content/paths';
import {
  discoverSamples,
  discoverTopicFolders,
  levelTopicSlugs,
  loadCurriculum,
  parseDayFolder,
} from '../content/discover';
import { validateCurriculum } from './validate-curriculum';

export type ValidationIssue = { file: string; message: string };

export type ValidationResult = { checked: string[]; issues: ValidationIssue[] };

const formatZodIssues = (error: { issues: { path: PropertyKey[]; message: string }[] }): string[] =>
  error.issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);

const readJson = (path: string): { ok: true; data: unknown } | { ok: false; message: string } => {
  try {
    return { ok: true, data: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (error) {
    return {
      ok: false,
      message: `invalid JSON: ${error instanceof Error ? error.message : error}`,
    };
  }
};

const checkFile = (
  path: string,
  relative: string,
  schema: ZodType,
  result: ValidationResult,
): unknown => {
  result.checked.push(relative);
  const json = readJson(path);
  if (!json.ok) {
    result.issues.push({ file: relative, message: json.message });
    return undefined;
  }
  const parsed = schema.safeParse(json.data);
  if (!parsed.success) {
    for (const message of formatZodIssues(parsed.error)) {
      result.issues.push({ file: relative, message });
    }
    return undefined;
  }
  return parsed.data;
};

type KitLike = { topic: string; level: string };
type VideoLike = {
  meta: { id: string; topic: string; level: string };
  scenes: { id: string; type: string; props: unknown }[];
};

const checkVideo = (
  root: string,
  dir: string,
  rel: string,
  result: ValidationResult,
): VideoLike | undefined => {
  const file = join(dir, 'video.json');
  if (!existsSync(file)) return undefined;
  const video = checkFile(file, `${rel}/video.json`, VideoSchema, result) as VideoLike | undefined;
  if (!video) return undefined;
  for (const scene of video.scenes) {
    const testPath =
      scene.type === 'code' ? (scene.props as { testPath: string }).testPath : undefined;
    if (testPath && !existsSync(join(root, testPath))) {
      result.issues.push({
        file: `${rel}/video.json`,
        message: `scene "${scene.id}": testPath "${testPath}" does not exist`,
      });
    }
  }
  return video;
};

/** Validate everything under `<root>/content` against the zod schemas and the folder layout. */
export const validateContent = (root: string): ValidationResult => {
  const result: ValidationResult = { checked: [], issues: [] };
  const config = loadCurriculum(root);
  const slugCache = new Map<string, string[] | undefined>();

  for (const folder of discoverTopicFolders(root)) {
    const { level, day, topic, dir, rel } = folder;
    const issue = (file: string, message: string) => result.issues.push({ file, message });

    const iso = parseDayFolder(day);
    if (!iso) {
      issue(`content/${level}/${day}`, 'day folder must be a valid date named ddmmyyyy (8 digits)');
    }

    const kitFile = join(dir, 'interview-kit.json');
    const kit = existsSync(kitFile)
      ? (checkFile(kitFile, `${rel}/interview-kit.json`, InterviewKitSchema, result) as
          KitLike | undefined)
      : undefined;
    if (kit && kit.topic !== topic) {
      issue(
        `${rel}/interview-kit.json`,
        `topic "${kit.topic}" does not match folder name "${topic}"`,
      );
    }
    if (kit && kit.level !== level) {
      issue(
        `${rel}/interview-kit.json`,
        `level "${kit.level}" does not match level folder "${level}"`,
      );
    }

    const video = checkVideo(root, dir, rel, result);
    if (video) {
      const file = `${rel}/video.json`;
      if (video.meta.id !== `${day}-${topic}`) {
        issue(file, `meta.id "${video.meta.id}" must equal "${day}-${topic}"`);
      }
      if (video.meta.topic !== topic) {
        issue(file, `meta.topic "${video.meta.topic}" does not match folder name "${topic}"`);
      }
      if (video.meta.level !== level) {
        issue(file, `meta.level "${video.meta.level}" does not match level folder "${level}"`);
      }
    }

    if (
      (kit || existsSync(kitFile) || existsSync(join(dir, 'video.json'))) &&
      !existsSync(join(dir, 'research.md'))
    ) {
      issue(rel, 'missing research.md');
    }

    if (iso && config) {
      if (!slugCache.has(level)) slugCache.set(level, levelTopicSlugs(root, level));
      const index = slugCache.get(level)?.indexOf(topic) ?? -1;
      if (index !== -1) {
        try {
          const expected = scheduleFor(config, level, index).date;
          if (expected !== iso) {
            issue(
              rel,
              `folder date ${day} does not match the date ${dayFolderName(expected)} derived from position ${index} in content/${level}/topics.json`,
            );
          }
        } catch {
          // position outside the level's range: validateCurriculum reports it
        }
      }
    }
  }

  for (const sample of discoverSamples(root)) {
    const video = checkVideo(root, sample.dir, sample.rel, result);
    if (!existsSync(join(sample.dir, 'video.json'))) {
      result.issues.push({ file: sample.rel, message: 'missing video.json' });
    } else if (video && video.meta.id !== sample.id) {
      result.issues.push({
        file: `${sample.rel}/video.json`,
        message: `meta.id "${video.meta.id}" does not match folder name "${sample.id}"`,
      });
    }
  }

  const curriculum = validateCurriculum(root);
  result.checked.push(...curriculum.checked);
  result.issues.push(...curriculum.issues);

  return result;
};
