import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ImportProvider, estimateWords } from './import';

const frame = new Uint8Array(417);
frame.set([0xff, 0xfb, 0x90, 0x00]);
const mp3 = new Uint8Array([...frame, ...frame, ...frame]);

describe('estimateWords', () => {
  it('covers the whole duration in order', () => {
    const words = estimateWords('Chạy query. Xong', 3);
    expect(words.map((w) => w.text)).toEqual(['Chạy', 'query', 'Xong']);
    expect(words[0]?.start).toBe(0);
    expect(words[2]?.end).toBeCloseTo(3);
  });
});

describe('ImportProvider', () => {
  it('matches a clip by text and measures it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'import-'));
    writeFileSync(join(dir, 'a.mp3'), mp3);
    writeFileSync(
      join(dir, 'index.json'),
      JSON.stringify([{ file: 'a.mp3', text: 'Chạy  query.' }]),
    );
    const result = await new ImportProvider().synthesize({
      text: 'Chạy query.',
      lang: 'vi',
      voice: dir,
    });
    expect(result.format).toBe('mp3');
    expect(result.durationSec).toBeGreaterThan(0);
    expect(result.words?.map((w) => w.text)).toEqual(['Chạy', 'query.']);
  });

  it('fails clearly without a directory or a match', async () => {
    delete process.env.TTS_IMPORT_DIR;
    await expect(new ImportProvider().synthesize({ text: 'x', lang: 'vi' })).rejects.toThrow(
      /--voice/,
    );
    const dir = mkdtempSync(join(tmpdir(), 'import-'));
    writeFileSync(join(dir, 'index.json'), '[]');
    await expect(
      new ImportProvider().synthesize({ text: 'x', lang: 'vi', voice: dir }),
    ).rejects.toThrow(/no clip/);
  });
});
