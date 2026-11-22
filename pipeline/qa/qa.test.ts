import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AudioManifest } from '../../src/schemas/audio-manifest';
import { VideoSchema, type Video } from '../../src/schemas/video';
import { checkCode } from './check-code';
import { checkDuration } from './check-duration';
import { checkLayout } from './check-layout';
import { checkNarration } from './check-narration';
import { checkPolicy } from './check-policy';
import { checkRehook } from './check-rehook';
import { checkStructure } from './check-structure';
import { checkTerminal } from './check-terminal';
import { formatQaReport, runQa } from './index';
import type { QaContext } from './types';

const repoRoot = resolve(import.meta.dirname, '../..');
const sample = (): Video =>
  VideoSchema.parse(JSON.parse(readFileSync(join(repoRoot, 'content/videos/sample.json'), 'utf8')));

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const tmpRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ej-qa-'));
  dirs.push(dir);
  return dir;
};

type SceneInput = { id: string; type?: string; voice?: string; sec?: number; props?: unknown };
const hookProps = { badge: 'b', headline: 'h', subline: 's' };
const summaryProps = { points: ['a'] };

/** Build a video from loose scene specs; unspecified scenes default to a short hook-less filler. */
const video = (scenes: SceneInput[], meta: Record<string, unknown> = {}, sources = true): Video =>
  VideoSchema.parse({
    meta: {
      id: 'v',
      title: 't',
      topic: 'topic',
      level: 'junior',
      question: 'q',
      status: 'draft',
      aiVoiceLabel: true,
      ...meta,
    },
    sources: sources ? [{ title: 'src' }] : [],
    scenes: scenes.map((scene) => ({
      id: scene.id,
      type: scene.type ?? 'hook',
      voice: scene.voice ?? 'xin chao',
      draft: { durationSec: scene.sec ?? 10 },
      props: scene.props ?? (scene.type === 'summary' ? summaryProps : hookProps),
    })),
  });

const ctxOf = (v: Video, manifest?: AudioManifest, root = repoRoot): QaContext => ({
  root,
  video: v,
  manifest,
});
const codes = (issues: { code: string }[]): string[] => issues.map((issue) => issue.code);

describe('duration', () => {
  it('warns in draft and errors in review when too short', () => {
    const v = video([{ id: 'a', sec: 30 }]);
    expect(checkDuration(ctxOf(v))).toMatchObject([
      { severity: 'warn', code: 'duration.out-of-range' },
    ]);
    const r = video([{ id: 'a', sec: 30 }], { status: 'review' });
    expect(checkDuration(ctxOf(r))[0]?.severity).toBe('error');
  });

  it('accepts 120-240s and flags >240s', () => {
    const ok = video([
      { id: 'a', sec: 100 },
      { id: 'b', sec: 40 },
    ]);
    expect(checkDuration(ctxOf(ok))).toEqual([]);
    const long = video([
      { id: 'a', sec: 120 },
      { id: 'b', sec: 120 },
      { id: 'c', sec: 5 },
    ]);
    expect(codes(checkDuration(ctxOf(long)))).toEqual(['duration.out-of-range']);
  });

  it('uses manifest audio plus 0.4s tail', () => {
    const v = video([
      { id: 'a', sec: 10 },
      { id: 'b', sec: 10 },
    ]);
    const manifest: AudioManifest = {
      videoId: 'v',
      provider: 'fake',
      scenes: [
        { sceneId: 'a', file: 'x.wav', format: 'wav', durationSec: 59.8, textHash: 'h' },
        { sceneId: 'b', file: 'y.wav', format: 'wav', durationSec: 59.8, textHash: 'h' },
      ],
    };
    expect(checkDuration(ctxOf(v, manifest))).toEqual([]);
  });
});

describe('policy', () => {
  it('requires the AI voice label', () => {
    // The schema defaults the label to true, so bypass it to model a hand-edited video.
    const v = video([{ id: 'a' }]);
    v.meta.aiVoiceLabel = false;
    expect(checkPolicy(ctxOf(v))).toMatchObject([
      { severity: 'error', code: 'policy.ai-voice-label' },
    ]);
  });

  it('empty sources: warn in draft, error otherwise', () => {
    expect(checkPolicy(ctxOf(video([{ id: 'a' }], {}, false)))[0]).toMatchObject({
      severity: 'warn',
      code: 'policy.no-sources',
    });
    expect(
      checkPolicy(ctxOf(video([{ id: 'a' }], { status: 'approved' }, false)))[0]?.severity,
    ).toBe('error');
  });
});

