import {
  AbsoluteFill,
  Html5Audio,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Backdrop } from '../../components/Backdrop/Backdrop';
import { Captions } from '../../components/Captions/Captions';
import { SafeZoneFrame } from '../../components/SafeZoneFrame';
import { SceneTimingProvider } from '../../components/SceneTiming';
import { defaultMoodFor, moodBlendAt } from '../../design/mood';
import { colors } from '../../design/tokens';
import { useFonts } from '../../design/useFonts';
import { sceneDurationsInFrames, sceneStartFrames } from '../../lib/duration';
import { renderScene } from '../../scenes/registry';
import type { VideoCompositionProps } from './schema';
import { sceneTransitionAt } from './transition';

/** Half-width in frames of the backdrop colour crossfade around each cut. */
const MOOD_WINDOW = 12;

/** Fades the scene in over its first frames and out over its last frames. */
const SceneTransition: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { opacity, slide } = sceneTransitionAt(frame, durationInFrames);
  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${slide}px)` }}>{children}</AbsoluteFill>
  );
};

export const Video: React.FC<VideoCompositionProps> = ({ video, debugSafeZone, audio, bed }) => {
  useFonts();
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const durations = sceneDurationsInFrames(video.scenes, fps, audio?.scenes);
  const starts = sceneStartFrames(durations);
  const moods = video.scenes.map((scene) => scene.mood ?? defaultMoodFor(scene.type, scene.props));
  const blend = moodBlendAt(moods, starts, frame, MOOD_WINDOW);

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Backdrop from={blend.from} to={blend.to} mix={blend.mix} />
      <Series>
        {video.scenes.map((scene, index) => {
          const entry = audio?.scenes.find((candidate) => candidate.sceneId === scene.id);
          const duration = durations[index] ?? 1;
          return (
            <Series.Sequence key={scene.id} durationInFrames={duration}>
              <SceneTransition durationInFrames={duration}>
                <SafeZoneFrame
                  debug={debugSafeZone}
                  footer={entry?.words ? <Captions words={entry.words} /> : null}
                >
                  <SceneTimingProvider words={entry?.words ?? []}>
                    {renderScene(scene)}
                  </SceneTimingProvider>
                </SafeZoneFrame>
              </SceneTransition>
              {entry ? (
                <Html5Audio src={staticFile(entry.file)} volume={bed?.voiceGain ?? 1} />
              ) : null}
            </Series.Sequence>
          );
        })}
      </Series>
      {bed ? <Html5Audio src={staticFile(`generated/audio/${video.meta.id}/bed.wav`)} /> : null}
    </AbsoluteFill>
  );
};
