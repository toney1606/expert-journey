import { ScenePlaceholder } from '../../components/ScenePlaceholder';
import type { CodeScene } from './schema';

// Stub: replaced by the real implementation.
export const CodeDiff: React.FC<{ scene: CodeScene }> = ({ scene }) => (
  <ScenePlaceholder type={scene.type} voice={scene.voice} />
);
