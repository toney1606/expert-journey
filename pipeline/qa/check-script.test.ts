import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AudioManifest } from '../../src/schemas/audio-manifest';
import { VideoSchema, type Video } from '../../src/schemas/video';
import { checkLayout } from './check-layout';
import {
  checkCueMissing,
  checkDigitsInVoice,
  checkHookLength,
  checkHookOpening,
  checkHookQuestion,
  checkLoop,
  checkMarkup,
  checkMoodMonotony,
  checkScript,
  checkSceneLong,
  checkSentenceLong,
  hasBrokenMarkup,
} from './check-script';
import { runQa } from './index';
import type { QaCheck, QaContext } from './types';

const repoRoot = resolve(import.meta.dirname, '../..');

type SceneInput = {
  id: string;
  type?: string;
  voice?: string;
  sec?: number;
  mood?: string;
  props?: unknown;
};
const DEFAULT_PROPS: Record<string, unknown> = {
  hook: { headline: 'Index la gi?' },
  summary: { points: ['a'] },
  summaryLoop: { points: ['a'] },
  callout: { kind: 'fact', statement: 'Mot cau' },
};

const video = (scenes: SceneInput[]): Video =>
  VideoSchema.parse({
    meta: { id: 'v', title: 't', topic: 'topic', level: 'junior', question: 'q' },
    sources: [{ title: 'src' }],
    scenes: scenes.map((scene) => ({
      id: scene.id,
      type: scene.type ?? 'hook',
      voice: scene.voice ?? 'cau hoi la gi',
      draft: { durationSec: scene.sec ?? 10 },
      ...(scene.mood ? { mood: scene.mood } : {}),
      props: scene.props ?? DEFAULT_PROPS[scene.type ?? 'hook'],
    })),
  });

const ctxOf = (v: Video, manifest?: AudioManifest): QaContext => ({
  root: repoRoot,
  video: v,
  manifest,
});
const run = (check: QaCheck, scenes: SceneInput[], manifest?: AudioManifest) =>
  check(ctxOf(video(scenes), manifest));

describe('hook checks', () => {
  it('warns on a greeting opening, accent-insensitively', () => {
    for (const voice of [
      'Xin chào các bạn, hôm nay',
      'Hôm nay mình nói về index',
      'Trong video này ta',
    ]) {
      expect(run(checkHookOpening, [{ id: 'h', voice }])).toMatchObject([
        { severity: 'warn', code: 'script.hook-opening', sceneId: 'h' },
      ]);
    }
    expect(
      run(checkHookOpening, [{ id: 'h', voice: 'Index là gì? Hôm nay không quan trọng' }]),
    ).toEqual([]);
  });

  it('warns on a hook longer than 35 words only', () => {
    const long = Array.from({ length: 36 }, () => 'tu').join(' ');
    const ok = Array.from({ length: 35 }, () => 'tu').join(' ');
    expect(run(checkHookLength, [{ id: 'h', voice: long }])).toMatchObject([
      { code: 'script.hook-length' },
    ]);
    expect(run(checkHookLength, [{ id: 'h', voice: ok }])).toEqual([]);
  });

  it('wants a question mark in voice or text', () => {
    expect(
      run(checkHookQuestion, [{ id: 'h', voice: 'khong co', props: { headline: 'khong co' } }]),
    ).toMatchObject([{ code: 'script.hook-question', severity: 'warn' }]);
    expect(run(checkHookQuestion, [{ id: 'h', voice: 'khong co' }])).toEqual([]); // headline has ?
    expect(
      run(checkHookQuestion, [{ id: 'h', voice: 'Sao lai the?', props: { headline: 'x' } }]),
    ).toEqual([]);
  });

  it('ignores videos whose first scene is not a hook', () => {
    const scenes = [{ id: 's', type: 'summary', voice: 'Xin chào' }];
    expect(run(checkHookOpening, scenes)).toEqual([]);
    expect(run(checkHookQuestion, scenes)).toEqual([]);
  });
});

