/**
 * Find and audition ElevenLabs voices (needs ELEVENLABS_API_KEY in .env).
 *   pnpm exec tsx pipeline/tts/elevenlabs-voices.ts list [search words]
 *   pnpm exec tsx pipeline/tts/elevenlabs-voices.ts sample <outDir> <voice_id>[,<voice_id>...] ["text"]
 * `list` prints voices that declare Vietnamese; `sample` writes one mp3 per voice reading the same text
 * (default: the hook line) so the owner can listen and choose. The key is never printed.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ElevenLabsProvider } from './providers/elevenlabs';

const root = resolve(import.meta.dirname, '../..');
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));

const DEFAULT_TEXT =
  'Một câu query chạy mười hai mili giây suốt sáu tháng. Sáng nay, một phẩy hai giây. Chậm gấp trăm lần. Không ai đổi code. Không ai đổi index. Database không biết trước kết quả. Nó đoán. Và hôm nay, nó đoán sai.';

type VoiceInfo = {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  verified_languages?: { language?: string; model_id?: string; preview_url?: string }[];
  preview_url?: string | null;
};

const apiKey = (): string => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set (put it in .env)');
  return key;
};

const list = async (search: string): Promise<void> => {
  const params = new URLSearchParams({ language: 'vi', page_size: '100' });
  if (search) params.set('search', search);
  const response = await fetch(`https://api.elevenlabs.io/v2/voices?${params.toString()}`, {
    headers: { 'xi-api-key': apiKey() },
  });
  if (!response.ok)
    throw new Error(
      `ElevenLabs error ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  const json = (await response.json()) as { voices: VoiceInfo[]; total_count?: number };
  if (json.voices.length === 0) console.log('No voices matched; try another search word.');
  for (const voice of json.voices) {
    const vi = voice.verified_languages?.find((l) => l.language === 'vi');
    const labels = Object.entries(voice.labels ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    console.log(`${voice.voice_id}  ${voice.name}  ${labels}`);
    const preview = vi?.preview_url ?? voice.preview_url;
    if (preview) console.log(`    preview: ${preview}`);
  }
};

const sample = async (outDir: string, ids: string[], text: string): Promise<void> => {
  mkdirSync(outDir, { recursive: true });
  const provider = new ElevenLabsProvider();
  for (const id of ids) {
    const result = await provider.synthesize({ text, lang: 'vi', voice: id });
    const file = join(outDir, `${id}.mp3`);
    writeFileSync(file, result.audio);
    console.log(`✓ ${file} (${result.durationSec.toFixed(1)}s)`);
  }
};

const [command, ...rest] = process.argv.slice(2);
const run = async (): Promise<void> => {
  if (command === 'list') return list(rest.join(' '));
  if (command === 'sample' && rest[0] && rest[1]) {
    return sample(resolve(rest[0]), rest[1].split(','), rest[2] ?? DEFAULT_TEXT);
  }
  console.error('Usage: list [search] | sample <outDir> <voice_id,...> ["text"]');
  process.exitCode = 1;
};
run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
