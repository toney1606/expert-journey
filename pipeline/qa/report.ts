import type { QaIssue } from './types';

/** Plain-text report, one line per issue plus a summary line. */
export const formatQaReport = (issues: readonly QaIssue[]): string => {
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.length - errors;
  const lines = issues.map(
    (issue) =>
      `${issue.severity === 'error' ? 'ERROR' : 'WARN '} [${issue.code}]${issue.sceneId ? ` (${issue.sceneId})` : ''} ${issue.message}`,
  );
  lines.push(
    issues.length === 0 ? 'QA passed: no issues' : `QA: ${errors} error(s), ${warnings} warning(s)`,
  );
  return lines.join('\n');
};
