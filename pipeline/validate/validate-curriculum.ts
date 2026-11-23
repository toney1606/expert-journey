import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CurriculumSchema, LevelTopicsSchema } from '../../src/schemas/curriculum';

export type CurriculumIssue = { file: string; message: string };
export type CurriculumResult = { checked: string[]; issues: CurriculumIssue[] };

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

/**
 * Validates content/curriculum.json and every content/<level>/topics.json that exists:
 * schema, level matches the folder, exactly daysPerLevel x slots topics, slugs unique across levels.
 * Levels whose topics.json does not exist yet are skipped (they are still being researched).
 */
export const validateCurriculum = (root: string): CurriculumResult => {
  const result: CurriculumResult = { checked: [], issues: [] };
  const configPath = join(root, 'content', 'curriculum.json');
  if (!existsSync(configPath)) return result;

  const configRel = 'content/curriculum.json';
  result.checked.push(configRel);
  const rawConfig = readJson(configPath);
  if (!rawConfig.ok) {
    result.issues.push({ file: configRel, message: rawConfig.message });
    return result;
  }
  const parsedConfig = CurriculumSchema.safeParse(rawConfig.data);
  if (!parsedConfig.success) {
    for (const issue of parsedConfig.error.issues) {
      result.issues.push({
        file: configRel,
        message: `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`,
      });
    }
    return result;
  }
  const config = parsedConfig.data;
  const expected = config.daysPerLevel * config.slots.length;
  const owner = new Map<string, string>();

  for (const level of config.levels) {
    const rel = `content/${level}/topics.json`;
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    result.checked.push(rel);
    const raw = readJson(path);
    if (!raw.ok) {
      result.issues.push({ file: rel, message: raw.message });
      continue;
    }
    const parsed = LevelTopicsSchema.safeParse(raw.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        result.issues.push({
          file: rel,
          message: `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`,
        });
      }
      continue;
    }
    const file = parsed.data;
    if (file.level !== level) {
      result.issues.push({
        file: rel,
        message: `level "${file.level}" does not match folder "${level}"`,
      });
    }
    if (file.topics.length !== expected) {
      result.issues.push({
        file: rel,
        message: `expected ${expected} topics (${config.daysPerLevel} days x ${config.slots.length} slots), found ${file.topics.length}`,
      });
    }
    for (const topic of file.topics) {
      const previous = owner.get(topic.slug);
      if (previous) {
        result.issues.push({
          file: rel,
          message: `topic slug "${topic.slug}" is already used in ${previous}`,
        });
      } else {
        owner.set(topic.slug, rel);
      }
    }
  }
  return result;
};
