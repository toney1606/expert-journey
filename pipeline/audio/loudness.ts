// Loudness measurement through Remotion's bundled ffmpeg. That build has NO `ebur128` filter (checked with
// `remotion ffmpeg -filters`), but it has `loudnorm`, which runs the same EBU R128 measurement in its first pass.
import { spawnSync } from 'node:child_process';

export const TARGET_LUFS = -14;

export type Loudness = { integratedLufs: number; truePeakDb: number | undefined };

/**
 * Parse the JSON block `loudnorm=print_format=json` prints on stderr after processing:
 *
 *   {
 *     "input_i" : "-19.40",     <- integrated loudness, LUFS
 *     "input_tp" : "-2.10",     <- true peak, dBTP
 *     ...
 *   }
 *
 * We take the LAST "input_i" / "input_tp" (the summary). "-inf" (digital silence) parses to -Infinity.
 */
export const parseLoudnorm = (stderr: string): Loudness => {
  const number = (text: string): number => (/inf/i.test(text) ? -Infinity : Number(text));
  const field = (name: string): string | undefined =>
    [...stderr.matchAll(new RegExp(`"${name}"\\s*:\\s*"(-?inf|-?[\\d.]+)"`, 'gi'))].pop()?.[1];
  const integrated = field('input_i');
  if (integrated === undefined) throw new Error('No "input_i" in ffmpeg loudnorm output');
  const peak = field('input_tp');
  return {
    integratedLufs: number(integrated),
    truePeakDb: peak === undefined ? undefined : number(peak),
  };
};

/** Run `pnpm exec remotion ffmpeg` and return stderr (ffmpeg writes its report there). */
export const runRemotionFfmpeg = (args: string[], cwd: string): string => {
  const result = spawnSync('pnpm', ['exec', 'remotion', 'ffmpeg', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed (${result.status}): ${(result.stderr ?? '').slice(-600)}`);
  }
  return `${result.stderr ?? ''}`;
};

/** Integrated loudness (LUFS) and true peak (dBFS) of an audio file. */
export const measureLufs = (file: string, cwd = process.cwd()): Loudness =>
  parseLoudnorm(
    runRemotionFfmpeg(
      [
        '-hide_banner',
        '-nostats',
        '-i',
        file,
        '-vn', // the bundled ffmpeg has no encoder for video to the null muxer
        '-af',
        'loudnorm=I=-14:TP=-1:print_format=json',
        '-f',
        'null',
        '-',
      ],
      cwd,
    ),
  );

const powerSumDb = (a: number, b: number): number =>
  10 * Math.log10(10 ** (a / 10) + 10 ** (b / 10));

export type GainPlan = {
  /** Linear gain to apply to the voice (may exceed 1: then the player must support it). */
  voiceGain: number;
  /** Linear gain for the bed relative to the bed.wav as measured (unit level). */
  bedGain: number;
  voiceDb: number;
  bedDb: number;
  /** Expected integrated loudness of voice + bed (power sum, an estimate; below the target when capped). */
  expectedMixLufs: number;
  /** Worst-case summed sample peak (linear) after the gains: voice peak * voiceGain + bed peak. */
  mixPeakEstimate: number;
};

/** Sample peaks (linear, 0..1) used to keep voice + bed below a ceiling. */
export type PeakLimits = {
  voicePeak: number;
  bedUnitPeak: number;
  /** The bed alone never exceeds this peak (linear). */
  bedMaxPeak: number;
  /** Ceiling of the worst-case sum voice peak + bed peak (dBFS), e.g. -1. */
  mixCeilingDb: number;
};

/**
 * Gains so that voice + bed lands near `targetLufs`. The bed is placed `bedBelowVoiceDb` under the voice
 * (both measured integrated); then both are raised/lowered together so their power sum equals the target.
 * Power-summing assumes the two are uncorrelated and overlap in time, which is conservative: the true mix
 * is a little quieter or equal, so verify with `measureLufs` on a real mix.
 *
 * With `peaks`, the bed is also capped to `bedMaxPeak`, and the voice gain is lowered so that the worst case
 * (both peaks coincide) stays at or under `mixCeilingDb`; otherwise a later true-peak limiter or loudnorm
 * would have to work against a mix that already clips.
 */
export const planGains = (
  voiceLufs: number,
  bedLufs: number,
  bedBelowVoiceDb: number,
  targetLufs = TARGET_LUFS,
  /** Highest allowed voice gain in dB (e.g. from the voice's sample peak), so voice + bed cannot clip. */
  maxVoiceDb = Infinity,
  peaks?: PeakLimits,
): GainPlan => {
  const bedTargetRel = voiceLufs - bedBelowVoiceDb; // where the bed should sit if the voice stays put
  const mix = powerSumDb(voiceLufs, bedTargetRel);
  const bedOffsetDb = bedTargetRel - bedLufs; // bed gain relative to the voice gain
  let voiceDb = Math.min(targetLufs - mix, maxVoiceDb); // capped: mix ends up quieter than the target
  let bedDb = bedOffsetDb + voiceDb;
  let mixPeakEstimate = 0;
  if (peaks) {
    const ceiling = 10 ** (peaks.mixCeilingDb / 20);
    const bedMaxDb =
      20 * Math.log10(Math.min(peaks.bedMaxPeak, ceiling / 2) / Math.max(1e-9, peaks.bedUnitPeak));
    const bedPeakOf = (db: number): number => peaks.bedUnitPeak * 10 ** (db / 20);
    // Lowering the voice also lowers the bed (it follows the voice), so iterate; the sum only shrinks.
    for (let i = 0; i < 30; i += 1) {
      bedDb = Math.min(bedOffsetDb + voiceDb, bedMaxDb);
      const room = ceiling - bedPeakOf(bedDb);
      const next = Math.min(voiceDb, 20 * Math.log10(room / Math.max(1e-9, peaks.voicePeak)));
      if (next >= voiceDb - 1e-9) break;
      voiceDb = next;
    }
    bedDb = Math.min(bedOffsetDb + voiceDb, bedMaxDb);
    mixPeakEstimate = peaks.voicePeak * 10 ** (voiceDb / 20) + bedPeakOf(bedDb);
  }
  const keptMaster = Math.min(voiceDb, targetLufs - mix);
  return {
    voiceGain: 10 ** (voiceDb / 20),
    bedGain: 10 ** (bedDb / 20),
    voiceDb,
    bedDb,
    expectedMixLufs: mix + keptMaster,
    mixPeakEstimate,
  };
};
