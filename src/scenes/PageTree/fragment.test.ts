import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatNumber } from '../Stat/format';
import { findPhraseTime } from '../../lib/spoken';
import { PageTreeSceneSchema } from './schema';

const FRAGMENT = 'content/junior/23112026/database-index-guess/scenes/02-three-reads.json';
const SCRIPT = 'content/junior/23112026/database-index-guess/notes/script-v1.md';

describe('three-reads fragment', () => {
  const raw: unknown = JSON.parse(readFileSync(FRAGMENT, 'utf8'));
  const scene = PageTreeSceneSchema.parse(raw);

  it('parses with the pagetree schema', () => {
    expect(scene.id).toBe('three-reads');
    expect(scene.props.fanout).toBe(300);
  });
  it('voice is byte-for-byte the approved script section', () => {
    const md = readFileSync(SCRIPT, 'utf8');
    const section = /^## 2 ThreeReadsScene\n([\s\S]*?)(?=\n## |$)/m.exec(md)?.[1]?.trim();
    expect(scene.voice).toBe(section);
  });
  it('every cue phrase occurs in the voice', () => {
    const p = scene.props;
    const words = scene.voice.split(/\s+/).map((w, i) => ({ text: w, start: i, end: i + 0.5 }));
    for (const phrase of [p.pageAt, p.fanoutAt, p.levelsAt, p.totalAt, p.populationAt, p.readsAt]) {
      expect(phrase).toBeTruthy();
      expect(findPhraseTime(words, phrase ?? '')).toBeDefined();
    }
  });
  it('formats the displayed numbers like the owner spec', () => {
    expect(formatNumber(scene.props.total)).toBe('27.000.000');
    expect(formatNumber(scene.props.population)).toBe('10.000.000');
    expect(`×${formatNumber(scene.props.fanout)}`).toBe('×300');
  });
});
