// Builds the synthesized sound design for one video: music bed (mood per scene), SFX on events,
// ducking under the narration, and a loudness plan. Output: public/generated/audio/<id>/bed.wav + bed.json.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultMoodFor } from '../../src/design/mood';
import { VIDEO } from '../../src/design/tokens';
import { SCENE_TAIL_SEC, sceneDurationsInFrames, sceneStartFrames } from '../../src/lib/duration';
import { findPhraseTime } from '../../src/lib/spoken';
import { AudioManifestSchema } from '../../src/schemas/audio-manifest';
import type { Mood } from '../../src/schemas/common';
import { findVideoFile } from '../content/paths';
import {
  SAMPLE_RATE,
  dbToGain,
  floatToWav,
  gainToDb,
  hashSeed,
  makeBuffer,
  mixInto,
  peakOf,
  softClip,
} from './dsp';
import { applyEnvelope, duckEnvelope } from './ducking';
import type { Interval } from './ducking';
import { TARGET_LUFS, measureLufs, planGains, runRemotionFfmpeg } from './loudness';
import type { GainPlan } from './loudness';
import { renderMusic } from './music';
import { SFX_HIT_OFFSET_SEC, renderSfx } from './sfx';
import type { SfxKind } from './sfx';

// ---- Tunable taste constants -------------------------------------------------------------------
/** Linear level of the music before ducking (pad/arp peaks are ~0.3 at unit level). */
export const MUSIC_LEVEL = 1;
/** Per-kind SFX level relative to the unit-level music. */
export const SFX_LEVELS: Record<SfxKind, number> = {
  whoosh: 0.55,
  pop: 0.35,
  tick: 0.22,
  thud: 0.6,
  riser: 0.4,
};
/** Music gain reduction while the narrator speaks. */
export const MUSIC_DUCK_DB = 12;
/** SFX gain reduction while the narrator speaks (less than music so effects stay audible). */
export const SFX_DUCK_DB = 4;
export const DUCK_ATTACK_SEC = 0.08;
export const DUCK_RELEASE_SEC = 0.45;
/** Pauses shorter than this between words keep the music ducked. */
export const DUCK_BRIDGE_SEC = 0.35;
/** Music crossfade length at scene changes. */
export const CROSSFADE_SEC = 1.2;
export const INTRO_FADE_SEC = 0.8;
export const OUTRO_FADE_SEC = 2.0;
/** Measured bed loudness is placed this far under the voice (integrated LUFS). */
export const BED_BELOW_VOICE_DB = 14;
/** Fallback when loudness cannot be measured: bed gain applied to the unit-level bed. */
export const FALLBACK_BED_GAIN_DB = -14;
/** The bed's sample peak never exceeds this (linear) so voice + bed keeps headroom. */
export const BED_MAX_PEAK = 0.5;
/** Voice sample peak after gain stays under this (dBFS); caps the loudness boost to avoid clipping. */
export const VOICE_PEAK_CEILING_DB = -1.5;
/** Worst case voice peak * voiceGain + bed peak stays under this (dBFS) so the final loudnorm can stay linear. */
export const MIX_PEAK_CEILING_DB = -1;
/** Tick burst for stat counters. */
export const TICK_COUNT = 14;
export const TICK_FIRST_GAP_SEC = 0.035;
export const TICK_LAST_GAP_SEC = 0.09;
/** Pops closer than this to the previous pop are dropped. */
export const POP_MIN_GAP_SEC = 0.15;
// -------------------------------------------------------------------------------------------------

export type SceneInput = {
  id: string;
  type: string;
  mood?: Mood | undefined;
  props?: unknown;
  durationSec: number; // audio duration (tail is added here)
  words?: readonly { start: number; end: number; text: string }[] | undefined;
};

export type SoundEvent = { time: number; kind: SfxKind; sceneId: string; gain: number };
export type ScenePlan = { id: string; mood: Mood; start: number; duration: number };
export type SoundPlan = {
  scenes: ScenePlan[];
  events: SoundEvent[];
  totalSec: number;
  speech: Interval[];
};

const POINT_KEYS = new Set([
  'at',
  'atHeadline',
  'atSubline',
  'pathAt',
  'statementAt',
  'explanationAt',
  'verdictAt',
  'loopAt',
  'morphAt',
  'testedAt',
]);
const LIST_KEYS = new Set(['pointsAt', 'cueAt']);

