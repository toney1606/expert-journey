import { useMemo } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fontFamily, spacing } from '../../design/tokens';
import { springs } from '../../design/springs';
import { activeWordIndex, buildCaptionPages, pageAt } from '../../lib/captions';
import type { CaptionWord } from '../../lib/captions';

type Props = {
  /** Word timings in seconds from the start of the scene audio (manifest `words`). */
  words: readonly CaptionWord[];
  /** Frame (inside the surrounding Sequence) at which the scene audio starts. Default 0. */
  startFrame?: number;
};

const FONT_SIZE = 58;
const MAX_WIDTH = 850;

/**
 * Word-by-word captions. Render inside the scene's Sequence; it pins itself to the bottom of its
 * (positioned) parent, which decides the caption band. Renders nothing without words.
 */
export const Captions: React.FC<Props> = ({ words, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(() => buildCaptionPages(words), [words]);

  const t = (frame - startFrame) / fps;
  const page = pageAt(pages, t);
  if (!page) return null;

  const active = activeWordIndex(page, t);
  const pop = spring({
    frame: frame - startFrame - Math.round(page.start * fps),
    fps,
    config: springs.snappy,
    durationInFrames: 12,
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          maxWidth: MAX_WIDTH,
          boxSizing: 'border-box',
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderRadius: 36,
          backgroundColor: 'rgba(49, 50, 68, 0.82)',
          fontFamily: fontFamily.title,
          fontWeight: 800,
          fontSize: FONT_SIZE,
          lineHeight: 1.35,
          textAlign: 'center',
          overflowWrap: 'anywhere',
          textShadow: '0 3px 10px rgba(0, 0, 0, 0.55)',
          transform: `scale(${0.85 + 0.15 * pop})`,
          transformOrigin: '50% 100%',
          opacity: Math.min(1, pop * 2),
        }}
      >
        {page.words.map((word, i) => (
          <span
            key={`${word.start}-${i}`}
            style={{ color: i === active ? colors.accent : colors.text }}
          >
            {word.text}
            {i < page.words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </div>
  );
};
