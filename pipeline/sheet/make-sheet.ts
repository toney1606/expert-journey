import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { totalDurationInFrames } from '../../src/lib/duration';
import { AudioManifestSchema } from '../../src/schemas/audio-manifest';
import { VideoSchema } from '../../src/schemas/video';
import { findVideoFile } from '../content/paths';
import { spawnRunner, type Runner } from '../render/render-video';
import {
  FPS,
  buildFrameArgs,
  buildPreviewRenderArgs,
  formatTime,
  sampleTimes,
  tileSize,
} from './frames';
import { blit, decodePng, drawLabel, encodePng, newCanvas } from './png';

export type SheetOptions = {
  root: string;
  videoId: string;
  /** Tiles per row (default 5). */
  columns?: number;
  /** Rows (default 4). Tiles = columns x rows, evenly spread over the video. */
  rows?: number;
  /** Remotion render scale (default 0.25 -> 270x480 tiles). */
  scale?: number;
  outDir?: string;
  runner?: Runner;
};

export type SheetResult = {
  outFile: string;
  /** Timestamp (seconds) of each tile, row-major. */
  times: number[];
  durationMs: number;
};

const GAP = 6;

const run = async (runner: Runner, args: string[], cwd: string, what: string): Promise<void> => {
  const result = await runner({ command: 'pnpm', args, cwd });
  if (result.exitCode !== 0) {
    throw new Error(
      `${what} failed (exit ${String(result.exitCode)}):\n${result.stderrTail.trim()}`,
    );
  }
};

/** Low-resolution preview render, one frame per tile via Remotion's ffmpeg, tiled into out/<id>.sheet.png. */
export const makeContactSheet = async ({
  root,
  videoId,
  columns = 5,
  rows = 4,
  scale = 0.25,
  outDir = join(root, 'out'),
  runner = spawnRunner,
}: SheetOptions): Promise<SheetResult> => {
  const videoPath = findVideoFile(root, videoId);
  if (!videoPath) throw new Error(`Video not found: ${videoId}`);
  const parsed = VideoSchema.safeParse(JSON.parse(readFileSync(videoPath, 'utf8')));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid video ${videoId}:\n${issues}`);
  }
  const manifestPath = join(root, 'public', 'generated', 'audio', videoId, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? AudioManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')))
    : undefined;
  const totalSec = totalDurationInFrames(parsed.data.scenes, FPS, manifest?.scenes) / FPS;
  const times = sampleTimes(totalSec, columns * rows);
  const { width, height } = tileSize(scale);

  const started = Date.now();
  const tempDir = mkdtempSync(join(tmpdir(), 'expert-journey-sheet-'));
  try {
    const propsFile = join(tempDir, 'props.json');
    const previewFile = join(tempDir, 'preview.mp4');
    writeFileSync(propsFile, JSON.stringify({ video: parsed.data, debugSafeZone: false }));
    await run(
      runner,
      buildPreviewRenderArgs({ propsFile, outFile: previewFile, scale }),
      root,
      'preview render',
    );

    const sheetW = columns * (width + GAP) + GAP;
    const sheetH = rows * (height + GAP) + GAP;
    const canvas = newCanvas(sheetW, sheetH, [24, 24, 37]);
    for (const [index, timeSec] of times.entries()) {
      const rawFile = join(tempDir, `tile-${index}.png`);
      await run(
        runner,
        buildFrameArgs({ videoFile: previewFile, timeSec, width, height, outFile: rawFile }),
        root,
        `frame extraction at ${timeSec}s`,
      );
      const frame = decodePng(readFileSync(rawFile));
      if (frame.width !== width || frame.height !== height) {
        throw new Error(
          `frame at ${timeSec}s is ${frame.width}x${frame.height}, expected ${width}x${height}`,
        );
      }
      const tile = frame.rgb;
      const x = GAP + (index % columns) * (width + GAP);
      const y = GAP + Math.floor(index / columns) * (height + GAP);
      blit(canvas, tile, width, height, x, y);
      drawLabel(canvas, formatTime(timeSec), x + 4, y + 4, Math.max(2, Math.round(scale * 12)));
    }
    mkdirSync(outDir, { recursive: true });
    const outFile = join(outDir, `${videoId}.sheet.png`);
    writeFileSync(outFile, encodePng(canvas.data, sheetW, sheetH));
    return { outFile, times, durationMs: Date.now() - started };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
};
