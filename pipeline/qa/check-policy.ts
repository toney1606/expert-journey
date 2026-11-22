import { draftSeverity, type QaCheck, type QaIssue } from './types';

export const checkPolicy: QaCheck = (ctx) => {
  const issues: QaIssue[] = [];
  if (ctx.video.meta.aiVoiceLabel !== true) {
    issues.push({
      severity: 'error',
      code: 'policy.ai-voice-label',
      message: 'meta.aiVoiceLabel must be true (AI voice must be labelled)',
    });
  }
  if (ctx.video.sources.length === 0) {
    issues.push({
      severity: draftSeverity(ctx),
      code: 'policy.no-sources',
      message: 'video has no sources; cite books/docs (empty only for original material)',
    });
  }
  return issues;
};
