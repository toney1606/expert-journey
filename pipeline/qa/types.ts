import type { AudioManifest } from '../../src/schemas/audio-manifest';
import type { Video } from '../../src/schemas/video';

export type QaSeverity = 'error' | 'warn';

export type QaIssue = {
  severity: QaSeverity;
  /** Stable machine-readable code, e.g. `duration.out-of-range`. */
  code: string;
  sceneId?: string;
  message: string;
};

export type QaContext = {
  /** Repo root; `testPath` and `public/<audio file>` resolve against it. */
  root: string;
  video: Video;
  manifest?: AudioManifest | undefined;
};

/** A check is a small pure function (apart from file-existence reads). */
export type QaCheck = (ctx: QaContext) => QaIssue[];

/** Severity for rules that are lenient while the video is still a draft. */
export const draftSeverity = (ctx: QaContext): QaSeverity =>
  ctx.video.meta.status === 'draft' ? 'warn' : 'error';
