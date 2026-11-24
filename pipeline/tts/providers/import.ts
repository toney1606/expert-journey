import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { alignWords } from './edge-align';
import { alignCharacters } from './elevenlabs';
import type { ElevenAlignment } from './elevenlabs';
import { mp3DurationSec } from './mp3';
import type { SynthesisCue, SynthesisRequest, SynthesisResult, TtsProvider } from '../types';

type ForcedAlignment = { characters: { text: string; start: number; end: number }[] };

/**
 * Real timings for a hand-made clip via ElevenLabs forced alignment (cached next to the mp3 as `.align.json`
 * so a rerun costs nothing). Returns undefined when there is no key or the call fails: the caller then falls
 * back to the length-based estimate.
 */
export const forcedAlignment = async (
  mp3Path: string,
  text: string,
): Promise<ElevenAlignment | undefined> => {
  const cachePath = `${mp3Path}.align.json`;
  let data: ForcedAlignment | undefined;
  if (existsSync(cachePath)) {
    data = JSON.parse(readFileSync(cachePath, 'utf8')) as ForcedAlignment;
  } else {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return undefined;
    const form = new FormData();
    form.append('file', new Blob([readFileSync(mp3Path)], { type: 'audio/mpeg' }), 'clip.mp3');
    form.append('text', text);
    const response = await fetch('https://api.elevenlabs.io/v1/forced-alignment', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    });
    if (!response.ok) return undefined;
    data = (await response.json()) as ForcedAlignment;
    writeFileSync(cachePath, JSON.stringify(data));
  }
  if (!data || data.characters.length === 0) return undefined;
  return {
    characters: data.characters.map((c) => c.text),
    character_start_times_seconds: data.characters.map((c) => c.start),
    character_end_times_seconds: data.characters.map((c) => c.end),
  };
};

export type ImportIndexEntry = { file: string; text: string };

const norm = (text: string): string => text.normalize('NFC').replace(/\s+/gu, ' ').trim();

/** Spread `durationSec` over the words of `text`, weighted by letter count (no real word timings exist). */
export const estimateWords = (text: string, durationSec: number): SynthesisCue[] => {
  const tokens = norm(text)
    .split(' ')
    .filter((t) => t.length > 0);
  const weights = tokens.map((t) => Math.max(1, t.replace(/[^\p{L}\p{N}]/gu, '').length) + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let at = 0;
  return tokens.map((token, i) => {
    const start = at;
    at += ((weights[i] ?? 1) / total) * durationSec;
    return { start, end: at, text: token.replace(/[.,!?;:…)\]}"'»”’]+$/u, '') };
  });
};

/**
 * Reads audio the owner exported by hand (e.g. from the ElevenLabs web app, which allows library voices on
 * the free plan). `--voice` (or TTS_IMPORT_DIR) is a directory holding `index.json` ([{file, text}]) and the
 * mp3 files. A clip is matched by its narration text; word timings come from ElevenLabs forced alignment (cached), else are estimated from the clip length.
 */
export class ImportProvider implements TtsProvider {
  readonly id = 'import';

  async synthesize({ text, voice }: SynthesisRequest): Promise<SynthesisResult> {
    const dir = voice ?? process.env.TTS_IMPORT_DIR;
    if (!dir) throw new Error('import provider: pass --voice <dir> or set TTS_IMPORT_DIR');
    const root = resolve(dir);
    const indexPath = join(root, 'index.json');
    if (!existsSync(indexPath)) throw new Error(`import provider: ${indexPath} not found`);
    const index = JSON.parse(readFileSync(indexPath, 'utf8')) as ImportIndexEntry[];
    const entry = index.find((e) => norm(e.text) === norm(text));
    if (!entry)
      throw new Error(`import provider: no clip in index.json for text "${text.slice(0, 40)}…"`);
    const path = join(root, entry.file);
    if (!existsSync(path)) throw new Error(`import provider: missing file ${path}`);
    const audio = new Uint8Array(readFileSync(path));
    const durationSec = mp3DurationSec(audio);
    if (!(durationSec > 0)) throw new Error(`import provider: ${path} is not a readable mp3`);
    const forced = await forcedAlignment(path, norm(text));
    const { words, cues } = forced
      ? alignCharacters(forced)
      : alignWords(text, estimateWords(text, durationSec));
    return { audio, format: 'mp3', durationSec, words, cues };
  }
}
