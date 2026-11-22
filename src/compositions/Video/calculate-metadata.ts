import type { CalculateMetadataFunction } from 'remotion';
import { VIDEO } from '../../design/tokens';
import { totalDurationInFrames } from '../../lib/duration';
import type { VideoCompositionProps } from './schema';

/**
 * Duration comes from data, never a hardcoded frame count. Today it is the sum of the
 * scenes' draft durations; real audio durations will replace them here.
 */
export const calculateVideoMetadata: CalculateMetadataFunction<VideoCompositionProps> = ({
  props,
}) => ({
  durationInFrames: totalDurationInFrames(props.video.scenes, VIDEO.fps),
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
});
