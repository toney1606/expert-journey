// Procedural music bed: a soft additive pad plus an optional gentle arpeggio and low pulse per mood.
// Phases are anchored to GLOBAL time (chord slots on a beat grid), so two adjacent scenes with the same
// mood render the same signal and a crossfade between them is seamless.
import { MOODS } from '../../src/schemas/common';
import type { Mood as MoodName } from '../../src/schemas/common';
import { SAMPLE_RATE, addEcho, attackRelease, fastSin, lowpass, makeBuffer, midiToHz } from './dsp';

// ---- Tunable taste constants -------------------------------------------------------------------
export const BPM = 108;
export const BEATS_PER_CHORD = 8; // two bars of 4/4 per chord
/** Pad voice: harmonic rolloff and detune (cents), per mood. */
export type MoodSpec = {
  /** MIDI note of the chord root for each chord of the loop. */
  roots: readonly number[];
  /** Semitone offsets above the root forming the pad chord. */
  chord: readonly number[];
  /** Arpeggio semitone offsets (empty = no arp); played as eighths, one octave above root. */
  arp: readonly number[];
  arpGain: number;
  padGain: number;
  /** Low-pass for the pad in Hz (lower = darker). */
  padCutoff: number;
  /** Harmonics in the pad (more = brighter). */
  harmonics: number;
  /** Gain of the low pulse on each beat (0 = none). */
  pulseGain: number;
  /** Pitch of the low pulse (MIDI). */
  pulseNote: number;
};

export const MOOD_SPECS: Record<MoodName, MoodSpec> = {
  // dark, tense minor drone with a low pulse
  problem: {
    roots: [45, 41, 38, 40],
    chord: [0, 7, 12, 15],
    arp: [],
    arpGain: 0,
    padGain: 0.16,
    padCutoff: 900,
    harmonics: 3,
    pulseGain: 0.5,
    pulseNote: 33,
  },
  // airy open fifths and sus2, slow arp
  concept: {
    roots: [48, 55, 45, 53],
    chord: [0, 7, 14, 19],
    arp: [0, 7, 14, 7],
    arpGain: 0.07,
    padGain: 0.14,
    padCutoff: 2400,
    harmonics: 4,
    pulseGain: 0,
    pulseNote: 36,
  },
  // brighter major, busier arp
  solution: {
    roots: [55, 62, 52, 60],
    chord: [0, 4, 7, 11],
    arp: [0, 4, 7, 12, 7, 4],
    arpGain: 0.09,
    padGain: 0.13,
    padCutoff: 3200,
    harmonics: 5,
    pulseGain: 0.2,
    pulseNote: 43,
  },
  // slightly dissonant: minor second / tritone colour
  warning: {
    roots: [46, 46, 47, 46],
    chord: [0, 6, 7, 13],
    arp: [0, 1],
    arpGain: 0.05,
    padGain: 0.15,
    padCutoff: 1400,
    harmonics: 3,
    pulseGain: 0.25,
    pulseNote: 34,
  },
  // minimal: a single sustained fifth
  neutral: {
    roots: [48],
    chord: [0, 7],
    arp: [],
    arpGain: 0,
    padGain: 0.12,
    padCutoff: 1800,
    harmonics: 3,
    pulseGain: 0,
    pulseNote: 36,
  },
};
export const PAD_ATTACK_SEC = 1.2;
export const PAD_RELEASE_SEC = 1.6;
export const PAD_DETUNE = [-0.0035, 0.0035] as const;
export const ECHO_DELAY_BEATS = 0.75; // dotted eighth
export const ECHO_FEEDBACK = 0.38;
export const ECHO_MIX = 0.35;
const PREROLL_SEC = 2;
// -------------------------------------------------------------------------------------------------

export const moods: readonly MoodName[] = MOODS;

const BEAT = 60 / BPM;
const CHORD_LEN = BEAT * BEATS_PER_CHORD;

/**
 * Render `durationSec` of music for `mood` starting at global time `startSec`. Output is a mono
 * buffer, peak roughly 0.3. Deterministic.
 */
export const renderMusic = (
  mood: MoodName,
  startSec: number,
  durationSec: number,
): Float32Array => {
  // Pre-roll so filter and echo state are warmed up: a render starting at t equals the tail of an
  // earlier-starting render (needed for seamless same-mood crossfades).
  const preroll = Math.min(startSec, PREROLL_SEC);
  const full = renderRaw(mood, startSec - preroll, durationSec + preroll);
  return full.slice(Math.round(preroll * SAMPLE_RATE));
};

