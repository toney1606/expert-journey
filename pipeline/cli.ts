import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AudioManifestSchema } from '../src/schemas/audio-manifest';
import { LEVELS, LevelSchema } from '../src/schemas/common';
import { VideoSchema } from '../src/schemas/video';
import { findVideoFile } from './content/paths';
import { buildSoundtrack } from './audio/build-soundtrack';
import { buildPlan, formatPlan, scaffoldPlan } from './plan';
import { makeContactSheet } from './sheet/index';
import { formatQaReport, runQa } from './qa/index';
import { normalizeLoudness } from './render/normalize';
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
  const valueFlags = new Set([
    '--provider',
    '--voice',
    '--speed',
    '--level',
    '--from',
    '--to',
    '--frames',
  ]);
  return rest.find((arg, i) => !arg.startsWith('--') && !valueFlags.has(rest[i - 1] ?? ''));
};

const qa = (): number => {
  const videoId = positional();
  if (!videoId) {
    console.error('Usage: pnpm qa <videoId>');
    return 1;
  }
  const videoPath = findVideoFile(root, videoId);
  if (!videoPath) {
    console.error(`Video not found: ${videoId}`);
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

const planCommand = (): number => {
  const levelFlag = flag('level');
  const parsed = levelFlag === undefined ? undefined : LevelSchema.safeParse(levelFlag);
  if (parsed && !parsed.success) {
    console.error(`Unknown level "${levelFlag}". Levels: ${LEVELS.join(', ')}`);
    return 1;
  }
  const level = parsed?.data;
  if (rest.includes('--scaffold')) {
    const created = scaffoldPlan({ root, level });
    console.log(
      `✓ scaffold: ${created.length} research.md created (existing folders are never touched)`,
    );
  }
  console.log(formatPlan(buildPlan({ root }), { level, from: flag('from'), to: flag('to') }));
  return 0;
};

const sheet = async (): Promise<number> => {
  const videoId = positional();
  if (!videoId) {
    console.error('Usage: pnpm sheet <videoId> [--columns 5] [--rows 4] [--scale 0.25]');
    return 1;
  }
  const number = (name: string): number | undefined => {
    const raw = flag(name);
    return raw === undefined ? undefined : Number(raw);
  };
  const { outFile, times, durationMs } = await makeContactSheet({
    root,
    videoId,
    columns: number('columns'),
    rows: number('rows'),
    scale: number('scale'),
  });
  console.log(`✓ ${outFile} (${(durationMs / 1000).toFixed(0)}s); tiles at: ${times.join(', ')}`);
  return 0;
};

const sfx = async (): Promise<number> => {
  const videoId = positional();
  if (!videoId) {
    console.error('Usage: pnpm sfx <videoId>   (needs `pnpm tts <videoId>` first)');
    return 1;
  }
  const { meta } = await buildSoundtrack({ root, videoId });
  console.log(`✓ soundtrack for ${videoId}: voice gain ${meta.voiceGain.toFixed(2)}`);
  return 0;
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
  if (result.usedAudio && !rest.includes('--no-normalize') && !flag('frames')) {
    const before = normalizeLoudness(result.outFile, root);
    console.log(`✓ loudness ${before.inputI.toFixed(1)} -> -14 LUFS (true peak <= -1.5 dBTP)`);
  }
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
    ['sfx', sfx],
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
    case 'plan':
      return planCommand();
    case 'sheet':
      return sheet();
    case 'sfx':
      return sfx();
    case 'qa':
      return qa();
    case 'render':
      return render();
    case 'produce':
      return produce();
    default:
      console.error(
        'Usage: pnpm validate | plan | tts | sfx | qa | sheet | render | produce <videoId>',
      );
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
