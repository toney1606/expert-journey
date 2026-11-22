import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

  it('reports invalid JSON and schema errors', () => {
    const root = copyContent();
    writeFileSync(join(root, 'content/videos/broken.json'), '{ nope');
    writeFileSync(join(root, 'content/videos/empty.json'), '{}');
    const { issues } = validateContent(root);
    expect(issues.some((i) => i.file.endsWith('broken.json'))).toBe(true);
    expect(issues.some((i) => i.file.endsWith('empty.json'))).toBe(true);
  });

  it('reports a video whose topic folder does not exist', () => {
    const root = copyContent();
    rmSync(join(root, 'content/topics/database-index'), { recursive: true });
    const { issues } = validateContent(root);
    expect(issues.some((i) => i.message.includes('no folder'))).toBe(true);
  });
});
