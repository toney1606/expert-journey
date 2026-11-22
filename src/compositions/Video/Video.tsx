import { AbsoluteFill, Series, useVideoConfig } from 'remotion';
import { SafeZoneFrame } from '../../components/SafeZoneFrame';
import { colors } from '../../design/tokens';
import { useFonts } from '../../design/useFonts';
import { sceneDurationsInFrames } from '../../lib/duration';
import { renderScene } from '../../scenes/registry';
import type { VideoCompositionProps } from './schema';

export const Video: React.FC<VideoCompositionProps> = ({ video, debugSafeZone }) => {
  useFonts();
  const { fps } = useVideoConfig();
  const durations = sceneDurationsInFrames(video.scenes, fps);

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <SafeZoneFrame debug={debugSafeZone}>
        <Series>
          {video.scenes.map((scene, index) => (
            <Series.Sequence key={scene.id} durationInFrames={durations[index] ?? 1}>
              {renderScene(scene)}
            </Series.Sequence>
          ))}
        </Series>
      </SafeZoneFrame>
    </AbsoluteFill>
  );
};
