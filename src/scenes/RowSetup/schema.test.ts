import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RowSetupSceneSchema } from './schema';

const dir = resolve(process.cwd(), 'content/junior/23112026/database-index-guess');
const fragment: unknown = JSON.parse(readFileSync(resolve(dir, 'scenes/04-setup.json'), 'utf8'));

describe('RowSetupSceneSchema', () => {
  it('accepts the scene fragment of database-index-guess', () => {
    expect(RowSetupSceneSchema.safeParse(fragment).success).toBe(true);
  });
  it('keeps the voice identical to the approved script', () => {
    const script = readFileSync(resolve(dir, 'notes/script-v1.md'), 'utf8');
    const body = script.split(/^## /m).find((s) => s.startsWith('4 SetupScene'));
    const voice = body?.split('\n').slice(1).join('\n').trim();
    expect(RowSetupSceneSchema.parse(fragment).voice).toBe(voice);
  });
  it('rejects unknown props', () => {
    const bad = {
      ...(fragment as object),
      props: { ...(fragment as { props: object }).props, nope: 1 },
    };
    expect(RowSetupSceneSchema.safeParse(bad).success).toBe(false);
  });
});
