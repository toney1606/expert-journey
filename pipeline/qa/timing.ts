import { sceneSeconds } from '../../src/lib/duration';
import type { QaContext } from './types';

/** Seconds of each scene: manifest audio + tail when available, else draft. */
export const sceneLengths = (ctx: QaContext): number[] =>
  ctx.video.scenes.map((scene) => sceneSeconds(scene, ctx.manifest?.scenes));

export const totalSeconds = (ctx: QaContext): number =>
  sceneLengths(ctx).reduce((sum, seconds) => sum + seconds, 0);

/** Start time of every scene after the first (internal cut points), in seconds. */
export const boundaries = (ctx: QaContext): number[] => {
  const lengths = sceneLengths(ctx);
  const result: number[] = [];
  let cursor = 0;
  for (const length of lengths.slice(0, -1)) {
    cursor += length;
    result.push(cursor);
  }
  return result;
};
