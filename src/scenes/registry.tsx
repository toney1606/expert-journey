import { ScenePlaceholder } from '../components/ScenePlaceholder';
import type { Scene } from '../schemas/video';
import { HookCard } from './HookCard/HookCard';

/**
 * Maps a scene's `type` to its component. The exhaustive-by-type switch keeps props typed.
 * Scene types without a component yet fall back to a placeholder.
 */
export const renderScene = (scene: Scene): React.ReactElement => {
  switch (scene.type) {
    case 'hook':
      return <HookCard scene={scene} />;
    default:
      return <ScenePlaceholder type={scene.type} voice={scene.voice} />;
  }
};