/** Every spoken-phrase field found anywhere in `props` (tolerant of any shape). */
export const collectRevealPhrases = (
  props: unknown,
  skipKeys: ReadonlySet<string> = new Set(),
): string[] => {
  const out: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value !== 'object' || value === null) return;
    for (const [key, child] of Object.entries(value)) {
      if (skipKeys.has(key)) continue;
      if (POINT_KEYS.has(key) && typeof child === 'string' && child.trim()) out.push(child);
      else if (LIST_KEYS.has(key) && Array.isArray(child)) {
        for (const item of child) if (typeof item === 'string' && item.trim()) out.push(item);
      } else walk(child);
    }
  };
  walk(props);
  return out;
};

const statRowPhrases = (props: unknown): (string | undefined)[] => {
  const items = (props as { items?: unknown } | undefined)?.items;
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const at = (item as { at?: unknown } | null)?.at;
    return typeof at === 'string' && at.trim() ? at : undefined;
  });
};

/**
 * Pure planning: global timeline, mood per scene and every sound event. Scene boundaries are the same whole
 * frames Video.tsx uses (rounded per scene), so sound events never drift from the picture.
 */
export const planSoundtrack = (
  scenes: readonly SceneInput[],
  fps: number = VIDEO.fps,
): SoundPlan => {
  const plans: ScenePlan[] = [];
  const events: SoundEvent[] = [];
  const speech: Interval[] = [];
  const frames = sceneDurationsInFrames(
    scenes.map((scene) => ({ id: scene.id, draft: { durationSec: scene.durationSec } })),
    fps,
    scenes.map((scene) => ({ sceneId: scene.id, durationSec: scene.durationSec })),
  );
  const startFrames = sceneStartFrames(frames);
  const cursor = frames.reduce((sum, count) => sum + count, 0) / fps;
  scenes.forEach((scene, index) => {
    const duration = (frames[index] ?? 0) / fps;
    const start = (startFrames[index] ?? 0) / fps;
    plans.push({
      id: scene.id,
      mood: scene.mood ?? defaultMoodFor(scene.type, scene.props),
      start,
      duration,
    });

    const words = scene.words ?? [];
    if (words.length > 0) {
      for (const word of words) speech.push({ start: start + word.start, end: start + word.end });
    } else {
      speech.push({ start: start + 0.1, end: start + scene.durationSec });
    }

    const add = (time: number, kind: SfxKind): void =>
      void events.push({ time, kind, sceneId: scene.id, gain: SFX_LEVELS[kind] });

    const last = index === scenes.length - 1;
    if (index === 0) add(0, 'thud');
    else if (last && scenes.length > 1) {
      add(start, 'thud');
      if (start - SFX_HIT_OFFSET_SEC.riser >= 0) add(start, 'riser');
    } else add(start, 'whoosh');

    const isStat = scene.type === 'stat';
    let lastPop = -Infinity;
    const phrases = collectRevealPhrases(scene.props, isStat ? new Set(['items']) : new Set());
    for (const phrase of phrases) {
      const hit = findPhraseTime(words, phrase);
      if (!hit) continue;
      const time = start + hit.start;
      if (time - lastPop < POP_MIN_GAP_SEC) continue;
      lastPop = time;
      add(time, 'pop');
    }
    if (isStat) {
      const rows = statRowPhrases(scene.props);
      rows.forEach((phrase, row) => {
        const hit = phrase ? findPhraseTime(words, phrase) : undefined;
        const fallback =
          scene.durationSec * (rows.length <= 1 ? 0.1 : 0.1 + (0.45 * row) / (rows.length - 1));
        const rowStart = start + (hit ? hit.start : fallback);
        let t = rowStart;
        for (let n = 0; n < TICK_COUNT; n += 1) {
          events.push({
            time: t,
            kind: 'tick',
            sceneId: scene.id,
            gain: SFX_LEVELS.tick * (0.6 + 0.4 * (1 - n / TICK_COUNT)),
          });
          t +=
            TICK_FIRST_GAP_SEC + ((TICK_LAST_GAP_SEC - TICK_FIRST_GAP_SEC) * n) / (TICK_COUNT - 1);
        }
      });
    }
  });
  events.sort((a, b) => a.time - b.time);
  return { scenes: plans, events, totalSec: cursor, speech };
};

const sineIn = (u: number): number => {
  const c = Math.min(1, Math.max(0, u));
  return Math.sin((Math.PI / 2) * c) ** 2;
};

