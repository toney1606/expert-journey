import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { BACKDROP_EDGE, mixHex, mixPalettes } from '../../design/mood';
import type { Mood } from '../../schemas/common';
import { BLOBS, GRID_SIZE, PARTICLES, blobCenter, gridOffset, particleAt } from './motion';

type Props = {
  /** Mood the backdrop is leaving (or simply showing when `mix` is 0). */
  from: Mood;
  /** Mood the backdrop is blending to; defaults to `from`. */
  to?: Mood;
  /** 0..1 crossfade between `from` and `to` (eased inside). */
  mix?: number;
};

const GRAIN_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'>" +
  "<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter>" +
  "<rect width='256' height='256' filter='url(#n)'/></svg>";
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Full-frame animated background: drifting glow blobs, faint grid, particles, vignette, film grain. */
export const Backdrop: React.FC<Props> = ({ from, to = from, mix = 0 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const palette = mixPalettes(from, to, smooth(Math.min(1, Math.max(0, mix))));
  const gridFade = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: palette.base, overflow: 'hidden' }}>
      {BLOBS.map((spec, index) => {
        const { x, y } = blobCenter(spec, frame, width, height);
        const color = palette.blobs[index] ?? palette.line;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: x - spec.radius,
              top: y - spec.radius,
              width: spec.radius * 2,
              height: spec.radius * 2,
              borderRadius: '50%',
              opacity: spec.opacity,
              background: `radial-gradient(circle, ${color} 0%, ${color}00 68%)`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          opacity: 0.07 * gridFade,
          backgroundImage:
            `linear-gradient(${palette.line} 1px, transparent 1px),` +
            `linear-gradient(90deg, ${palette.line} 1px, transparent 1px)`,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          backgroundPosition: `0px ${gridOffset(frame)}px`,
        }}
      />
      {PARTICLES.map((index) => {
        const p = particleAt(index, frame, width, height);
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              opacity: p.opacity,
              background: palette.line,
              boxShadow: `0 0 ${p.size * 3}px ${palette.line}`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 45%, transparent 45%, ${mixHex(palette.base, BACKDROP_EDGE, 0.8)}cc 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN_URL,
          backgroundSize: '256px 256px',
          opacity: 0.05,
          mixBlendMode: 'overlay',
        }}
      />
    </AbsoluteFill>
  );
};
