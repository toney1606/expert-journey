import { ScenePlaceholder } from '../../components/ScenePlaceholder';
import type { TradeoffScene } from './schema';

// Stub: replaced by the real implementation.
export const Tradeoff: React.FC<{ scene: TradeoffScene }> = ({ scene }) => (
  <ScenePlaceholder type={scene.type} voice={scene.voice} />
);
