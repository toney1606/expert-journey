import { EdgeTtsProvider } from './providers/edge';
import { ElevenLabsProvider } from './providers/elevenlabs';
import { FakeTtsProvider } from './providers/fake';
import { ImportProvider } from './providers/import';
import type { TtsProvider } from './types';

const PROVIDERS: Record<string, () => TtsProvider> = {
  fake: () => new FakeTtsProvider(),
  edge: () => new EdgeTtsProvider(),
  elevenlabs: () => new ElevenLabsProvider(),
  import: () => new ImportProvider(),
};

export const providerNames = (): string[] => Object.keys(PROVIDERS);

/** Resolve a provider by name, falling back to TTS_PROVIDER, then "fake". */
export const createProvider = (name?: string): TtsProvider => {
  const resolved = name ?? process.env.TTS_PROVIDER ?? 'fake';
  const factory = PROVIDERS[resolved];
  if (!factory) {
    throw new Error(`Unknown TTS provider "${resolved}". Available: ${providerNames().join(', ')}`);
  }
  return factory();
};
