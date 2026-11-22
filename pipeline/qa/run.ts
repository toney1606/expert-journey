import { QA_CHECKS } from './checks';
import type { QaContext, QaIssue } from './types';

export type QaResult = { issues: QaIssue[] };

/** Run every registered check; errors sort before warnings, otherwise registry order is kept. */
export const runQa = (ctx: QaContext): QaResult => {
  const issues = QA_CHECKS.flatMap((check) => check(ctx));
  const rank = (issue: QaIssue): number => (issue.severity === 'error' ? 0 : 1);
  return {
    issues: issues
      .map((issue, index) => ({ issue, index }))
      .sort((a, b) => rank(a.issue) - rank(b.issue) || a.index - b.index)
      .map(({ issue }) => issue),
  };
};
