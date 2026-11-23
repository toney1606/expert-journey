export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const FPS = 30;

/** Midpoints of `count` equal slices of the video, in seconds (so no tile is a black first frame). */
export const sampleTimes = (totalSec: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => Number((((i + 0.5) / count) * totalSec).toFixed(2)));

/** 83.4 -> "1:23". */
export const formatTime = (sec: number): string => {
  const whole = Math.floor(sec);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** Pixel size of one tile at a Remotion `--scale`. */
export const tileSize = (scale: number): { width: number; height: number } => ({
  width: Math.max(1, Math.round(VIDEO_WIDTH * scale)),
  height: Math.max(1, Math.round(VIDEO_HEIGHT * scale)),
});

/** Args after `pnpm` for the low-resolution, silent preview render. */
export const buildPreviewRenderArgs = (opts: {
  propsFile: string;
  outFile: string;
  scale: number;
}): string[] => [
  'exec',
  'remotion',
  'render',
  'src/index.ts',
  'Video',
  opts.outFile,
  `--props=${opts.propsFile}`,
  `--scale=${opts.scale}`,
  '--muted',
  '--crf=40',
];

/** Args after `pnpm` that grab ONE frame at `timeSec` as an RGB PNG of exactly width x height. */
export const buildFrameArgs = (opts: {
  videoFile: string;
  timeSec: number;
  width: number;
  height: number;
  outFile: string;
}): string[] => [
  'exec',
  'remotion',
  'ffmpeg',
  '-y',
  '-ss',
  String(opts.timeSec),
  '-i',
  opts.videoFile,
  '-frames:v',
  '1',
  '-vf',
  `scale=${opts.width}:${opts.height}`,
  '-pix_fmt',
  'rgb24',
  '-update',
  '1',
  opts.outFile,
];
