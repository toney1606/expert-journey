import { Composition } from 'remotion';
import sampleJson from '../content/samples/sample/video.json';
import { FontTest } from './compositions/FontTest';
import { calculateVideoMetadata } from './compositions/Video/calculate-metadata';
import { VideoCompositionPropsSchema } from './compositions/Video/schema';
import { Video } from './compositions/Video/Video';
import { VIDEO } from './design/tokens';
import { VideoSchema } from './schemas/video';

// Invalid content fails loudly here, at the boundary between data and rendering.
const sampleVideo = VideoSchema.parse(sampleJson);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Video"
      component={Video}
      schema={VideoCompositionPropsSchema}
      defaultProps={{ video: sampleVideo, debugSafeZone: true }}
      calculateMetadata={calculateVideoMetadata}
      durationInFrames={VIDEO.fps}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="FontTest"
      component={FontTest}
      durationInFrames={VIDEO.fps}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  </>
);
