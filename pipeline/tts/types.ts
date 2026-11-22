export type AudioFormat = 'wav' | 'mp3';

export type SynthesisRequest = {
  text: string;
  lang: string;
  voice?: string;
  speed?: number;
};

export type SynthesisResult = {
  audio: Uint8Array;
  format: AudioFormat;
  /** Providers measure this themselves so callers never need to parse audio files. */
  durationSec: number;
};

/**
 * Contract every TTS provider implements. The rest of the pipeline depends only on this,
 * so switching vendor means adding one provider file and registering it.
 */
export interface TtsProvider {
  readonly id: string;
  synthesize(request: SynthesisRequest): Promise<SynthesisResult>;
}
