import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { estimateDurationSec } from '../tts/providers/fake';
import type { QaCheck, QaIssue } from './types';

export const TTS_SPEED = 0.9;
export const OVERRUN_RATIO = 1.2;

export const checkNarration: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  const { manifest, video } = ctx;

  if (!manifest) {
    for (const scene of video.scenes) {
      const spoken = estimateDurationSec(scene.voice, TTS_SPEED);
      if (spoken > scene.draft.durationSec * OVERRUN_RATIO) {
        issues.push({
          severity: 'warn',
          code: 'narration.exceeds-draft',
          sceneId: scene.id,
          message: `narration ~${spoken.toFixed(1)}s exceeds draft ${scene.draft.durationSec}s by more than 20%`,
        });
      }
    }
    return issues;
  }

  const entries = new Map(manifest.scenes.map((entry) => [entry.sceneId, entry]));
  for (const scene of video.scenes) {
    const entry = entries.get(scene.id);
    if (!entry) {
      issues.push({
        severity: 'error',
        code: 'narration.no-manifest-entry',
        sceneId: scene.id,
        message: 'scene has no audio manifest entry; run `pnpm tts`',
      });
    } else if (!existsSync(join(ctx.root, 'public', entry.file))) {
      issues.push({
        severity: 'error',
        code: 'narration.audio-missing',
        sceneId: scene.id,
        message: `audio file public/${entry.file} is missing; run \`pnpm tts\``,
      });
    }
  }
  const known = new Set(video.scenes.map((scene) => scene.id));
  for (const entry of manifest.scenes) {
    if (!known.has(entry.sceneId)) {
      issues.push({
        severity: 'warn',
        code: 'narration.stale-manifest-scene',
        sceneId: entry.sceneId,
        message: 'manifest has a scene id that is no longer in the video; re-run `pnpm tts`',
      });
    }
  }
  return issues;
};
