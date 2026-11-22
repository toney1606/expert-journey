import { ScenePlaceholder } from '../../components/ScenePlaceholder';
import type { TerminalScene } from './schema';

// Stub: replaced by the real implementation.
export const Terminal: React.FC<{ scene: TerminalScene }> = ({ scene }) => (
  <ScenePlaceholder type={scene.type} voice={scene.voice} />
);
