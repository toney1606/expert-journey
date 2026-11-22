export type AudioFormat = 'wav' | 'mp3';

export type SynthesisRequest = {
  text: string;
  lang: string;
  voice?: string;
  speed?: number;
};

export type SynthesisCue = { start: number; end: number; text: string };

export type SynthesisResult = {
  audio: Uint8Array;
  format: AudioFormat;
  /** Providers measure this themselves so callers never need to parse audio files. */
  durationSec: number;
  /** Optional timing cues (seconds) when the provider reports sentence/word boundaries. */
  cues?: SynthesisCue[];
  /** Optional per-word timings (seconds from audio start) for word-by-word captions. */
  words?: SynthesisCue[];
};

/**
 * Contract every TTS provider implements. The rest of the pipeline depends only on this,
 * so switching vendor means adding one provider file and registering it.
 */
export interface TtsProvider {
  readonly id: string;
  synthesize(request: SynthesisRequest): Promise<SynthesisResult>;
}
