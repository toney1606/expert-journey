import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AudioManifestSchema } from '../src/schemas/audio-manifest';
import { VideoSchema } from '../src/schemas/video';
import { formatQaReport, runQa } from './qa/index';
import { renderVideo } from './render/render-video';
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
  const videoId = positional();
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

const positional = (): string | undefined => {
  const valueFlags = new Set(['--provider', '--voice', '--speed']);
  return rest.find((arg, i) => !arg.startsWith('--') && !valueFlags.has(rest[i - 1] ?? ''));
};

const qa = (): number => {
  const videoId = positional();
  if (!videoId) {
    console.error('Usage: pnpm qa <videoId>');
    return 1;
  }
  const videoPath = resolve(root, 'content', 'videos', `${videoId}.json`);
  if (!existsSync(videoPath)) {
    console.error(`Video not found: content/videos/${videoId}.json`);
    return 1;
  }
  const video = VideoSchema.parse(JSON.parse(readFileSync(videoPath, 'utf8')));
  const manifestPath = resolve(root, 'public', 'generated', 'audio', videoId, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? AudioManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')))
    : undefined;
  const { issues } = runQa({ root, video, manifest });
  console.log(formatQaReport(issues));
  return issues.some((issue) => issue.severity === 'error') ? 1 : 0;
};

const render = async (): Promise<number> => {
  const videoId = positional();
  if (!videoId) {
    console.error('Usage: pnpm render <videoId> [--frames 0-89] [--debug]');
    return 1;
  }
  const result = await renderVideo({
    root,
    videoId,
    frames: flag('frames'),
    debugSafeZone: rest.includes('--debug'),
  });
  console.log(
    `✓ ${result.outFile} (${(result.sizeBytes / 1e6).toFixed(1)} MB, ${(result.durationMs / 1000).toFixed(0)}s, audio: ${result.usedAudio ? 'yes' : 'no'})`,
  );
  return 0;
};

/** validate → tts → qa → render; stops at the first failing stage. */
const produce = async (): Promise<number> => {
  const videoId = positional();
  if (!videoId) {
    console.error('Usage: pnpm produce <videoId> [--provider <name>]');
    return 1;
  }
  const stages: [string, () => number | Promise<number>][] = [
    ['validate', validate],
    ['tts', tts],
    ['qa', qa],
    ['render', render],
  ];
  for (const [name, stage] of stages) {
    console.log(`\n== ${name} ==`);
    const code = await stage();
    if (code !== 0) {
      console.error(`\nStopped at "${name}".`);
      return code;
    }
  }
  return 0;
};

const main = async (): Promise<number> => {
  switch (command) {
    case 'validate':
      return validate();
    case 'tts':
      return tts();
    case 'qa':
      return qa();
    case 'render':
      return render();
    case 'produce':
      return produce();
    default:
      console.error('Usage: pnpm validate | tts | qa | render | produce <videoId>');
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