const renderRaw = (mood: MoodName, startSec: number, durationSec: number): Float32Array => {
  const spec = MOOD_SPECS[mood];
  const buf = makeBuffer(durationSec);
  const endSec = startSec + durationSec;
  const firstSlot = Math.max(0, Math.floor((startSec - PAD_RELEASE_SEC) / CHORD_LEN));
  const lastSlot = Math.floor(endSec / CHORD_LEN);

  for (let slot = firstSlot; slot <= lastSlot; slot += 1) {
    const slotStart = slot * CHORD_LEN;
    const noteLen = CHORD_LEN + PAD_RELEASE_SEC;
    const root = spec.roots[slot % spec.roots.length] ?? 48;
    for (const offset of spec.chord) {
      const freq = midiToHz(root + offset);
      for (const detune of PAD_DETUNE) {
        addPadNote(buf, startSec, slotStart, noteLen, freq * (1 + detune), spec);
      }
    }
  }
  lowpass(buf, spec.padCutoff);

  if (spec.arp.length > 0) {
    const arp = makeBuffer(durationSec);
    const eighth = BEAT / 2;
    const first = Math.max(0, Math.floor((startSec - 1) / eighth));
    for (let n = first; n * eighth < endSec; n += 1) {
      const t0 = n * eighth;
      const slot = Math.floor(t0 / CHORD_LEN);
      const root = (spec.roots[slot % spec.roots.length] ?? 48) + 12;
      const step = spec.arp[n % spec.arp.length] ?? 0;
      addPluck(arp, startSec, t0, midiToHz(root + step), spec.arpGain);
    }
    addEcho(arp, BEAT * ECHO_DELAY_BEATS, ECHO_FEEDBACK, ECHO_MIX);
    for (let i = 0; i < buf.length; i += 1) buf[i] = (buf[i] ?? 0) + (arp[i] ?? 0);
  }

  if (spec.pulseGain > 0) {
    const first = Math.max(0, Math.floor(startSec / BEAT) - 1);
    for (let n = first; n * BEAT < endSec; n += 1) {
      const accent = n % 4 === 0 ? 1 : 0.55;
      addPulse(buf, startSec, n * BEAT, midiToHz(spec.pulseNote), spec.pulseGain * accent);
    }
  }
  return buf;
};

const addPadNote = (
  buf: Float32Array,
  bufStart: number,
  noteStart: number,
  length: number,
  freq: number,
  spec: MoodSpec,
): void => {
  const from = Math.max(0, Math.ceil((noteStart - bufStart) * SAMPLE_RATE));
  const to = Math.min(buf.length, Math.floor((noteStart + length - bufStart) * SAMPLE_RATE));
  for (let i = from; i < to; i += 1) {
    const t = bufStart + i / SAMPLE_RATE - noteStart; // time inside the note, anchored to global time
    const env = attackRelease(t, length, PAD_ATTACK_SEC, PAD_RELEASE_SEC);
    let s = 0;
    for (let h = 1; h <= spec.harmonics; h += 1) {
      s += fastSin(freq * h * t) / h ** 1.6;
    }
    buf[i] = (buf[i] ?? 0) + s * env * spec.padGain * 0.35;
  }
};

const addPluck = (
  buf: Float32Array,
  bufStart: number,
  noteStart: number,
  freq: number,
  gain: number,
): void => {
  const length = 1.4;
  const from = Math.max(0, Math.ceil((noteStart - bufStart) * SAMPLE_RATE));
  const to = Math.min(buf.length, Math.floor((noteStart + length - bufStart) * SAMPLE_RATE));
  for (let i = from; i < to; i += 1) {
    const t = bufStart + i / SAMPLE_RATE - noteStart;
    const env = Math.min(1, t / 0.006) * Math.exp(-t * 4.5);
    const s = fastSin(freq * t) + 0.25 * fastSin(freq * 2 * t);
    buf[i] = (buf[i] ?? 0) + s * env * gain;
  }
};

const addPulse = (
  buf: Float32Array,
  bufStart: number,
  noteStart: number,
  freq: number,
  gain: number,
): void => {
  const length = 0.45;
  const from = Math.max(0, Math.ceil((noteStart - bufStart) * SAMPLE_RATE));
  const to = Math.min(buf.length, Math.floor((noteStart + length - bufStart) * SAMPLE_RATE));
  for (let i = from; i < to; i += 1) {
    const t = bufStart + i / SAMPLE_RATE - noteStart;
    const env = Math.min(1, t / 0.01) * Math.exp(-t * 8);
    // phase of a sine with exponentially falling pitch (closed form of the integral)
    const phase = 2 * Math.PI * (freq * t + (freq * 0.8 * (1 - Math.exp(-t * 18))) / 18);
    buf[i] = (buf[i] ?? 0) + fastSin(phase / (2 * Math.PI)) * env * gain;
  }
};
