export type TimedScene = { id: string; draft: { durationSec: number } };

const toFrames = (seconds: number, fps: number): number => Math.max(1, Math.round(seconds * fps));

/** Frame count for each scene, from the temporary draft durations. */
export const sceneDurationsInFrames = (scenes: readonly TimedScene[], fps: number): number[] =>
  scenes.map((scene) => toFrames(scene.draft.durationSec, fps));

export const totalDurationInFrames = (scenes: readonly TimedScene[], fps: number): number => {
  if (scenes.length === 0) {
    throw new Error('Cannot compute duration of a video with no scenes');
  }
  return sceneDurationsInFrames(scenes, fps).reduce((sum, frames) => sum + frames, 0);
};

/** Start frame of each scene given consecutive playback. */
export const sceneStartFrames = (durations: readonly number[]): number[] => {
  let cursor = 0;
  return durations.map((duration) => {
    const start = cursor;
    cursor += duration;
    return start;
  });
};