/** Music track: each scene renders its own mood; neighbours crossfade with weights summing to 1. */
export const renderMusicTrack = (plan: SoundPlan): Float32Array => {
  const out = makeBuffer(plan.totalSec);
  const half = CROSSFADE_SEC / 2;
  plan.scenes.forEach((scene, i) => {
    const first = i === 0;
    const last = i === plan.scenes.length - 1;
    const segStart = Math.max(0, scene.start - (first ? 0 : half));
    const segEnd = Math.min(plan.totalSec, scene.start + scene.duration + (last ? 0 : half));
    const music = renderMusic(scene.mood, segStart, segEnd - segStart);
    for (let n = 0; n < music.length; n += 1) {
      const t = segStart + n / SAMPLE_RATE;
      const fadeIn = first
        ? sineIn(t / INTRO_FADE_SEC)
        : sineIn((t - (scene.start - half)) / CROSSFADE_SEC);
      const fadeOut = last
        ? sineIn((plan.totalSec - t) / OUTRO_FADE_SEC)
        : 1 - sineIn((t - (scene.start + scene.duration - half)) / CROSSFADE_SEC);
      const j = Math.round(segStart * SAMPLE_RATE) + n;
      if (j < out.length) out[j] = (out[j] ?? 0) + (music[n] ?? 0) * fadeIn * fadeOut;
    }
  });
  return out;
};

export const renderSfxTrack = (plan: SoundPlan): Float32Array => {
  const out = makeBuffer(plan.totalSec);
  const cache = new Map<string, Float32Array>();
  plan.events.forEach((event, index) => {
    const variant = event.kind === 'tick' ? index : 0;
    const key = `${event.kind}:${event.kind === 'tick' ? variant % 4 : 0}`;
    let sample = cache.get(key);
    if (!sample) {
      sample = renderSfx(event.kind, hashSeed(event.kind), variant);
      cache.set(key, sample);
    }
    mixInto(out, sample, event.time - SFX_HIT_OFFSET_SEC[event.kind], event.gain);
  });
  return out;
};

const ENVELOPE_RATE = 200;

/** Unit-level bed (music + SFX, both ducked under the narration). Deterministic. */
export const renderBed = (plan: SoundPlan): Float32Array => {
  const music = renderMusicTrack(plan);
  const sfx = renderSfxTrack(plan);
  const base = {
    attackSec: DUCK_ATTACK_SEC,
    releaseSec: DUCK_RELEASE_SEC,
    bridgeSec: DUCK_BRIDGE_SEC,
    rate: ENVELOPE_RATE,
  };
  applyEnvelope(
    music,
    duckEnvelope(plan.speech, plan.totalSec, { ...base, depthDb: MUSIC_DUCK_DB }),
    ENVELOPE_RATE,
    SAMPLE_RATE,
    MUSIC_LEVEL,
  );
  applyEnvelope(
    sfx,
    duckEnvelope(plan.speech, plan.totalSec, { ...base, depthDb: SFX_DUCK_DB }),
    ENVELOPE_RATE,
    SAMPLE_RATE,
  );
  for (let i = 0; i < music.length; i += 1) music[i] = (music[i] ?? 0) + (sfx[i] ?? 0);
  return music;
};

export type BedMeta = {
  videoId: string;
  sampleRate: number;
  totalSec: number;
  scenes: ScenePlan[];
  events: SoundEvent[];
  /** Linear gain already baked into bed.wav relative to the unit-level render. */
  bedGainDb: number;
  /** Recommended voice gain (linear) to reach the target; >1 needs a player that supports it. */
  voiceGain: number;
  targetLufs: number;
  measured?: {
    voiceLufs: number;
    voicePeakDb: number;
    bedUnitLufs: number;
    /** Estimate (power sum) of voice + bed after the recommended gains. */
    expectedMixLufs: number;
    bedFinalPeak: number;
  };
};

/** Concatenate the scene audio files (each + tail) into one mono 48 kHz WAV, to measure the voice. */
export const renderVoiceTrack = (root: string, files: readonly string[], out: string): void => {
  const inputs = files.flatMap((file) => ['-i', join(root, 'public', file)]);
  const chain = files
    .map(
      (_, k) =>
        `[${k}:a]aresample=${SAMPLE_RATE},aformat=channel_layouts=mono,apad=pad_dur=${SCENE_TAIL_SEC}[a${k}]`,
    )
    .join(';');
  const join_ = files.map((_, k) => `[a${k}]`).join('');
  runRemotionFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-nostats',
      ...inputs,
      '-filter_complex',
      `${chain};${join_}concat=n=${files.length}:v=0:a=1[o]`,
      '-map',
      '[o]',
      out,
    ],
    root,
  );
};

