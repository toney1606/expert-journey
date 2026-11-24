import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { SynthesisCue, SynthesisRequest, SynthesisResult, TtsProvider } from '../types';
import { alignWords } from './edge-align';
import { regroupTimings, respell } from '../lexicon';
import { mp3DurationSec } from './mp3';

export const DEFAULT_EDGE_VOICE = 'vi-VN-HoaiMyNeural';
/** Owner's style guide: slightly slower than the service default. */
export const DEFAULT_EDGE_RATE = '-10%';

/** speed undefined => "-10%"; otherwise round((speed-1)*100) with explicit sign (1 => "+0%"). */
export const edgeRate = (speed?: number): string => {
  if (speed === undefined) return DEFAULT_EDGE_RATE;
  const percent = Math.round((speed - 1) * 100);
  return `${percent < 0 ? '-' : '+'}${Math.abs(percent)}%`;
};

export type EdgeJob = {
  text: string;
  voice: string;
  rate: string;
  timeoutSec: number;
};

/** `words` are the raw WordBoundary events (no punctuation); the provider aligns them. */
export type EdgeRunOutput = { audio: Uint8Array; words: SynthesisCue[] };
/** One synthesis attempt. Rejects on any failure; retries are the provider's job. */
export type EdgeRunner = (job: EdgeJob) => Promise<EdgeRunOutput>;

export type EdgeProviderOptions = {
  runner?: EdgeRunner;
  maxAttempts?: number;
  timeoutSec?: number;
  /** Backoff sleep, injectable so tests do not wait. */
  sleep?: (ms: number) => Promise<void>;
};

const repoRoot = resolve(import.meta.dirname, '../../..');
const scriptPath = join(import.meta.dirname, 'edge_tts_cli.py');

/** Real runner: spawns the repo-local venv Python with edge_tts_cli.py. */
export const subprocessRunner: EdgeRunner = async (job) => {
  const python = process.env.EDGE_TTS_PYTHON ?? join(repoRoot, '.venv/bin/python');
  if (!existsSync(python)) {
    throw new Error(
      `Python not found at ${python}. Run: python3 -m venv .venv && .venv/bin/pip install -r pipeline/tts/providers/requirements.txt (or set EDGE_TTS_PYTHON)`,
    );
  }
  const dir = mkdtempSync(join(tmpdir(), 'ej-edge-'));
  try {
    const audioPath = join(dir, 'out.mp3');
    const resultPath = join(dir, 'result.json');
    const jobPath = join(dir, 'job.json');
    writeFileSync(jobPath, JSON.stringify({ ...job, audioPath, resultPath }));
    await new Promise<void>((done, fail) => {
      const child = spawn(python, [scriptPath, jobPath], { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      // Hard kill in case Python itself hangs past its own timeout.
      const timer = setTimeout(() => child.kill('SIGKILL'), (job.timeoutSec + 15) * 1000);
      child.on('error', (error) => {
        clearTimeout(timer);
        fail(error);
      });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        if (code === 0) done();
        else fail(new Error(stderr.trim() || `edge-tts exited with ${code ?? signal}`));
      });
    });
    const result = JSON.parse(readFileSync(resultPath, 'utf8')) as { words: SynthesisCue[] };
    return { audio: new Uint8Array(readFileSync(audioPath)), words: result.words };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

/** Free Microsoft Edge read-aloud voices via the `edge-tts` Python package. No API key. */
export class EdgeTtsProvider implements TtsProvider {
  readonly id = 'edge';
  private readonly runner: EdgeRunner;
  private readonly maxAttempts: number;
  private readonly timeoutSec: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: EdgeProviderOptions = {}) {
    this.runner = options.runner ?? subprocessRunner;
    this.maxAttempts = options.maxAttempts ?? 6;
    this.timeoutSec = options.timeoutSec ?? 60;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async synthesize({ text, voice, speed }: SynthesisRequest): Promise<SynthesisResult> {
    const { spoken, groups } = respell(text);
    const job: EdgeJob = {
      text: spoken,
      voice: voice ?? process.env.EDGE_TTS_VOICE ?? DEFAULT_EDGE_VOICE,
      rate: edgeRate(speed),
      timeoutSec: this.timeoutSec,
    };
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const { audio, words: raw } = await this.runner(job);
        const regrouped = regroupTimings(groups, raw);
        const { words, cues } = regrouped ?? alignWords(text, raw);
        return { audio, format: 'mp3', durationSec: mp3DurationSec(audio), cues, words };
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) await this.sleep(2000 * attempt);
      }
    }
    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
      `edge-tts failed after ${this.maxAttempts} attempts (voice ${job.voice}, rate ${job.rate}): ${reason}`,
    );
  }
}
