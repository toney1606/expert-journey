import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createProvider } from './tts/registry';
import { synthesizeVideo } from './tts/synthesize-video';
import { validateContent } from './validate/validate-content';

const root = resolve(import.meta.dirname, '..');
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));

const [command, ...rest] = process.argv.slice(2);

const flag = (name: string): string | undefined => {
  const index = rest.indexOf(`--${name}`);
  return index === -1 ? undefined : rest[index + 1];
};

const validate = (): number => {
  const { checked, issues } = validateContent(root);
  for (const issue of issues) {
    console.error(`✗ ${issue.file}: ${issue.message}`);
  }
  if (issues.length > 0) {
    console.error(`\nValidation failed: ${issues.length} issue(s) in ${checked.length} file(s).`);
    return 1;
  }
  console.log(`✓ ${checked.length} content file(s) valid.`);
  return 0;
};

const tts = async (): Promise<number> => {
  const videoId = rest.find((arg) => !arg.startsWith('--') && arg !== flag('provider'));
  if (!videoId) {
    console.error('Usage: pnpm tts <videoId> [--provider <name>] [--voice <name>] [--speed <n>]');
    return 1;
  }
  const speedFlag = flag('speed');
  const provider = createProvider(flag('provider'));
  const { manifest, synthesized, cached } = await synthesizeVideo({
    root,
    videoId,
    provider,
    voice: flag('voice'),
    speed: speedFlag === undefined ? undefined : Number(speedFlag),
  });
  const total = manifest.scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
  console.log(
    `✓ ${provider.id}: ${synthesized.length} synthesized, ${cached.length} cached, ${total.toFixed(1)}s total`,
  );
  return 0;
};

const main = async (): Promise<number> => {
  switch (command) {
    case 'validate':
      return validate();
    case 'tts':
      return tts();
    default:
      console.error('Usage: pnpm validate | pnpm tts <videoId>');
      return command === undefined ? 0 : 1;
  }
};

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