describe('voice checks', () => {
  it('flags sentences over 25 words', () => {
    const long = `${Array.from({ length: 26 }, () => 'tu').join(' ')}.`;
    expect(run(checkSentenceLong, [{ id: 'a', voice: `Ngan. ${long}` }])).toMatchObject([
      { code: 'script.sentence-long', severity: 'warn' },
    ]);
    const split = `${Array.from({ length: 20 }, () => 'tu').join(' ')}. ${Array.from({ length: 20 }, () => 'tu').join(' ')}.`;
    expect(run(checkSentenceLong, [{ id: 'a', voice: split }])).toEqual([]);
  });

  it('flags digits and symbols', () => {
    for (const voice of ['co 100 ban ghi', 'nhanh hon 50%', 'a × b', 'a ≠ b', 'do phuc tap O(n)']) {
      expect(run(checkDigitsInVoice, [{ id: 'a', voice }])).toMatchObject([
        { code: 'script.digits-in-voice', severity: 'warn' },
      ]);
    }
    expect(run(checkDigitsInVoice, [{ id: 'a', voice: 'mot tram nghin ban ghi' }])).toEqual([]);
  });

  it('flags scenes longer than 25s from the draft, and from the manifest when present', () => {
    expect(run(checkSceneLong, [{ id: 'a', sec: 26 }])).toMatchObject([
      { code: 'script.scene-long' },
    ]);
    expect(run(checkSceneLong, [{ id: 'a', sec: 25 }])).toEqual([]);
    const manifest: AudioManifest = {
      videoId: 'v',
      provider: 'fake',
      scenes: [{ sceneId: 'a', file: 'a.wav', format: 'wav', durationSec: 30, textHash: 'h' }],
    };
    expect(run(checkSceneLong, [{ id: 'a', sec: 10 }], manifest)).toHaveLength(1);
  });
});

describe('script.cue-missing', () => {
  it('errors when a cue phrase is not in the voice, ignoring accents and case', () => {
    const scenes: SceneInput[] = [
      {
        id: 'h',
        voice: 'Một câu hỏi về Index trong database',
        props: { headline: 'x', atHeadline: 'câu hỏi', atSubline: 'khong co dau' },
      },
    ];
    const issues = run(checkCueMissing, scenes);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: 'error',
      code: 'script.cue-missing',
      sceneId: 'h',
    });
    expect(issues[0]?.message).toContain('atSubline');
    expect(
      run(checkCueMissing, [{ ...scenes[0]!, voice: 'Index. KHÔNG CÓ ĐÂU, nhe' }]).map(
        (i) => i.message.split(' ')[0],
      ),
    ).toEqual(['atHeadline']);
  });

  it('reaches nested and list cue fields', () => {
    const issues = run(checkCueMissing, [
      {
        id: 'd',
        type: 'diagram',
        voice: 'mot hai ba',
        props: {
          title: 'T',
          nodes: [
            { id: 'a', label: 'A', at: 'mot' },
            { id: 'b', label: 'B', at: 'bon' },
          ],
          edges: [{ from: 'a', to: 'b', at: 'nam' }],
          pathAt: 'sau',
        },
      },
      {
        id: 's',
        type: 'summary',
        voice: 'alpha beta',
        props: { points: ['x', 'y'], pointsAt: ['alpha', 'gamma'], loopAt: 'zeta' },
      },
    ]);
    expect(issues.map((i) => i.message.split(' ')[0])).toEqual([
      'nodes[1].at',
      'edges[0].at',
      'pathAt',
      'pointsAt[1]',
      'loopAt',
    ]);
  });

  it('matches against manifest words when they agree with the voice, else against the voice', () => {
    const entry = (words: string[]): AudioManifest => ({
      videoId: 'v',
      provider: 'edge',
      scenes: [
        {
          sceneId: 'h',
          file: 'h.mp3',
          format: 'mp3',
          durationSec: 2,
          textHash: 'x',
          words: words.map((text, i) => ({ start: i, end: i + 1, text })),
        },
      ],
    });
    const scenes = [
      { id: 'h', voice: 'Spoken, words!', props: { headline: 'x', atHeadline: 'spoken words' } },
    ];
    expect(run(checkCueMissing, scenes, entry(['Spoken', 'words']))).toEqual([]);
    // stale manifest (older text): the authored voice is used instead of the old words
    expect(run(checkCueMissing, scenes, entry(['old', 'text']))).toEqual([]);
    const missing = [
      { id: 'h', voice: 'Spoken, words!', props: { headline: 'x', atHeadline: 'nowhere' } },
    ];
    expect(run(checkCueMissing, missing, entry(['Spoken', 'words']))).toHaveLength(1);
  });
});

