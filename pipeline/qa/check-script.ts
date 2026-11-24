import { defaultMoodFor } from '../../src/design/mood';
import { stripMarkup } from '../../src/lib/rich-text';
import { findPhraseTime, normalizeToken } from '../../src/lib/spoken';
import type { Scene } from '../../src/schemas/video';
import { sceneLengths } from './timing';
import type { QaCheck, QaContext, QaIssue } from './types';

export const HOOK_MAX_WORDS = 35;
export const SENTENCE_MAX_WORDS = 25;
export const MOOD_RUN_LIMIT = 4;
export const SCENE_MAX_SEC = 25;
export const LOOP_MIN_SHARED = 3;
export const LOOP_LINE_MIN_SHARED = 2;

/** Openings that waste the first second (compared accent-insensitively, spaces kept). */
export const WEAK_OPENINGS: readonly string[] = [
  'xin chao',
  'chao cac ban',
  'chao ban',
  'chao mung',
  'hom nay',
  'trong video nay',
];

/** Prop keys holding a narration phrase (a string) or a list of phrases. */
const CUE_KEYS: ReadonlySet<string> = new Set([
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
  'pointsAt',
  'cueAt',
]);

const plainText = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd');
const wordsOf = (text: string): string[] => text.split(/\s+/).filter((word) => word.length > 0);

const hookOf = (ctx: QaContext): Scene | undefined => {
  const first = ctx.video.scenes[0];
  return first?.type === 'hook' || first?.type === 'counterhook' ? first : undefined;
};

/** Every string in a props tree with its dotted path (arrays as `name[i]`). */
const collectStrings = (
  value: unknown,
  path: string,
  out: { path: string; text: string }[],
): void => {
  if (typeof value === 'string') {
    out.push({ path, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, out));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, path ? `${path}.${key}` : key, out);
    }
  }
};

const stringsOf = (value: unknown): { path: string; text: string }[] => {
  const out: { path: string; text: string }[] = [];
  collectStrings(value, '', out);
  return out;
};

/** Distinct significant tokens (>= 4 letters after normalisation) of a text. */
const significant = (text: string): Set<string> =>
  new Set(
    wordsOf(stripMarkup(text))
      .map(normalizeToken)
      .filter((token) => token.length >= 4),
  );

const sharedCount = (a: Set<string>, b: Set<string>): number =>
  [...a].filter((t) => b.has(t)).length;

const sceneText = (scene: Scene): string =>
  [scene.voice, ...stringsOf(scene.props).map((entry) => entry.text)].join(' ');

export const checkHookOpening: QaCheck = (ctx) => {
  const hook = hookOf(ctx);
  if (!hook) return [];
  const spoken = plainText(hook.voice)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const weak = WEAK_OPENINGS.find(
    (opening) => spoken === opening || spoken.startsWith(`${opening} `),
  );
  return weak
    ? [
        {
          severity: 'warn',
          code: 'script.hook-opening',
          sceneId: hook.id,
          message: `hook opens with a greeting/stage-setting ("${weak}"); start with the question or the surprising fact`,
        },
      ]
    : [];
};

export const checkHookLength: QaCheck = (ctx) => {
  const hook = hookOf(ctx);
  const count = hook ? wordsOf(hook.voice).length : 0;
  return hook && count > HOOK_MAX_WORDS
    ? [
        {
          severity: 'warn',
          code: 'script.hook-length',
          sceneId: hook.id,
          message: `hook voice is ${count} words (> ${HOOK_MAX_WORDS}); the first seconds must be short and sharp`,
        },
      ]
    : [];
};

export const checkHookQuestion: QaCheck = (ctx) => {
  const hook = hookOf(ctx);
  if (!hook) return [];
  const text = [hook.voice, ...stringsOf(hook.props).map((entry) => entry.text)].join(' ');
  return text.includes('?')
    ? []
    : [
        {
          severity: 'warn',
          code: 'script.hook-question',
          sceneId: hook.id,
          message:
            'hook has no question mark in its voice or text; open with the interview question',
        },
      ];
};

export const checkSentenceLong: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  for (const scene of ctx.video.scenes) {
    const longest = scene.voice
      .split(/(?<=[.!?…])\s+|\n+/u)
      .map((sentence) => wordsOf(sentence).length)
      .reduce((max, n) => Math.max(max, n), 0);
    if (longest > SENTENCE_MAX_WORDS) {
      issues.push({
        severity: 'warn',
        code: 'script.sentence-long',
        sceneId: scene.id,
        message: `a sentence in the voice has ${longest} words (> ${SENTENCE_MAX_WORDS}); split it for the listener`,
      });
    }
  }
  return issues;
};

const RISKY_VOICE = /\d+|[%×≠≤≥≈→←]|\bO\([^)]*\)/gu;

export const checkDigitsInVoice: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  for (const scene of ctx.video.scenes) {
    const found = [...new Set(scene.voice.match(RISKY_VOICE) ?? [])];
    if (found.length > 0) {
      issues.push({
        severity: 'warn',
        code: 'script.digits-in-voice',
        sceneId: scene.id,
        message: `voice contains digits/symbols TTS may misread (${found.slice(0, 5).join(', ')}); spell them out`,
      });
    }
  }
  return issues;
};

const tokenList = (texts: readonly string[]): string[] =>
  texts.map(normalizeToken).filter((token) => token.length > 0);

