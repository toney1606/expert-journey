import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateCurriculum } from './validate-curriculum';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const config = {
  startDate: '2026-11-22',
  slots: ['11:30', '19:30'],
  daysPerLevel: 1,
  levels: ['intern', 'fresher'],
};
const topic = (slug: string) => ({
  slug,
  title: slug,
  question: `Q ${slug}?`,
  area: 'database',
  why: 'why',
  sources: [{ title: 't', url: 'https://example.com' }],
});

const setup = (levels: Record<string, unknown>): string => {
  const root = mkdtempSync(join(tmpdir(), 'ej-cur-'));
  dirs.push(root);
  mkdirSync(join(root, 'content'), { recursive: true });
  writeFileSync(join(root, 'content/curriculum.json'), JSON.stringify(config));
  for (const [level, data] of Object.entries(levels)) {
    mkdirSync(join(root, 'content', level), { recursive: true });
    writeFileSync(join(root, 'content', level, 'topics.json'), JSON.stringify(data));
  }
  return root;
};

describe('validateCurriculum', () => {
  it('passes with correct counts and skips levels without topics.json', () => {
    const root = setup({ intern: { level: 'intern', topics: [topic('a'), topic('b')] } });
    expect(validateCurriculum(root).issues).toEqual([]);
  });
  it('reports a wrong topic count', () => {
    const root = setup({ intern: { level: 'intern', topics: [topic('a')] } });
    expect(
      validateCurriculum(root).issues.some((i) => i.message.includes('expected 2 topics')),
    ).toBe(true);
  });
  it('reports a level that does not match its folder', () => {
    const root = setup({ intern: { level: 'junior', topics: [topic('a'), topic('b')] } });
    expect(
      validateCurriculum(root).issues.some((i) => i.message.includes('does not match folder')),
    ).toBe(true);
  });
  it('reports a slug reused across levels', () => {
    const root = setup({
      intern: { level: 'intern', topics: [topic('a'), topic('b')] },
      fresher: { level: 'fresher', topics: [topic('b'), topic('c')] },
    });
    expect(validateCurriculum(root).issues.some((i) => i.message.includes('already used'))).toBe(
      true,
    );
  });
  it('is silent when there is no curriculum.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'ej-cur-'));
    dirs.push(root);
    expect(validateCurriculum(root)).toEqual({ checked: [], issues: [] });
  });
});
