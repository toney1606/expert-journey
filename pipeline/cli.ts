import { resolve } from 'node:path';
import { validateContent } from './validate/validate-content';

const [command] = process.argv.slice(2);

const run = (): number => {
  switch (command) {
    case 'validate': {
      const { checked, issues } = validateContent(resolve(import.meta.dirname, '..'));
      for (const issue of issues) {
        console.error(`✗ ${issue.file}: ${issue.message}`);
      }
      if (issues.length > 0) {
        console.error(
          `\nValidation failed: ${issues.length} issue(s) in ${checked.length} file(s).`,
        );
        return 1;
      }
      console.log(`✓ ${checked.length} content file(s) valid.`);
      return 0;
    }
    default:
      console.error('Usage: pnpm validate');
      return command === undefined ? 0 : 1;
  }
};

process.exitCode = run();