/** Sample peak (0..1) of a 16-bit PCM WAV with a canonical 44-byte header (as written by ffmpeg here). */
const wavPeak = (file: string): number => {
  const bytes = readFileSync(file);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12; // skip RIFF header, walk chunks to find "data"
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('latin1', offset, offset + 4);
    const size = view.getUint32(offset + 4, true);
    if (id === 'data') {
      let peak = 0;
      const end = Math.min(bytes.length, offset + 8 + size);
      for (let i = offset + 8; i + 1 < end; i += 2)
        peak = Math.max(peak, Math.abs(view.getInt16(i, true)));
      return peak / 32768;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`No data chunk in ${file}`);
};

export type BuildOptions = { root: string; videoId: string; measure?: boolean };

export const buildSoundtrack = async (
  options: BuildOptions,
): Promise<{ wavPath: string; jsonPath: string; meta: BedMeta }> => {
  const { root, videoId } = options;
  const videoFile = findVideoFile(root, videoId);
  if (!videoFile) throw new Error(`No video "${videoId}" found under ${root}/content`);
  const video = JSON.parse(readFileSync(videoFile, 'utf8')) as {
    scenes: { id: string; type: string; mood?: Mood; props?: unknown }[];
  };
  const dir = join(root, 'public', 'generated', 'audio', videoId);
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath))
    throw new Error(`Missing ${manifestPath}; run "pnpm tts ${videoId}" first`);
  const manifest = AudioManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));

  const inputs: SceneInput[] = video.scenes.map((scene) => {
    const entry = manifest.scenes.find((candidate) => candidate.sceneId === scene.id);
    if (!entry) throw new Error(`Manifest has no audio for scene "${scene.id}"`);
    return {
      id: scene.id,
      type: scene.type,
      mood: scene.mood,
      props: scene.props,
      durationSec: entry.durationSec,
      words: entry.words,
    };
  });
  const plan = planSoundtrack(inputs);
  const bed = renderBed(plan);

  let bedGainDb = FALLBACK_BED_GAIN_DB;
  let voiceGain = 1;
  let measured: BedMeta['measured'];
  if (options.measure !== false) {
    const tmp = mkdtempSync(join(tmpdir(), 'bed-'));
    try {
      const voiceWav = join(tmp, 'voice.wav');
      const bedWav = join(tmp, 'bed-unit.wav');
      renderVoiceTrack(
        root,
        inputs.map((i) => manifest.scenes.find((s) => s.sceneId === i.id)!.file),
        voiceWav,
      );
      writeFileSync(bedWav, floatToWav(bed));
      const voice = measureLufs(voiceWav, root);
      const unit = measureLufs(bedWav, root);
      const voicePeakDb = gainToDb(Math.max(1e-6, wavPeak(voiceWav)));
      const gains: GainPlan = planGains(
        voice.integratedLufs,
        unit.integratedLufs,
        BED_BELOW_VOICE_DB,
        TARGET_LUFS,
        VOICE_PEAK_CEILING_DB - voicePeakDb,
        {
          voicePeak: dbToGain(voicePeakDb),
          bedUnitPeak: Math.max(1e-6, peakOf(bed)),
          bedMaxPeak: BED_MAX_PEAK,
          mixCeilingDb: MIX_PEAK_CEILING_DB,
        },
      );
      bedGainDb = gains.bedDb;
      voiceGain = gains.voiceGain;
      measured = {
        voiceLufs: voice.integratedLufs,
        voicePeakDb,
        bedUnitLufs: unit.integratedLufs,
        expectedMixLufs: gains.expectedMixLufs,
        bedFinalPeak: 0,
      };
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }

  const gain = dbToGain(bedGainDb);
  for (let i = 0; i < bed.length; i += 1) bed[i] = (bed[i] ?? 0) * gain;
  softClip(bed);
  if (measured) measured.bedFinalPeak = peakOf(bed);

  mkdirSync(dir, { recursive: true });
  const wavPath = join(dir, 'bed.wav');
  const jsonPath = join(dir, 'bed.json');
  writeFileSync(wavPath, floatToWav(bed));
  const meta: BedMeta = {
    videoId,
    sampleRate: SAMPLE_RATE,
    totalSec: plan.totalSec,
    scenes: plan.scenes,
    events: plan.events,
    bedGainDb,
    voiceGain,
    targetLufs: TARGET_LUFS,
    ...(measured ? { measured } : {}),
  };
  writeFileSync(jsonPath, `${JSON.stringify(meta, null, 2)}\n`);
  return { wavPath, jsonPath, meta };
};
