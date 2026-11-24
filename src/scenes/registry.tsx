import type { Scene } from '../schemas/video';
import { Callout } from './Callout/Callout';
import { CodeDiff } from './CodeDiff/CodeDiff';
import { Compare } from './Compare/Compare';
import { Diagram } from './Diagram/Diagram';
import { EndCard } from './EndCard/EndCard';
import { HookCard } from './HookCard/HookCard';
import { CounterHook } from './CounterHook/CounterHook';
import { PageTree } from './PageTree/PageTree';
import { CostRoads } from './CostRoads/CostRoads';
import { RowSetup } from './RowSetup/RowSetup';
import { RowTwist } from './RowTwist/RowTwist';
import { RowFix } from './RowFix/RowFix';
import { IndexCards } from './IndexCards/IndexCards';
import { PageSlider } from './PageSlider/PageSlider';
import { Stat } from './Stat/Stat';
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
    case 'stat':
      return <Stat scene={scene} />;
    case 'compare':
      return <Compare scene={scene} />;
    case 'callout':
      return <Callout scene={scene} />;
    case 'endcard':
      return <EndCard scene={scene} />;
    case 'counterhook':
      return <CounterHook scene={scene} />;
    case 'pagetree':
      return <PageTree scene={scene} />;
    case 'costroads':
      return <CostRoads scene={scene} />;
    case 'rowsetup':
      return <RowSetup scene={scene} />;
    case 'rowtwist':
      return <RowTwist scene={scene} />;
    case 'rowfix':
      return <RowFix scene={scene} />;
    case 'indexcards':
      return <IndexCards scene={scene} />;
    case 'pageslider':
      return <PageSlider scene={scene} />;
  }
};