/**
 * Words the cue is matched against: the manifest words when they still match the authored voice, else the
 * voice split on spaces (a manifest made from an older voice text is stale; `pnpm tts` refreshes it).
 */
const spokenWords = (
  ctx: QaContext,
  scene: Scene,
): { start: number; end: number; text: string }[] => {
  const fromManifest = ctx.manifest?.scenes.find((entry) => entry.sceneId === scene.id)?.words;
  const voiceTokens = tokenList(wordsOf(scene.voice));
  const manifestTexts = fromManifest?.map((word) => word.text) ?? [];
  const fresh = tokenList(manifestTexts).join(' ') === voiceTokens.join(' ');
  const texts = fresh && manifestTexts.length > 0 ? manifestTexts : wordsOf(scene.voice);
  return texts
    .filter((text) => normalizeToken(text).length > 0)
    .map((text, index) => ({ start: index, end: index + 1, text }));
};

const cuesOf = (props: unknown): { path: string; phrase: string }[] => {
  const cues: { path: string; phrase: string }[] = [];
  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
    } else if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        const here = path ? `${path}.${key}` : key;
        if (CUE_KEYS.has(key)) {
          for (const entry of stringsOf(child)) {
            cues.push({ path: here + entry.path, phrase: entry.text });
          }
        } else {
          walk(child, here);
        }
      }
    }
  };
  walk(props, '');
  return cues;
};

export const checkCueMissing: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  for (const scene of ctx.video.scenes) {
    const words = spokenWords(ctx, scene);
    for (const cue of cuesOf(scene.props)) {
      if (!findPhraseTime(words, cue.phrase)) {
        issues.push({
          severity: 'error',
          code: 'script.cue-missing',
          sceneId: scene.id,
          message: `${cue.path} "${cue.phrase}" does not occur in the narration of this scene`,
        });
      }
    }
  }
  return issues;
};

export const checkMoodMonotony: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  const { scenes } = ctx.video;
  const moods = scenes.map((scene) => scene.mood ?? defaultMoodFor(scene.type, scene.props));
  let start = 0;
  for (let i = 1; i <= moods.length; i += 1) {
    if (i < moods.length && moods[i] === moods[start]) continue;
    const run = i - start;
    const first = scenes[start];
    if (run >= MOOD_RUN_LIMIT && first) {
      issues.push({
        severity: 'warn',
        code: 'script.mood-monotony',
        sceneId: first.id,
        message: `${run} consecutive scenes share the mood "${moods[start]}"; vary the mood or the scene type`,
      });
    }
    start = i;
  }
  return issues;
};

export const checkSceneLong: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  const lengths = sceneLengths(ctx);
  ctx.video.scenes.forEach((scene, index) => {
    const seconds = lengths[index] ?? 0;
    if (seconds > SCENE_MAX_SEC) {
      issues.push({
        severity: 'warn',
        code: 'script.scene-long',
        sceneId: scene.id,
        message: `scene lasts ${seconds.toFixed(1)}s (> ${SCENE_MAX_SEC}s); split it to keep the pace`,
      });
    }
  });
  return issues;
};

export const checkLoop: QaCheck = (ctx) => {
  const { scenes } = ctx.video;
  const hook = hookOf(ctx);
  const last = scenes[scenes.length - 1];
  if (!hook || !last || last === hook) return [];
  const hookWords = significant(sceneText(hook));
  if (last.type === 'endcard' && last.props.loopLine) {
    if (sharedCount(hookWords, significant(last.props.loopLine)) >= LOOP_LINE_MIN_SHARED) return [];
  }
  if (sharedCount(hookWords, significant(sceneText(last))) >= LOOP_MIN_SHARED) return [];
  return [
    {
      severity: 'warn',
      code: 'script.loop',
      sceneId: last.id,
      message: `last scene shares fewer than ${LOOP_MIN_SHARED} significant words with the hook; echo the hook so the video loops`,
    },
  ];
};

/** True when `{name|text}` markup in `text` is unbalanced (escaped braces `\{` `\}` are fine). */
export const hasBrokenMarkup = (text: string): boolean => {
  if (!/[{}]/.test(text)) return false;
  const unescaped = text.replace(/\\[{}\\]/g, '');
  return /[{}]/.test(stripMarkup(unescaped));
};

export const checkMarkup: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  for (const scene of ctx.video.scenes) {
    // Code and terminal text legitimately contain braces.
    if (scene.type === 'code' || scene.type === 'terminal') continue;
    for (const entry of stringsOf(scene.props)) {
      // stepLabel uses {k}/{n} placeholders, not colour markup.
      if (entry.path.endsWith('stepLabel')) continue;
      if (hasBrokenMarkup(entry.text)) {
        issues.push({
          severity: 'warn',
          code: 'script.markup',
          sceneId: scene.id,
          message: `${entry.path} has unbalanced {color|text} markup: "${entry.text}"`,
        });
      }
    }
  }
  return issues;
};

export const checkScript: QaCheck = (ctx) =>
  [
    checkHookOpening,
    checkHookLength,
    checkHookQuestion,
    checkSentenceLong,
    checkDigitsInVoice,
    checkCueMissing,
    checkMoodMonotony,
    checkSceneLong,
    checkLoop,
    checkMarkup,
  ].flatMap((check) => check(ctx));
