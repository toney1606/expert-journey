import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ZodType } from 'zod';
import { InterviewKitSchema } from '../../src/schemas/interview-kit';
import { VideoSchema } from '../../src/schemas/video';

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

const listDir = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).sort() : []);

/** Validate everything under `<root>/content` against the zod schemas. */
export const validateContent = (root: string): ValidationResult => {
  const result: ValidationResult = { checked: [], issues: [] };
  const content = join(root, 'content');

  const topics = new Set<string>();
  for (const topic of listDir(join(content, 'topics'))) {
    const dir = join(content, 'topics', topic);
    const kitRel = `content/topics/${topic}/interview-kit.json`;
    const kit = checkFile(join(dir, 'interview-kit.json'), kitRel, InterviewKitSchema, result) as
      { topic: string } | undefined;
    if (kit && kit.topic !== topic) {
      result.issues.push({
        file: kitRel,
        message: `topic "${kit.topic}" does not match folder name "${topic}"`,
      });
    }
    if (!existsSync(join(dir, 'research.md'))) {
      result.issues.push({
        file: `content/topics/${topic}`,
        message: 'missing research.md',
      });
    }
    topics.add(topic);
  }

  for (const file of listDir(join(content, 'videos'))) {
    if (!file.endsWith('.json')) continue;
    const rel = `content/videos/${file}`;
    const video = checkFile(join(content, 'videos', file), rel, VideoSchema, result) as
      | {
          meta: { id: string; topic: string };
          scenes: { id: string; type: string; props: unknown }[];
        }
      | undefined;
    if (!video) continue;
    if (`${video.meta.id}.json` !== file) {
      result.issues.push({
        file: rel,
        message: `meta.id "${video.meta.id}" does not match file name`,
      });
    }
    for (const scene of video.scenes) {
      const testPath =
        scene.type === 'code' ? (scene.props as { testPath: string }).testPath : undefined;
      if (testPath && !existsSync(join(root, testPath))) {
        result.issues.push({
          file: rel,
          message: `scene "${scene.id}": testPath "${testPath}" does not exist`,
        });
      }
    }
    if (!topics.has(video.meta.topic)) {
      result.issues.push({
        file: rel,
        message: `meta.topic "${video.meta.topic}" has no folder in content/topics/`,
      });
    }
  }

  return result;
};
