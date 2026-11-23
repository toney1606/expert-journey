import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AudioManifestSchema } from '../../src/schemas/audio-manifest';
import type { AudioManifest } from '../../src/schemas/audio-manifest';
import { VideoSchema } from '../../src/schemas/video';
import { findVideoFile } from '../content/paths';
import type { TtsProvider } from './types';

export type SynthesizeOptions = {
  root: string;
  videoId: string;
  provider: TtsProvider;
  voice?: string;
  speed?: number;
  lang?: string;
};

export type SynthesizeSummary = {
  manifest: AudioManifest;
  synthesized: string[];
  cached: string[];
};

export const hashRequest = (
  providerId: string,
  text: string,
  voice?: string,
  speed?: number,
): string =>
  createHash('sha256')
    .update(JSON.stringify({ providerId, text, voice: voice ?? null, speed: speed ?? null }))
    .digest('hex')
    .slice(0, 16);

/** A cached clip only counts when the file exists and is not empty (a full disk can leave 0 bytes). */
const hasAudio = (path: string): boolean => existsSync(path) && statSync(path).size > 0;

const readManifest = (path: string): AudioManifest | undefined => {
  if (!existsSync(path)) return undefined;
  try {
    return AudioManifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    return undefined; // corrupt manifest: regenerate everything
  }
};

/** Generate audio for every scene's `voice`, skipping scenes whose request hash is unchanged. */
export const synthesizeVideo = async ({
  root,
  videoId,
  provider,
  voice,
  speed,
  lang = 'vi',
}: SynthesizeOptions): Promise<SynthesizeSummary> => {
  const videoPath = findVideoFile(root, videoId);
  if (!videoPath) throw new Error(`Video not found: ${videoId}`);
  const video = VideoSchema.parse(JSON.parse(readFileSync(videoPath, 'utf8')));

  const relativeDir = `generated/audio/${videoId}`;
  const outDir = join(root, 'public', relativeDir);
  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(outDir, 'manifest.json');
  const previous = readManifest(manifestPath);

  const synthesized: string[] = [];
  const cached: string[] = [];
  const scenes: AudioManifest['scenes'] = [];

  for (const scene of video.scenes) {
    const textHash = hashRequest(provider.id, scene.voice, voice, speed);
    const old = previous?.scenes.find((entry) => entry.sceneId === scene.id);
    if (old?.textHash === textHash && hasAudio(join(root, 'public', old.file))) {
      scenes.push(old);
      cached.push(scene.id);
      continue;
    }
    const result = await provider.synthesize({ text: scene.voice, lang, voice, speed });
    const file = `${relativeDir}/${scene.id}.${result.format}`;
    writeFileSync(join(root, 'public', file), result.audio);
    scenes.push({
      sceneId: scene.id,
      file,
      format: result.format,
      durationSec: result.durationSec,
      textHash,
      ...(result.cues ? { cues: result.cues } : {}),
      ...(result.words ? { words: result.words } : {}),
    });
    synthesized.push(scene.id);
  }

  const manifest = AudioManifestSchema.parse({ videoId, provider: provider.id, scenes });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, synthesized, cached };
};