describe('structure', () => {
  it('requires a hook first, summary last, short voice', () => {
    const v = video([
      { id: 'a', type: 'summary' },
      { id: 'b', voice: 'x'.repeat(401) },
    ]);
    const issues = checkStructure(ctxOf(v));
    expect(codes(issues)).toEqual([
      'structure.first-not-hook',
      'structure.last-not-summary',
      'structure.voice-too-long',
    ]);
    expect(issues[0]?.severity).toBe('error');
  });

  it('passes hook ... summary', () => {
    expect(checkStructure(ctxOf(video([{ id: 'a' }, { id: 'b', type: 'summary' }])))).toEqual([]);
  });
});

describe('rehook', () => {
  it('skips short videos', () => {
    expect(checkRehook(ctxOf(video([{ id: 'a', sec: 80 }])))).toEqual([]);
  });

  it('warns when no boundary is near 45s / 100s', () => {
    const v = video([
      { id: 'a', sec: 70 },
      { id: 'b', sec: 70 },
    ]);
    // boundary at 70s: >15s from 45, within 30 of 100 -> both missing (total 140 > 130)
    expect(codes(checkRehook(ctxOf(v)))).toEqual(['rehook.missing', 'rehook.missing']);
  });

  it('accepts boundaries at ~45s and ~100s', () => {
    const v = video([
      { id: 'a', sec: 45 },
      { id: 'b', sec: 55 },
      { id: 'c', sec: 40 },
    ]);
    expect(checkRehook(ctxOf(v))).toEqual([]);
  });

  it('only requires 45s when 90-130s long', () => {
    const v = video([
      { id: 'a', sec: 100 },
      { id: 'b', sec: 20 },
    ]);
    expect(codes(checkRehook(ctxOf(v)))).toEqual(['rehook.missing']);
  });
});

