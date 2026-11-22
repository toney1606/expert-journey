// Pure MP3 duration: walk MPEG audio frame headers and sum samples/sampleRate.
// Handles an ID3v2 tag, MPEG-1/2/2.5 Layer III, CBR and VBR (frames are counted, not guessed).

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG-1
  2: [22050, 24000, 16000], // MPEG-2
  0: [11025, 12000, 8000], // MPEG-2.5
};

const id3v2Size = (bytes: Uint8Array): number => {
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0;
  const size =
    ((bytes[6]! & 0x7f) << 21) |
    ((bytes[7]! & 0x7f) << 14) |
    ((bytes[8]! & 0x7f) << 7) |
    (bytes[9]! & 0x7f);
  const footer = (bytes[5]! & 0x10) !== 0 ? 10 : 0;
  return 10 + size + footer;
};

type Frame = { length: number; samples: number; sampleRate: number };

const parseHeader = (bytes: Uint8Array, at: number): Frame | undefined => {
  if (at + 4 > bytes.length) return undefined;
  const b1 = bytes[at + 1]!;
  const b2 = bytes[at + 2]!;
  if (bytes[at] !== 0xff || (b1 & 0xe0) !== 0xe0) return undefined;
  const version = (b1 >> 3) & 3; // 1 = reserved
  const layer = (b1 >> 1) & 3; // 1 = Layer III
  if (version === 1 || layer !== 1) return undefined;
  const bitrateIndex = b2 >> 4;
  const rateIndex = (b2 >> 2) & 3;
  if (bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return undefined;
  const sampleRate = SAMPLE_RATES[version]![rateIndex]!;
  const mpeg1 = version === 3;
  const bitrate = (mpeg1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex]! * 1000;
  const padding = (b2 >> 1) & 1;
  const samples = mpeg1 ? 1152 : 576;
  const length = Math.floor(((mpeg1 ? 144 : 72) * bitrate) / sampleRate) + padding;
  return { length, samples, sampleRate };
};

/** Exact duration in seconds. Throws if no valid MP3 frame sequence is found. */
export const mp3DurationSec = (bytes: Uint8Array): number => {
  let pos = id3v2Size(bytes);
  let seconds = 0;
  let frames = 0;
  while (pos < bytes.length) {
    const frame = parseHeader(bytes, pos);
    if (!frame) {
      // Resync: skip garbage / trailing ID3v1 tag, but only search forward byte by byte.
      pos += 1;
      continue;
    }
    // A Xing/Info header frame carries no audio; it is the first frame and starts with the tag.
    if (frames === 0) {
      const sideInfo = frame.samples === 1152 ? 32 : 17;
      const tagAt = pos + 4 + ((bytes[pos + 1]! & 1) === 0 ? 2 : 0) + sideInfo;
      const tag = String.fromCharCode(...bytes.subarray(tagAt, tagAt + 4));
      if (tag === 'Xing' || tag === 'Info') {
        pos += frame.length;
        frames = -1; // mark: header consumed, still need the first real frame
        continue;
      }
    }
    if (pos + frame.length > bytes.length) break; // truncated last frame
    seconds += frame.samples / frame.sampleRate;
    frames = frames <= 0 ? 1 : frames + 1;
    pos += frame.length;
  }
  if (frames < 1) throw new Error('No valid MP3 frames found');
  return seconds;
};
