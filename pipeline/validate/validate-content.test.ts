import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateContent } from './validate-content';

const repoRoot = resolve(import.meta.dirname, '../..');
const dirs: string[] = [];

const copyContent = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ej-'));
  dirs.push(dir);
  cpSync(join(repoRoot, 'content'), join(dir, 'content'), { recursive: true });
  return dir;
};

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('validateContent', () => {
  it('passes on the repo content', () => {
    expect(validateContent(repoRoot).issues).toEqual([]);
  });

  type Json = {
    meta: Record<string, string>;
    topics: Record<string, unknown>[];
    [k: string]: unknown;
  };
  const T = 'content/junior/20122026/database-index';
  const edit = (root: string, rel: string, fn: (json: Json) => void) => {
    const path = join(root, rel);
    const json = JSON.parse(readFileSync(path, 'utf8'));
    fn(json);
    writeFileSync(path, JSON.stringify(json));
  };
  const messages = (root: string) =>
    validateContent(root).issues.map((i) => `${i.file}: ${i.message}`);

  it('reports invalid JSON and schema errors in video.json', () => {
    const root = copyContent();
    mkdirSync(join(root, 'content/samples/broken'), { recursive: true });
    mkdirSync(join(root, 'content/samples/empty'), { recursive: true });
    writeFileSync(join(root, 'content/samples/broken/video.json'), '{ nope');
    writeFileSync(join(root, 'content/samples/empty/video.json'), '{}');
    const { issues } = validateContent(root);
    expect(issues.some((i) => i.file.includes('samples/broken'))).toBe(true);
    expect(issues.some((i) => i.file.includes('samples/empty'))).toBe(true);
  });

  it('accepts a stub-only topic folder (research.md only)', () => {
    const root = copyContent();
    const dir = join(root, 'content/junior/20122026/stub-topic');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'research.md'), '# planned');
    expect(validateContent(root).issues).toEqual([]);
  });

  it('requires research.md when a kit or video exists', () => {
    const root = copyContent();
    rmSync(join(root, T, 'research.md'));
    expect(messages(root).some((m) => m.includes('missing research.md'))).toBe(true);
  });

  it('reports a meta.id that is not <ddmmyyyy>-<topic>', () => {
    const root = copyContent();
    edit(root, `${T}/video.json`, (v) => (v.meta.id = 'why-index'));
    expect(messages(root).some((m) => m.includes('must equal "20122026-database-index"'))).toBe(
      true,
    );
  });

  it('reports meta.topic, meta.level and kit topic/level mismatches', () => {
    const root = copyContent();
    edit(root, `${T}/video.json`, (v) => {
      v.meta.topic = 'other';
      v.meta.level = 'senior';
    });
    edit(root, `${T}/interview-kit.json`, (k) => {
      k.topic = 'other';
      k.level = 'senior';
    });
    const found = messages(root);
    expect(found.some((m) => m.includes('meta.topic'))).toBe(true);
    expect(found.some((m) => m.includes('meta.level'))).toBe(true);
    expect(found.some((m) => m.includes('interview-kit.json: topic'))).toBe(true);
    expect(found.some((m) => m.includes('interview-kit.json: level'))).toBe(true);
  });

  it('reports a code scene whose testPath does not exist', () => {
    const root = copyContent();
    rmSync(join(root, T, 'code/lookup.test.ts'));
    expect(messages(root).some((m) => m.includes('testPath'))).toBe(true);
  });

  it('reports day folders that are not a valid ddmmyyyy date', () => {
    const root = copyContent();
    mkdirSync(join(root, 'content/junior/2026-12-21/x'), { recursive: true });
    mkdirSync(join(root, 'content/junior/31022027/y'), { recursive: true });
    const found = messages(root);
    expect(found.some((m) => m.includes('2026-12-21') && m.includes('ddmmyyyy'))).toBe(true);
    expect(found.some((m) => m.includes('31022027') && m.includes('ddmmyyyy'))).toBe(true);
  });

  it('reports a folder date that differs from the date derived from topics.json', () => {
    const root = copyContent();
    const topics = join(root, 'content/junior/topics.json');
    if (!existsSync(topics)) {
      writeFileSync(
        topics,
        JSON.stringify({
          level: 'junior',
          topics: [
            {
              slug: 'database-index',
              title: 't',
              question: 'q',
              area: 'database',
              why: 'w',
              sources: [{ title: 's' }],
            },
          ],
        }),
      );
    }
    edit(root, 'content/junior/topics.json', (t) => {
      // move database-index to position 2 -> 2026-12-21, but the folder says 20122026
      const first = t.topics[0] as Record<string, unknown>;
      t.topics = [{ ...first, slug: 'first-topic' }, { ...first, slug: 'second-topic' }, first];
    });
    expect(messages(root).some((m) => m.includes('20122026') && m.includes('21122026'))).toBe(true);
  });

  it('reports a sample whose meta.id differs from its folder', () => {
    const root = copyContent();
    edit(root, 'content/samples/sample/video.json', (v) => (v.meta.id = 'other'));
    expect(messages(root).some((m) => m.includes('does not match folder name "sample"'))).toBe(
      true,
    );
  });
});