describe('script.mood-monotony', () => {
  const scene = (i: number, type: string, mood?: string): SceneInput => ({
    id: `s${i}`,
    type,
    mood,
  });
  it('warns once for 4+ consecutive scenes with the same resolved mood', () => {
    const issues = run(checkMoodMonotony, [
      scene(0, 'hook'),
      scene(1, 'summary', 'concept'),
      scene(2, 'hook'),
      scene(3, 'summary', 'concept'),
      scene(4, 'summary'),
    ]);
    expect(issues).toMatchObject([
      { code: 'script.mood-monotony', sceneId: 's0', severity: 'warn' },
    ]);
    expect(
      run(checkMoodMonotony, [
        scene(0, 'hook'),
        scene(1, 'hook'),
        scene(2, 'hook'),
        scene(3, 'summary'),
      ]),
    ).toEqual([]);
  });

  it('resolves callout moods from their kind', () => {
    const c = (i: number, kind: string): SceneInput => ({
      id: `c${i}`,
      type: 'callout',
      props: { kind, statement: 's' },
    });
    expect(
      run(checkMoodMonotony, [c(0, 'fact'), c(1, 'myth'), c(2, 'warning'), c(3, 'tip')]),
    ).toEqual([]);
    expect(
      run(checkMoodMonotony, [c(0, 'fact'), c(1, 'fact'), c(2, 'fact'), c(3, 'fact')]),
    ).toHaveLength(1);
  });
});

describe('script.loop', () => {
  const hook: SceneInput = {
    id: 'h',
    voice: 'Index database chạy nhanh hơn thế nào?',
    props: { headline: 'Index database nhanh vì sao?' },
  };
  it('warns when the last scene shares fewer than 3 significant words', () => {
    expect(
      run(checkLoop, [
        hook,
        { id: 's', type: 'summary', voice: 'Tom lai thoi', props: { points: ['a'] } },
      ]),
    ).toMatchObject([{ code: 'script.loop', severity: 'warn', sceneId: 's' }]);
  });

  it('passes when it echoes the hook', () => {
    expect(
      run(checkLoop, [
        hook,
        {
          id: 's',
          type: 'summary',
          voice: 'Index giup database chạy nhanh hơn',
          props: { points: ['a'] },
        },
      ]),
    ).toEqual([]);
  });

  it('skips an endcard whose loopLine shares >= 2 words', () => {
    const end = (loopLine: string): SceneInput => ({
      id: 'e',
      type: 'endcard',
      voice: 'Het roi',
      props: { headline: 'Xong', loopLine },
    });
    expect(run(checkLoop, [hook, end('Index database là gì nhỉ')])).toEqual([]);
    expect(run(checkLoop, [hook, end('Chuyện khác hẳn')])).toHaveLength(1);
  });
});

describe('script.markup', () => {
  it('detects unbalanced markup but accepts balanced and escaped braces', () => {
    expect(hasBrokenMarkup('a {accent|b} c')).toBe(false);
    expect(hasBrokenMarkup('a {accent|b {wrong|c}} c')).toBe(false);
    expect(hasBrokenMarkup(String.raw`literal \{ brace`)).toBe(false);
    expect(hasBrokenMarkup('a {accent|b c')).toBe(true);
    expect(hasBrokenMarkup('a b} c')).toBe(true);
    expect(hasBrokenMarkup('{accent b}')).toBe(true);
  });

  it('ignores stepLabel placeholders', () => {
    const props = {
      title: 'T',
      nodes: [{ id: 'a', label: 'A' }],
      edges: [],
      stepLabel: 'Bước {k}/{n}',
    };
    expect(run(checkMarkup, [{ id: 'd', type: 'diagram', props }])).toEqual([]);
  });

  it('reports the offending prop path, skipping code scenes', () => {
    const issues = run(checkMarkup, [
      { id: 'h', props: { headline: 'ok {accent|x}', subline: 'bad {accent|x' } },
      {
        id: 'c',
        type: 'code',
        props: { language: 'js', before: 'if (a) {', after: '}', testPath: 't' },
      },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: 'script.markup', sceneId: 'h', severity: 'warn' });
    expect(issues[0]?.message).toContain('subline');
  });
});

