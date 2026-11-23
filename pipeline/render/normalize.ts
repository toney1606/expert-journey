import { existsSync, renameSync, rmSync } from 'node:fs';
import { dirname, extname, join, basename } from 'node:path';
import { runRemotionFfmpeg } from '../audio/loudness';

export const TARGET_LUFS = -14;
export const TARGET_TRUE_PEAK = -1.5;
const TARGET_LRA = 11;

export type LoudnormMeasure = {
  inputI: number;
  inputTp: number;
  inputLra: number;
  inputThresh: number;
  targetOffset: number;
};

/** Parse the JSON block printed by `loudnorm=print_format=json` (first pass). */
export const parseLoudnormMeasure = (stderr: string): LoudnormMeasure => {
  const field = (name: string): number => {
    const hit = [
      ...stderr.matchAll(new RegExp(`"${name}"\\s*:\\s*"(-?inf|-?[\\d.]+)"`, 'gi')),
    ].pop();
    if (!hit?.[1]) throw new Error(`No "${name}" in ffmpeg loudnorm output`);
    return /inf/i.test(hit[1]) ? Number.NEGATIVE_INFINITY : Number(hit[1]);
  };
  return {
    inputI: field('input_i'),
    inputTp: field('input_tp'),
    inputLra: field('input_lra'),
    inputThresh: field('input_thresh'),
    targetOffset: field('target_offset'),
  };
};

/** Keep the linear result this far below the true-peak target (dB) to absorb measurement rounding. */
const PEAK_MARGIN_DB = 0.1;

/** Filter of the first (measuring) pass. */
export const measureFilter = `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TRUE_PEAK}:LRA=${TARGET_LRA}:print_format=json`;

/**
 * Targets for the linear second pass. ffmpeg docs (loudnorm, `linear`): "the change in integrated loudness
 * [shouldn't] result in a true peak which exceeds the target TP ... [or] target LRA [be] lower than source LRA;
 * if any of these conditions aren't met, normalization mode will revert to dynamic". So when -14 LUFS would
 * push the peak over the limit we lower the integrated target just enough to keep the gain linear (quieter,
 * but never pumping or over the peak limit), and we never ask for an LRA below the source's.
 */
export const linearTargets = (m: LoudnormMeasure): { targetI: number; targetLra: number } => {
  const maxGain = TARGET_TRUE_PEAK - PEAK_MARGIN_DB - m.inputTp;
  const targetI = Math.min(TARGET_LUFS, m.inputI + maxGain);
  const targetLra = Math.min(50, Math.max(TARGET_LRA, Math.ceil(m.inputLra)));
  return { targetI: Math.round(targetI * 100) / 100, targetLra };
};

/** Filter of the second pass: linear gain with the measured values (no dynamic pumping). */
export const correctionFilter = (m: LoudnormMeasure): string => {
  const { targetI, targetLra } = linearTargets(m);
  const offset = Math.round((targetI - m.inputI) * 100) / 100;
  return (
    `loudnorm=I=${targetI}:TP=${TARGET_TRUE_PEAK}:LRA=${targetLra}` +
    `:measured_I=${m.inputI}:measured_TP=${m.inputTp}:measured_LRA=${m.inputLra}` +
    `:measured_thresh=${m.inputThresh}:offset=${offset}:linear=true:print_format=json`
  );
};

/** Temp file next to the input (same directory and extension, so ffmpeg keeps the container); never equals it. */
export const tempPathFor = (
  file: string,
  unique: string = `${process.pid}-${Date.now()}`,
): string => {
  const ext = extname(file);
  return join(dirname(file), `${basename(file, ext)}.normalized-${unique}${ext}`);
};

/**
 * Two-pass EBU R128 normalisation of an MP4's audio to about -14 LUFS (true peak <= -1.5 dBTP). The video
 * stream is copied untouched. Returns the measured loudness before the correction.
 */
export const normalizeLoudness = (file: string, cwd: string): LoudnormMeasure => {
  const measured = parseLoudnormMeasure(
    runRemotionFfmpeg(
      ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', measureFilter, '-f', 'null', '-'],
      cwd,
    ),
  );
  if (!Number.isFinite(measured.inputI))
    throw new Error('The video has no audible audio to normalise');
  const temp = tempPathFor(file);
  try {
    runRemotionFfmpeg(
      [
        '-hide_banner',
        '-nostats',
        '-y',
        '-i',
        file,
        '-c:v',
        'copy',
        '-af',
        correctionFilter(measured),
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '48000',
        '-movflags',
        '+faststart',
        temp,
      ],
      cwd,
    );
    renameSync(temp, file);
  } finally {
    if (existsSync(temp)) rmSync(temp);
  }
  return measured;
};