describe('narration', () => {
  it('warns when voice outruns the draft duration without a manifest', () => {
    const voice = Array.from({ length: 60 }, () => 'tu').join(' ');
    const v = video([
      { id: 'a', voice, sec: 5 },
      { id: 'b', voice: 'ngan', sec: 5 },
    ]);
    expect(checkNarration(ctxOf(v))).toMatchObject([
      { severity: 'warn', code: 'narration.exceeds-draft', sceneId: 'a' },
    ]);
  });

  it('checks manifest entries, files and stale ids', () => {
    const root = tmpRoot();
    mkdirSync(join(root, 'public/generated/audio/v'), { recursive: true });
    writeFileSync(join(root, 'public/generated/audio/v/a.wav'), 'x');
    const v = video([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const manifest: AudioManifest = {
      videoId: 'v',
      provider: 'fake',
      scenes: [
        {
          sceneId: 'a',
          file: 'generated/audio/v/a.wav',
          format: 'wav',
          durationSec: 3,
          textHash: 'h',
        },
        {
          sceneId: 'c',
          file: 'generated/audio/v/c.wav',
          format: 'wav',
          durationSec: 3,
          textHash: 'h',
        },
        {
          sceneId: 'gone',
          file: 'generated/audio/v/g.wav',
          format: 'wav',
          durationSec: 3,
          textHash: 'h',
        },
      ],
    };
    const issues = checkNarration(ctxOf(v, manifest, root));
    expect(issues.map((issue) => `${issue.severity}:${issue.code}:${issue.sceneId}`)).toEqual([
      'error:narration.no-manifest-entry:b',
      'error:narration.audio-missing:c',
      'warn:narration.stale-manifest-scene:gone',
    ]);
  });
});

describe('code scenes', () => {
  const codeScene = (before: string, testPath: string): SceneInput => ({
    id: 'code',
    type: 'code',
    props: { language: 'ts', before, after: before, testPath },
  });

  it('errors on a missing test file', () => {
    const issues = checkCode(ctxOf(video([codeScene('const a = 1;', 'nope/missing.test.ts')])));
    expect(codes(issues)).toEqual(['code.test-missing']);
  });

  it('accepts an existing test and warns on very long lines', () => {
    const existing = 'pipeline/qa/qa.test.ts';
    expect(checkCode(ctxOf(video([codeScene('const a = 1;', existing)])))).toEqual([]);
    const long = checkCode(ctxOf(video([codeScene('x'.repeat(60), existing)])));
    expect(codes(long)).toEqual(['code.line-too-long']);
  });
});

describe('layout', () => {
  const tradeoff = (pros: string[]): SceneInput => ({
    id: 't',
    type: 'tradeoff',
    props: {
      title: 'Title',
      options: [
        { name: 'A', pros, cons: ['c'] },
        { name: 'B', pros, cons: ['c'] },
      ],
    },
  });

  it('errors with a shorten message when tradeoff overflows', () => {
    const many = Array.from({ length: 30 }, () => 'a fairly long pro line of text here');
    const issues = checkLayout(ctxOf(video([tradeoff(many)])));
    expect(issues[0]).toMatchObject({ severity: 'error', code: 'layout.tradeoff-overflow' });
    expect(issues[0]?.message).toContain('shorten');
  });

  it('passes a small tradeoff', () => {
    expect(checkLayout(ctxOf(video([tradeoff(['fast'])])))).toEqual([]);
  });

  it('errors when summary overflows', () => {
    const points = Array.from({ length: 40 }, () => 'a long summary point with many words in it');
    const v = video([{ id: 's', type: 'summary', props: { points } }]);
    const issues = checkLayout(ctxOf(v));
    expect(issues[0]).toMatchObject({ severity: 'error', code: 'layout.summary-overflow' });
    expect(issues[0]?.message).toContain('shorten');
  });
});

describe('diagram layout', () => {
  const diagram = (count: number, label = 'Step'): SceneInput => {
    const ids = Array.from({ length: count }, (_, i) => `n${i}`);
    return {
      id: 'd',
      type: 'diagram',
      props: {
        title: 'T',
        nodes: ids.map((id) => ({ id, label })),
        edges: ids.slice(1).map((to, i) => ({ from: ids[i], to })),
      },
    };
  };

  it('passes a diagram that fits', () => {
    expect(checkLayout(ctxOf(video([diagram(4)])))).toEqual([]);
  });

  it('errors with a shorten/split message when the diagram does not fit', () => {
    const issues = checkLayout(ctxOf(video([diagram(8)])));
    expect(issues[0]).toMatchObject({ severity: 'error', code: 'layout.diagram-overflow' });
    expect(issues[0]?.message).toContain('shorten');
    expect(issues[0]?.message).toContain('split');
  });
});

describe('terminal', () => {
  const terminal = (count: number): SceneInput => ({
    id: 'term',
    type: 'terminal',
    props: {
      lines: Array.from({ length: count }, (_, i) => ({ command: `cmd ${i}`, output: 'out' })),
    },
  });

  it('warns only when the transcript needs auto-scroll', () => {
    expect(checkTerminal(ctxOf(video([terminal(3)])))).toEqual([]);
    expect(codes(checkTerminal(ctxOf(video([terminal(40)]))))).toEqual(['terminal.auto-scroll']);
  });
});

describe('runQa on content/videos/sample.json', () => {
  it('reports no errors (draft status only warns)', () => {
    const { issues } = runQa({ root: repoRoot, video: sample() });
    expect(issues.filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('flags a broken copy and sorts errors first', () => {
    const v = sample();
    v.scenes = v.scenes.slice(1);
    v.meta.aiVoiceLabel = false;
    const { issues } = runQa({ root: repoRoot, video: v });
    expect(issues[0]?.severity).toBe('error');
    expect(codes(issues)).toContain('structure.first-not-hook');
  });
});

describe('formatQaReport', () => {
  it('formats issues and a summary line', () => {
    const text = formatQaReport([
      { severity: 'error', code: 'a.b', sceneId: 's1', message: 'bad' },
      { severity: 'warn', code: 'c.d', message: 'meh' },
    ]);
    expect(text).toBe('ERROR [a.b] (s1) bad\nWARN  [c.d] meh\nQA: 1 error(s), 1 warning(s)');
    expect(formatQaReport([])).toBe('QA passed: no issues');
  });
});
