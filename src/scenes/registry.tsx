import type { Scene } from '../schemas/video';
import { CodeDiff } from './CodeDiff/CodeDiff';
import { Diagram } from './Diagram/Diagram';
import { HookCard } from './HookCard/HookCard';
import { Summary } from './Summary/Summary';
import { Terminal } from './Terminal/Terminal';
import { Tradeoff } from './Tradeoff/Tradeoff';

/** Maps a scene's `type` to its component. The switch is exhaustive, so props stay typed. */
export const renderScene = (scene: Scene): React.ReactElement => {
  switch (scene.type) {
    case 'hook':
      return <HookCard scene={scene} />;
    case 'diagram':
      return <Diagram scene={scene} />;
    case 'code':
      return <CodeDiff scene={scene} />;
    case 'terminal':
      return <Terminal scene={scene} />;
    case 'tradeoff':
      return <Tradeoff scene={scene} />;
    case 'summary':
      return <Summary scene={scene} />;
  }
};
