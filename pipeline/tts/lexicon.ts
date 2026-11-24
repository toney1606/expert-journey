import type { SynthesisCue } from './types';

/**
 * Pronunciation lexicon: English terms in the narration are respelled in Vietnamese phonetics for the
 * TTS only. The displayed text (captions, cues) keeps the original words. Keys are lowercase; a key may
 * be several words ("rows removed by filter"); values are space-separated spoken words.
 */
export type Lexicon = Readonly<Record<string, string>>;

export const DEFAULT_LEXICON: Lexicon = {
  query: 'quơ ri',
  index: 'in đếch',
  database: 'đây ta bây',
  page: 'pây',
  code: 'cốt',
  email: 'i meo',
  orders: 'o đờ',
  composite: 'com pô sịt',
  unique: 'diu ních',
  covering: 'cớ vơ ring',
  partial: 'pa sâu',
  'full-text': 'phun tếch',
  'b+tree': 'bi tri',
  postgresql: 'pốt gờ rét Q L',
  'explain analyze': 'ếch xờ plên a na lai',
  analyze: 'a na lai',
  'rows removed by filter': 'rô rì múp bai phin tơ',
};

export type SpokenGroup = {
  /** Original token(s) with punctuation, exactly as displayed. */
  source: string;
  /** How many spoken words this group produces. */
  spokenCount: number;
};

export type Respelled = { spoken: string; groups: SpokenGroup[] };

const LEADING = /^[("'“‘[]+/u;
const TRAILING = /[.,!?;:…)\]}"'»”’]+$/u;
const MAX_PHRASE = 4;

/** Replace lexicon terms (longest phrase first) and remember how each source token maps to spoken words. */
export const respell = (text: string, lexicon: Lexicon = DEFAULT_LEXICON): Respelled => {
  const tokens = text.split(/\s+/u).filter((token) => token.length > 0);
  const groups: SpokenGroup[] = [];
  const spoken: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let size = Math.min(MAX_PHRASE, tokens.length - i); size >= 1 && !matched; size -= 1) {
      const slice = tokens.slice(i, i + size);
      const lead = (slice[0] ?? '').match(LEADING)?.[0] ?? '';
      const trail = (slice[size - 1] ?? '').match(TRAILING)?.[0] ?? '';
      const core = slice
        .join(' ')
        .slice(lead.length, slice.join(' ').length - trail.length)
        .toLowerCase();
      const replacement = Object.prototype.hasOwnProperty.call(lexicon, core)
        ? lexicon[core]
        : undefined;
      if (replacement !== undefined) {
        const words = replacement.split(' ');
        spoken.push(
          ...words.map((word, index) => (index === words.length - 1 ? word + trail : word)),
        );
        groups.push({ source: slice.join(' '), spokenCount: words.length });
        i += size;
        matched = true;
      }
    }
    if (!matched) {
      const token = tokens[i] as string;
      spoken.push(token);
      groups.push({ source: token, spokenCount: 1 });
      i += 1;
    }
  }
  return { spoken: spoken.join(' '), groups };
};

const SENTENCE_END = /[.!?…]["')\]»”’]*$/u;

/**
 * Map raw word timings of the spoken (respelled) text back onto the displayed words. Returns undefined
 * when the number of timings does not match, so the caller can fall back to plain alignment.
 */
export const regroupTimings = (
  groups: readonly SpokenGroup[],
  raw: readonly SynthesisCue[],
): { words: SynthesisCue[]; cues: SynthesisCue[] } | undefined => {
  const total = groups.reduce((sum, group) => sum + group.spokenCount, 0);
  if (raw.length !== total) return undefined;
  const words: SynthesisCue[] = [];
  const cues: SynthesisCue[] = [];
  let sentence: SynthesisCue[] = [];
  let cursor = 0;
  for (const group of groups) {
    const first = raw[cursor] as SynthesisCue;
    const last = raw[cursor + group.spokenCount - 1] as SynthesisCue;
    cursor += group.spokenCount;
    const start = Math.max(0, first.start);
    const word = { start, end: Math.max(start, last.end), text: group.source };
    words.push(word);
    sentence.push(word);
    if (SENTENCE_END.test(group.source)) {
      cues.push({
        start: (sentence[0] as SynthesisCue).start,
        end: word.end,
        text: sentence.map((w) => w.text).join(' '),
      });
      sentence = [];
    }
  }
  if (sentence.length > 0) {
    cues.push({
      start: (sentence[0] as SynthesisCue).start,
      end: (sentence[sentence.length - 1] as SynthesisCue).end,
      text: sentence.map((w) => w.text).join(' '),
    });
  }
  return { words, cues };
};
