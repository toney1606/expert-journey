import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VideoSchema } from '../../src/schemas/video';
import { findVideoFile } from '../content/paths';

export type RunSpec = { command: string; args: string[]; cwd: string };
export type RunResult = { exitCode: number | null; stderrTail: string };
/** Runs a process, streaming its output to the terminal. Injectable for tests. */
export type Runner = (spec: RunSpec) => Promise<RunResult>;

export type RenderOptions = {
  root: string;
  videoId: string;
  outDir?: string;
  debugSafeZone?: boolean;
  /** Frame range for a partial render, e.g. "0-89" (Remotion `--frames`). */
  frames?: string;
  runner?: Runner;
};

export type RenderResult = {
  outFile: string;
  sizeBytes: number;
  durationMs: number;
  usedAudio: boolean;
};

const STDERR_TAIL_CHARS = 2000;

export const buildRenderArgs = (opts: {
  propsFile: string;
  outFile: string;
  frames?: string;
}): string[] => [
  'exec',
  'remotion',
  'render',
  'src/index.ts',
  'Video',
  opts.outFile,
  `--props=${opts.propsFile}`,
  ...(opts.frames ? [`--frames=${opts.frames}`] : []),
];

export const spawnRunner: Runner = ({ command, args, cwd }) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    child.stdout.on('data', (chunk: Buffer) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
      tail = (tail + chunk.toString()).slice(-STDERR_TAIL_CHARS);
    });
    child.on('error', reject);
    child.on('close', (exitCode) => resolve({ exitCode, stderrTail: tail }));
  });

/** Render a video (found by id, see findVideoFile) to an MP4 by shelling out to the Remotion CLI. */
export const renderVideo = async ({
  root,
  videoId,
  outDir = join(root, 'out'),
  debugSafeZone = false,
  frames,
  runner = spawnRunner,
}: RenderOptions): Promise<RenderResult> => {
  const videoPath = findVideoFile(root, videoId);
  if (!videoPath) throw new Error(`Video not found: ${videoId}`);

  let json: unknown;
  try {
    json = JSON.parse(readFileSync(videoPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON in video ${videoId}: ${(error as Error).message}`);
  }
  const parsed = VideoSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid video ${videoId}:\n${issues}`);
  }

  const usedAudio = existsSync(
    join(root, 'public', 'generated', 'audio', videoId, 'manifest.json'),
  );
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${videoId}.mp4`);

  const tempDir = mkdtempSync(join(tmpdir(), 'expert-journey-render-'));
  try {
    const propsFile = join(tempDir, 'props.json');
    writeFileSync(propsFile, JSON.stringify({ video: parsed.data, debugSafeZone }));
    const started = Date.now();
    const result = await runner({
      command: 'pnpm',
      args: buildRenderArgs({ propsFile, outFile, frames }),
      cwd: root,
    });
    if (result.exitCode !== 0) {
      throw new Error(
        `remotion render failed (exit ${String(result.exitCode)}):\n${result.stderrTail.trim()}`,
      );
    }
    if (!existsSync(outFile)) throw new Error(`Render finished but ${outFile} was not created`);
    return {
      outFile,
      sizeBytes: statSync(outFile).size,
      durationMs: Date.now() - started,
      usedAudio,
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
};
