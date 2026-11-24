import type { SynthesisCue, SynthesisRequest, SynthesisResult, TtsProvider } from '../types';
import { mp3DurationSec } from './mp3';

/** ElevenLabs API reference: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps */
const API_BASE = 'https://api.elevenlabs.io';
const OUTPUT_FORMAT = 'mp3_44100_128';
const DEFAULT_MODEL = 'eleven_v3';
const SENTENCE_END = /[.!?…]["')\]»”’]*$/u;
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

export type ElevenAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type ElevenFetch = (url: string, init: RequestInit) => Promise<Response>;

/** Group per-character timings into words (whitespace separated, punctuation kept) and sentence cues. */
export const alignCharacters = (
  alignment: ElevenAlignment,
): { words: SynthesisCue[]; cues: SynthesisCue[] } => {
  const words: SynthesisCue[] = [];
  const cues: SynthesisCue[] = [];
  let sentence: SynthesisCue[] = [];
  let text = '';
  let start = 0;
  let end = 0;

  const flushSentence = (): void => {
    const first = sentence[0];
    const last = sentence[sentence.length - 1];
    if (!first || !last) return;
    cues.push({ start: first.start, end: last.end, text: sentence.map((w) => w.text).join(' ') });
    sentence = [];
  };
  const flushWord = (): void => {
    if (text === '') return;
    const word = { start: Math.max(0, start), end: Math.max(start, end), text };
    words.push(word);
    sentence.push(word);
    if (SENTENCE_END.test(text)) flushSentence();
    text = '';
  };

  alignment.characters.forEach((char, index) => {
    if (/\s/u.test(char)) {
      flushWord();
      return;
    }
    const s = alignment.character_start_times_seconds[index] ?? end;
    const e = alignment.character_end_times_seconds[index] ?? s;
    if (text === '') start = s;
    end = e;
    text += char;
  });
  flushWord();
  flushSentence();
  return { words, cues };
};

export type ElevenLabsOptions = {
  apiKey?: string;
  model?: string;
  fetchImpl?: ElevenFetch;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const clampSpeed = (speed: number): number => Math.min(1.2, Math.max(0.7, speed));

const decode = (base64: string): Uint8Array => new Uint8Array(Buffer.from(base64, 'base64'));

/**
 * ElevenLabs text-to-speech. Key from ELEVENLABS_API_KEY (never logged), voice from `--voice` or
 * ELEVENLABS_VOICE_ID, model from ELEVENLABS_MODEL (default eleven_v3, Vietnamese supported). English terms
 * in the narration are read natively, so no pronunciation lexicon is applied here.
 */
export class ElevenLabsProvider implements TtsProvider {
  readonly id = 'elevenlabs';
  private readonly options: ElevenLabsOptions;

  constructor(options: ElevenLabsOptions = {}) {
    this.options = options;
  }

  private async post(
    url: string,
    headers: Record<string, string>,
    body: string,
  ): Promise<Response> {
    const doFetch: ElevenFetch = this.options.fetchImpl ?? ((u, init) => fetch(u, init));
    const sleep = this.options.sleep ?? defaultSleep;
    const attempts = this.options.maxAttempts ?? 4;
    let response = await doFetch(url, { method: 'POST', headers, body });
    for (let attempt = 1; attempt < attempts && RETRY_STATUS.has(response.status); attempt += 1) {
      await sleep(1500 * attempt);
      response = await doFetch(url, { method: 'POST', headers, body });
    }
    return response;
  }

  async synthesize({ text, voice, speed, lang }: SynthesisRequest): Promise<SynthesisResult> {
    const apiKey = this.options.apiKey ?? process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set (put it in .env, never in chat)');
    const voiceId = voice ?? process.env.ELEVENLABS_VOICE_ID;
    if (!voiceId)
      throw new Error('No ElevenLabs voice: pass --voice <voice_id> or set ELEVENLABS_VOICE_ID');
    const model = this.options.model ?? process.env.ELEVENLABS_MODEL ?? DEFAULT_MODEL;
    const body: Record<string, unknown> = { text, model_id: model, language_code: lang };
    if (speed !== undefined && speed !== 1) body.voice_settings = { speed: clampSpeed(speed) };
    const headers = { 'xi-api-key': apiKey, 'content-type': 'application/json' };
    const base = `${API_BASE}/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
    const query = `?output_format=${OUTPUT_FORMAT}`;

    const timed = await this.post(`${base}/with-timestamps${query}`, headers, JSON.stringify(body));
    if (timed.ok) {
      const json = (await timed.json()) as {
        audio_base64?: string;
        alignment?: ElevenAlignment | null;
      };
      if (!json.audio_base64) throw new Error('ElevenLabs returned no audio');
      const audio = decode(json.audio_base64);
      const aligned = json.alignment ? alignCharacters(json.alignment) : undefined;
      return {
        audio,
        format: 'mp3',
        durationSec: mp3DurationSec(audio),
        ...(aligned ? { cues: aligned.cues, words: aligned.words } : {}),
      };
    }
    if (![400, 404, 422].includes(timed.status)) {
      throw new Error(`ElevenLabs error ${timed.status}: ${(await timed.text()).slice(0, 300)}`);
    }
    // The model or voice may not support timestamps: fall back to plain audio (captions are then approximate).
    const plain = await this.post(`${base}${query}`, headers, JSON.stringify(body));
    if (!plain.ok) {
      throw new Error(`ElevenLabs error ${plain.status}: ${(await plain.text()).slice(0, 300)}`);
    }
    const audio = new Uint8Array(await plain.arrayBuffer());
    return { audio, format: 'mp3', durationSec: mp3DurationSec(audio) };
  }
}
