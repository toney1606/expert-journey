import { ScenePlaceholder } from '../../components/ScenePlaceholder';
import type { DiagramScene } from './schema';

// Stub: replaced by the real implementation.
export const Diagram: React.FC<{ scene: DiagramScene }> = ({ scene }) => (
  <ScenePlaceholder type={scene.type} voice={scene.voice} />
);
