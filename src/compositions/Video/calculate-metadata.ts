import { staticFile } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { VIDEO } from '../../design/tokens';
import { fetchAudioManifest, fetchBedInfo } from '../../lib/audio-manifest';
import { totalDurationInFrames } from '../../lib/duration';
import type { VideoCompositionProps } from './schema';

/**
 * Duration comes from data, never a hardcoded frame count: real audio lengths from the
 * `pnpm tts` manifest when present, otherwise each scene's draft duration.
 */
export const calculateVideoMetadata: CalculateMetadataFunction<VideoCompositionProps> = async ({
  props,
}) => {
  const { id } = props.video.meta;
  const audio = await fetchAudioManifest(staticFile(`generated/audio/${id}/manifest.json`), id);
  // Music + sound-effect bed from `pnpm sfx` (optional; needs the manifest it was timed against).
  const bed = audio ? await fetchBedInfo(staticFile(`generated/audio/${id}/bed.json`)) : undefined;
  return {
    durationInFrames: totalDurationInFrames(props.video.scenes, VIDEO.fps, audio?.scenes),
    fps: VIDEO.fps,
    width: VIDEO.width,
    height: VIDEO.height,
    props: { ...props, audio, bed },
  };
};
