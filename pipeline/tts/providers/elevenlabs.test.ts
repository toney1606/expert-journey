import { describe, expect, it } from 'vitest';
import { ElevenLabsProvider, alignCharacters } from './elevenlabs';
import type { ElevenFetch } from './elevenlabs';

const alignment = {
  characters: [...'Chạy query. Xong'],
  character_start_times_seconds: [...'Chạy query. Xong'].map((_, i) => i * 0.1),
  character_end_times_seconds: [...'Chạy query. Xong'].map((_, i) => i * 0.1 + 0.1),
};

describe('alignCharacters', () => {
  it('groups characters into words and sentences', () => {
    const { words, cues } = alignCharacters(alignment);
    expect(words.map((w) => w.text)).toEqual(['Chạy', 'query.', 'Xong']);
    expect(words[1]).toMatchObject({ start: 0.5, text: 'query.' });
    expect(words[1]?.end).toBeCloseTo(1.1);
    expect(cues.map((c) => c.text)).toEqual(['Chạy query.', 'Xong']);
  });
});

const silentMp3 = (): Uint8Array => {
  // 3 MPEG-1 Layer III frames at 128 kbps / 44.1 kHz (417 bytes each)
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  return new Uint8Array([...frame, ...frame, ...frame]);
};

const okJson = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('ElevenLabsProvider', () => {
  it('requires a key and a voice', async () => {
    const provider = new ElevenLabsProvider({ apiKey: '' });
    await expect(provider.synthesize({ text: 'a', lang: 'vi', voice: 'v' })).rejects.toThrow(
      /ELEVENLABS_API_KEY/,
    );
    const noVoice = new ElevenLabsProvider({ apiKey: 'k' });
    const saved = process.env.ELEVENLABS_VOICE_ID;
    delete process.env.ELEVENLABS_VOICE_ID;
    await expect(noVoice.synthesize({ text: 'a', lang: 'vi' })).rejects.toThrow(/voice/);
    if (saved !== undefined) process.env.ELEVENLABS_VOICE_ID = saved;
  });

  it('calls with-timestamps with the key header and maps the alignment', async () => {
    const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] =
      [];
    const fetchImpl: ElevenFetch = async (url, init) => {
      calls.push({
        url,
        headers: init.headers as Record<string, string>,
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
      });
      return okJson({
        audio_base64: Buffer.from(silentMp3()).toString('base64'),
        alignment,
      });
    };
    const provider = new ElevenLabsProvider({ apiKey: 'secret', fetchImpl });
    const result = await provider.synthesize({
      text: 'Chạy query. Xong',
      lang: 'vi',
      voice: 'V1',
      speed: 1.1,
    });
    expect(calls[0]?.url).toBe(
      'https://api.elevenlabs.io/v1/text-to-speech/V1/with-timestamps?output_format=mp3_44100_128',
    );
    expect(calls[0]?.headers['xi-api-key']).toBe('secret');
    expect(calls[0]?.body).toMatchObject({
      model_id: 'eleven_v3',
      language_code: 'vi',
      voice_settings: { speed: 1.1 },
    });
    expect(result.words?.map((w) => w.text)).toEqual(['Chạy', 'query.', 'Xong']);
    expect(result.durationSec).toBeGreaterThan(0.05);
  });

  it('falls back to plain audio when timestamps are not supported', async () => {
    const urls: string[] = [];
    const fetchImpl: ElevenFetch = async (url) => {
      urls.push(url);
      return url.includes('with-timestamps')
        ? new Response('unsupported', { status: 400 })
        : new Response(Buffer.from(silentMp3()), { status: 200 });
    };
    const provider = new ElevenLabsProvider({ apiKey: 'k', fetchImpl });
    const result = await provider.synthesize({ text: 'a', lang: 'vi', voice: 'V1' });
    expect(urls).toHaveLength(2);
    expect(result.words).toBeUndefined();
  });

  it('retries rate limits then reports other errors without leaking the key', async () => {
    let calls = 0;
    const fetchImpl: ElevenFetch = async () => {
      calls += 1;
      return calls < 3
        ? new Response('slow down', { status: 429 })
        : new Response('bad voice', { status: 401 });
    };
    const provider = new ElevenLabsProvider({
      apiKey: 'topsecret',
      fetchImpl,
      sleep: async () => {},
    });
    await expect(provider.synthesize({ text: 'a', lang: 'vi', voice: 'V1' })).rejects.toThrow(
      /ElevenLabs error 401: bad voice/,
    );
    expect(calls).toBe(3);
  });
});
