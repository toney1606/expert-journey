import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useVideoConfig } from 'remotion';
import type { CaptionWord } from '../lib/captions';
import { findPhraseTime } from '../lib/spoken';

const WordsContext = createContext<readonly CaptionWord[]>([]);

/** Gives every scene access to its narration word timings (from the TTS manifest). */
export const SceneTimingProvider: React.FC<{
  words: readonly CaptionWord[];
  children: ReactNode;
}> = ({ words, children }) => (
  <WordsContext.Provider value={words}>{children}</WordsContext.Provider>
);

export const useSceneWords = (): readonly CaptionWord[] => useContext(WordsContext);

/**
 * Frame (inside the current scene) at which `phrase` is spoken. Without word timings (no audio yet, or
 * the phrase is not found) it returns `fallbackFrame`, so scenes always have a sensible timeline.
 * Use it for every reveal: visuals appear exactly when the narrator says the matching words.
 */
export const useSpokenFrame = (
  phrase: string | undefined,
  fallbackFrame: number,
  afterSec = 0,
): number => {
  const words = useSceneWords();
  const { fps } = useVideoConfig();
  if (!phrase) return fallbackFrame;
  const hit = findPhraseTime(words, phrase, afterSec);
  return hit ? Math.round(hit.start * fps) : fallbackFrame;
};
