import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPlan, formatPlan, scaffoldPlan, SCAFFOLD_MARKER } from './index';

const REPO = join(__dirname, '..', '..');

const topic = (slug: string) => ({
  slug,
  title: `T ${slug}`,
  question: `Q ${slug}?`,
  area: 'backend',
  why: 'because',
  sources: [{ title: 'Doc', url: 'https://example.com/doc' }],
});

const makeRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'plan-'));
  mkdirSync(join(root, 'content', 'intern'), { recursive: true });
  writeFileSync(
    join(root, 'content', 'curriculum.json'),
    JSON.stringify({
      startDate: '2026-11-22',
      slots: ['11:30', '19:30'],
      daysPerLevel: 2,
      levels: ['intern', 'fresher'],
    }),
  );
  writeFileSync(
    join(root, 'content', 'intern', 'topics.json'),
    JSON.stringify({ level: 'intern', topics: ['a', 'b', 'c', 'd'].map(topic) }),
  );
  return root;
};

const put = (root: string, rel: string, text = 'x') => {
  const file = join(root, rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, text);
};

describe('buildPlan', () => {
  it('orders entries with dates and slots, tolerating a missing topics.json', () => {
    const plan = buildPlan({ root: makeRoot() });
    expect(plan.map((e) => [e.topic, e.date, e.slot])).toEqual([
      ['a', '2026-11-22', '11:30'],
      ['b', '2026-11-22', '19:30'],
      ['c', '2026-11-23', '11:30'],
      ['d', '2026-11-23', '19:30'],
    ]);
    expect(plan[0]?.videoId).toBe('22112026-a');
    expect(plan[0]?.dayFolder).toBe('22112026');
    expect(plan[0]?.status).toBe('planned');
  });

  it('detects the most advanced status on disk', () => {
    const root = makeRoot();
    const base = 'content/intern/22112026';
    put(root, `${base}/a/research.md`, `${SCAFFOLD_MARKER}\n# a`);
    put(root, `${base}/b/research.md`, '# real research');
    put(root, `${base}/b/interview-kit.json`, '{}');
    put(
      root,
      'content/intern/23112026/c/video.json',
      JSON.stringify({ meta: { visibility: 'private' } }),
    );
    put(root, 'content/intern/23112026/d/video.json', '{}');
    put(root, 'public/generated/audio/23112026-d/manifest.json', '{}');
    put(root, 'out/23112026-d.mp4');
    const byTopic = Object.fromEntries(buildPlan({ root }).map((e) => [e.topic, e]));
    expect(byTopic.a?.status).toBe('stub');
    expect(byTopic.b?.status).toBe('researched');
    expect(byTopic.b?.flags).toEqual([]);
    expect(byTopic.c?.status).toBe('scripted');
    expect(byTopic.c?.flags).toEqual(['missing-kit', 'private']);
    expect(byTopic.d?.status).toBe('rendered');
  });

  it('reports voiced when audio manifest exists but no mp4', () => {
    const root = makeRoot();
    put(root, 'content/intern/22112026/a/video.json', '{}');
    put(root, 'public/generated/audio/22112026-a/manifest.json', '{}');
    expect(buildPlan({ root })[0]?.status).toBe('voiced');
  });
});

describe('formatPlan', () => {
  it('groups by level and day with totals and filters', () => {
    const plan = buildPlan({ root: makeRoot() });
    const text = formatPlan(plan);
    expect(text).toContain('INTERN');
    expect(text).toContain('22/11/2026 CN');
    expect(text).toContain('11:30');
    expect(text).toContain('Tổng intern: chưa có 4');
    expect(formatPlan(plan, { from: '2026-11-23' })).not.toContain('22/11/2026');
    expect(formatPlan(plan, { level: 'fresher' })).toContain('Không có');
  });
});

describe('scaffoldPlan', () => {
  it('creates stubs once and never overwrites', () => {
    const root = makeRoot();
    put(root, 'content/intern/22112026/a/research.md', 'MINE');
    const first = scaffoldPlan({ root });
    expect(first).toHaveLength(3);
    expect(readFileSync(join(root, 'content/intern/22112026/a/research.md'), 'utf8')).toBe('MINE');
    const text = readFileSync(first[0] as string, 'utf8');
    expect(text.startsWith(SCAFFOLD_MARKER)).toBe(true);
    expect(text).toContain('https://example.com/doc');
    expect(text).toContain('Câu trả lời mạnh / yếu');
    expect(scaffoldPlan({ root })).toEqual([]);
    expect(buildPlan({ root }).map((e) => e.status)).toEqual([
      'researched',
      'stub',
      'stub',
      'stub',
    ]);
  });
});

describe('real repo plan', () => {
  const plan = buildPlan({ root: REPO });
  it('has 168 entries, 28 per level, spanning the full calendar', () => {
    expect(plan).toHaveLength(168);
    for (const level of ['intern', 'fresher', 'junior', 'middle', 'senior', 'expert']) {
      expect(plan.filter((e) => e.level === level)).toHaveLength(28);
    }
    expect(plan[0]?.date).toBe('2026-11-22');
    expect(plan[167]?.date).toBe('2027-02-13');
  });
  it('places the pilot at junior day 1 slot 11:30', () => {
    const pilot = plan.find((e) => e.topic === 'database-index');
    expect(pilot).toMatchObject({
      level: 'junior',
      dayIndex: 0,
      slot: '11:30',
      videoId: '20122026-database-index',
    });
  });
  it('scaffold on a copy of the real layout is idempotent', () => {
    const root = mkdtempSync(join(tmpdir(), 'plan-real-'));
    cpSync(join(REPO, 'content'), join(root, 'content'), { recursive: true });
    const before = scaffoldPlan({ root });
    expect(before.length).toBeGreaterThanOrEqual(0);
    expect(scaffoldPlan({ root })).toEqual([]);
    expect(existsSync(join(root, 'content/junior/20122026/database-index/video.json'))).toBe(true);
  });
});
