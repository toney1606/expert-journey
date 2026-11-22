import { AbsoluteFill, Html5Audio, Series, staticFile, useVideoConfig } from 'remotion';
import { Captions } from '../../components/Captions/Captions';
import { SafeZoneFrame } from '../../components/SafeZoneFrame';
import { colors } from '../../design/tokens';
import { useFonts } from '../../design/useFonts';
import { sceneDurationsInFrames } from '../../lib/duration';
import { renderScene } from '../../scenes/registry';
import type { VideoCompositionProps } from './schema';

export const Video: React.FC<VideoCompositionProps> = ({ video, debugSafeZone, audio }) => {
  useFonts();
  const { fps } = useVideoConfig();
  const durations = sceneDurationsInFrames(video.scenes, fps, audio?.scenes);

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Series>
        {video.scenes.map((scene, index) => {
          const entry = audio?.scenes.find((candidate) => candidate.sceneId === scene.id);
          return (
            <Series.Sequence key={scene.id} durationInFrames={durations[index] ?? 1}>
              <SafeZoneFrame
                debug={debugSafeZone}
                footer={entry?.words ? <Captions words={entry.words} /> : null}
              >
                {renderScene(scene)}
              </SafeZoneFrame>
              {entry ? <Html5Audio src={staticFile(entry.file)} /> : null}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
