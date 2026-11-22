import type { SynthesisRequest, SynthesisResult, TtsProvider } from '../types';
import { encodeWav } from '../wav';

const SAMPLE_RATE = 8000;
const WORDS_PER_SECOND = 2.5; // ~150 wpm
const MIN_DURATION_SEC = 0.5;

/** Estimated speaking time for `text` at the given speed multiplier. */
export const estimateDurationSec = (text: string, speed = 1): number => {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_DURATION_SEC, words / WORDS_PER_SECOND / speed);
};

/** Offline provider: silent WAV whose length matches the estimated speech time. For dev and tests. */
export class FakeTtsProvider implements TtsProvider {
  readonly id = 'fake';

  async synthesize({ text, speed }: SynthesisRequest): Promise<SynthesisResult> {
    const durationSec = estimateDurationSec(text, speed);
    const samples = new Int16Array(Math.round(durationSec * SAMPLE_RATE));
    return { audio: encodeWav(samples, SAMPLE_RATE), format: 'wav', durationSec };
  }
}
