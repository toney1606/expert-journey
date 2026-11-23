import { interpolate } from 'remotion';

/** Frames over which a scene fades (and slides slightly) in and out; durations are unchanged. */
export const FADE_FRAMES = 8;
export const SLIDE_PX = 28;

/** Fade length for a scene: at most FADE_FRAMES and a third of the scene; 0 for scenes under 3 frames. */
export const fadeFramesFor = (durationInFrames: number): number =>
  Math.max(0, Math.min(FADE_FRAMES, Math.floor(durationInFrames / 3)));

/** Opacity and vertical slide of a scene at `frame`; scenes too short to fade stay fully visible. */
export const sceneTransitionAt = (
  frame: number,
  durationInFrames: number,
): { opacity: number; slide: number } => {
  const fade = fadeFramesFor(durationInFrames);
  if (fade === 0) return { opacity: 1, slide: 0 };
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  return {
    opacity: interpolate(
      frame,
      [0, fade, durationInFrames - fade, durationInFrames],
      [0, 1, 1, 0],
      clamp,
    ),
    slide: interpolate(frame, [0, fade], [SLIDE_PX, 0], clamp),
  };
};
