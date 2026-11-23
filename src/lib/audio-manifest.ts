import { AudioManifestSchema, BedInfoSchema } from '../schemas/audio-manifest';
import type { AudioManifest, BedInfo } from '../schemas/audio-manifest';

type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/**
 * Load the manifest produced by `pnpm tts`. Returns undefined when it does not exist
 * (the video then falls back to draft durations); throws when it exists but is invalid.
 */
export const fetchAudioManifest = async (
  url: string,
  videoId: string,
  fetchImpl: FetchLike = fetch,
): Promise<AudioManifest | undefined> => {
  let response;
  try {
    response = await fetchImpl(url);
  } catch {
    return undefined;
  }
  if (!response.ok) return undefined;
  const manifest = AudioManifestSchema.parse(await response.json());
  if (manifest.videoId !== videoId) {
    throw new Error(`Audio manifest is for "${manifest.videoId}", expected "${videoId}"`);
  }
  return manifest;
};

/** Load bed.json (music + sfx track made by `pnpm sfx`); undefined when absent or unreadable. */
export const fetchBedInfo = async (
  url: string,
  fetchImpl: FetchLike = fetch,
): Promise<BedInfo | undefined> => {
  try {
    const response = await fetchImpl(url);
    if (!response.ok) return undefined;
    const parsed = BedInfoSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};
