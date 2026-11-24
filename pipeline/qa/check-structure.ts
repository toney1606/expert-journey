import type { QaCheck, QaIssue } from './types';

export const MAX_VOICE_CHARS = 400;

export const checkStructure: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  const { scenes } = ctx.video;
  const first = scenes[0];
  const last = scenes[scenes.length - 1];
  if (first && first.type !== 'hook' && first.type !== 'counterhook') {
    issues.push({
      severity: 'error',
      code: 'structure.first-not-hook',
      sceneId: first.id,
      message: `first scene must be a hook (is "${first.type}")`,
    });
  }
  if (last && last.type !== 'summary' && last.type !== 'endcard' && last.type !== 'pageslider') {
    issues.push({
      severity: 'warn',
      code: 'structure.last-not-summary',
      sceneId: last.id,
      message: `last scene should be a summary or endcard (is "${last.type}")`,
    });
  }
  for (const scene of scenes) {
    if (scene.voice.length > MAX_VOICE_CHARS) {
      issues.push({
        severity: 'warn',
        code: 'structure.voice-too-long',
        sceneId: scene.id,
        message: `voice is ${scene.voice.length} chars (> ${MAX_VOICE_CHARS}); split the scene or trim`,
      });
    }
  }
  return issues;
};
