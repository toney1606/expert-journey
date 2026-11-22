import { ScenePlaceholder } from '../../components/ScenePlaceholder';
import type { SummaryScene } from './schema';

// Stub: replaced by the real implementation.
export const Summary: React.FC<{ scene: SummaryScene }> = ({ scene }) => (
  <ScenePlaceholder type={scene.type} voice={scene.voice} />
);
