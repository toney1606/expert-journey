/** Silence kept after the narration of each scene so cuts do not feel abrupt. */
export const SCENE_TAIL_SEC = 0.4;

export type TimedScene = { id: string; draft: { durationSec: number } };
export type AudioEntry = { sceneId: string; durationSec: number };

const toFrames = (seconds: number, fps: number): number => Math.max(1, Math.round(seconds * fps));

/** Real audio length (plus tail) wins over the temporary draft duration. */
export const sceneSeconds = (scene: TimedScene, audio?: readonly AudioEntry[]): number => {
  const entry = audio?.find((candidate) => candidate.sceneId === scene.id);
  return entry ? entry.durationSec + SCENE_TAIL_SEC : scene.draft.durationSec;
};

/** Frame count for each scene. */
export const sceneDurationsInFrames = (
  scenes: readonly TimedScene[],
  fps: number,
  audio?: readonly AudioEntry[],
): number[] => scenes.map((scene) => toFrames(sceneSeconds(scene, audio), fps));

export const totalDurationInFrames = (
  scenes: readonly TimedScene[],
  fps: number,
  audio?: readonly AudioEntry[],
): number => {
  if (scenes.length === 0) {
    throw new Error('Cannot compute duration of a video with no scenes');
  }
  return sceneDurationsInFrames(scenes, fps, audio).reduce((sum, frames) => sum + frames, 0);
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
