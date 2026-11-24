import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findPhraseTime } from '../../lib/spoken';
import { costRoadsLayout } from './layout';
import { CostRoadsSceneSchema } from './schema';

const FRAGMENT = 'content/junior/23112026/database-index-guess/scenes/03-cost.json';
const SCRIPT = 'content/junior/23112026/database-index-guess/notes/script-v1.md';

describe('cost fragment', () => {
  const raw: unknown = JSON.parse(readFileSync(FRAGMENT, 'utf8'));
  const scene = CostRoadsSceneSchema.parse(raw);

  it('parses with the costroads schema', () => {
    expect(scene.id).toBe('cost');
    expect(scene.props.randomCost).toBe(4);
  });
  it('voice is byte-for-byte the approved script section', () => {
    const md = readFileSync(SCRIPT, 'utf8');
    const section = /^## 3 CostScene\n([\s\S]*?)(?=\n## |$)/m.exec(md)?.[1]?.trim();
    expect(scene.voice).toBe(section);
  });
  it('every cue phrase occurs in the voice, in reveal order', () => {
    const p = scene.props;
    const words = scene.voice.split(/\s+/).map((w, i) => ({ text: w, start: i, end: i + 0.5 }));
    const phrases = [
      p.roadsAt,
      p.randomAt,
      p.seqAt,
      p.engineAt,
      p.multAt,
      p.rowsAt,
      p.priceAt,
      p.costAt,
      p.guessAt,
      p.statsAt,
    ];
    let previous = -1;
    for (const phrase of phrases) {
      expect(phrase).toBeTruthy();
      const hit = findPhraseTime(words, phrase ?? '');
      expect(hit).toBeDefined();
      expect(hit?.start ?? -1).toBeGreaterThanOrEqual(previous);
      previous = hit?.start ?? -1;
    }
  });
  it('fits the layout box', () => {
    expect(costRoadsLayout(scene.props).fits).toBe(true);
  });
});