describe('registry and real content', () => {
  it('is wired into runQa', () => {
    const v = video([{ id: 'h', voice: 'Xin chào', props: { headline: 'x' } }]);
    const codes = runQa({ root: repoRoot, video: v }).issues.map((i) => i.code);
    expect(codes).toContain('script.hook-opening');
    expect(codes).toContain('script.hook-question');
  });

  it('does not crash on the real database-index video', () => {
    const file = join(repoRoot, 'content/junior/20122026/database-index/video.json');
    if (!existsSync(file)) return;
    const parsed = VideoSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
    if (!parsed.success) return; // being rewritten by another agent
    const issues = checkScript({ root: repoRoot, video: parsed.data });
    expect(Array.isArray(issues)).toBe(true);
    expect(checkLayout({ root: repoRoot, video: parsed.data })).toBeInstanceOf(Array);
  });
});

describe('new scene layout checks', () => {
  const long = 'rất dài '.repeat(120);
  it('errors with shorten/split when stat, compare, callout, endcard overflow', () => {
    const scenes: SceneInput[] = [
      {
        id: 'st',
        type: 'stat',
        props: { title: long, items: [{ label: long, value: 1 }], footnote: long },
      },
      {
        id: 'cm',
        type: 'compare',
        props: {
          title: long,
          left: { label: long, caption: long },
          right: { label: long, caption: long },
          verdict: long,
        },
      },
      { id: 'co', type: 'callout', props: { kind: 'myth', statement: long, explanation: long } },
      {
        id: 'en',
        type: 'endcard',
        props: { headline: long, subline: long, cta: long, loopLine: long },
      },
    ];
    const issues = checkLayout(ctxOf(video(scenes)));
    expect(issues.map((i) => i.code)).toEqual([
      'layout.stat-overflow',
      'layout.compare-overflow',
      'layout.callout-overflow',
      'layout.endcard-overflow',
    ]);
    for (const issue of issues) {
      expect(issue.severity).toBe('error');
      expect(issue.message).toContain('shorten');
      expect(issue.message).toContain('split');
    }
  });

  it('passes short content with optional fields omitted', () => {
    const scenes: SceneInput[] = [
      { id: 'st', type: 'stat', props: { title: 'T', items: [{ label: 'L', value: 10 }] } },
      {
        id: 'cm',
        type: 'compare',
        props: { title: 'T', left: { label: 'A' }, right: { label: 'B' } },
      },
      { id: 'co', type: 'callout', props: { kind: 'tip', statement: 'Ngắn gọn' } },
      { id: 'en', type: 'endcard', props: { headline: 'Xong' } },
    ];
    expect(checkLayout(ctxOf(video(scenes)))).toEqual([]);
  });

  it('uses the smaller path box for a diagram with a path', () => {
    const ids = Array.from({ length: 6 }, (_, i) => `n${i}`);
    const props = (path?: string[]) => ({
      title: 'T',
      nodes: ids.map((id) => ({ id, label: 'Step' })),
      edges: ids.slice(1).map((to, i) => ({ from: ids[i], to })),
      ...(path ? { path } : {}),
    });
    const withPath = checkLayout(ctxOf(video([{ id: 'd', type: 'diagram', props: props(ids) }])));
    const without = checkLayout(ctxOf(video([{ id: 'd', type: 'diagram', props: props() }])));
    // never fewer issues with the smaller box
    expect(withPath.length).toBeGreaterThanOrEqual(without.length);
  });
});
