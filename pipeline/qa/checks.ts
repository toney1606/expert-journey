import { checkCode } from './check-code';
import { checkDuration } from './check-duration';
import { checkLayout } from './check-layout';
import { checkNarration } from './check-narration';
import { checkPolicy } from './check-policy';
import { checkRehook } from './check-rehook';
import { checkStructure } from './check-structure';
import { checkTerminal } from './check-terminal';
import type { QaCheck } from './types';

/** Add new checks here; each is run by `runQa` in order. */
export const QA_CHECKS: readonly QaCheck[] = [
  checkDuration,
  checkPolicy,
  checkStructure,
  checkRehook,
  checkNarration,
  checkCode,
  checkLayout,
  checkTerminal,
];
