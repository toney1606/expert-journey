import type { SynthesisCue } from '../types';

const TRAILING = /[.,!?;:…)\]}"'»”’]/u;
const SENTENCE_END = /[.!?…]/u;

export type AlignedTiming = { words: SynthesisCue[]; cues: SynthesisCue[] };

/**
 * The service reports bare words (no punctuation). Walk the source text to re-attach trailing
 * punctuation to each word and to derive sentence cues. Words that cannot be found keep their raw
 * text and are never a sentence end. Timings are clamped to start >= 0 and end >= start.
 */
export const alignWords = (text: string, raw: SynthesisCue[]): AlignedTiming => {
  const source = text.normalize('NFC');
  const words: SynthesisCue[] = [];
  const cues: SynthesisCue[] = [];
  let cursor = 0;
  let sentence: SynthesisCue[] = [];

  const flush = (): void => {
    const first = sentence[0];
    const last = sentence[sentence.length - 1];
    if (!first || !last) return;
    cues.push({
      start: first.start,
      end: last.end,
      text: sentence.map((word) => word.text).join(' '),
    });
    sentence = [];
  };

  for (const entry of raw) {
    const start = Math.max(0, entry.start);
    const end = Math.max(start, entry.end);
    const bare = entry.text.normalize('NFC').trim();
    let display = bare;
    let sentenceEnd = false;
    const index = bare.length > 0 ? source.indexOf(bare, cursor) : -1;
    if (index >= 0) {
      let stop = index + bare.length;
      while (stop < source.length && TRAILING.test(source.charAt(stop))) stop += 1;
      display = source.slice(index, stop);
      const next = source[stop];
      sentenceEnd =
        SENTENCE_END.test(display.slice(bare.length)) && (next === undefined || /\s/u.test(next));
      cursor = stop;
    }
    if (display.length === 0) continue;
    const word = { start, end, text: display };
    words.push(word);
    sentence.push(word);
    if (sentenceEnd) flush();
  }
  flush();
  return { words, cues };
};
