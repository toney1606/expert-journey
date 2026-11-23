import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { springs } from '../../design/springs';
import { colors, fontFamily, spacing } from '../../design/tokens';
import { RichText } from '../../components/RichText';
import { endCardLayout } from './layout';
import type { EndCardScene } from './schema';
import { endCardTimeline } from './timeline';

const LoopGlyph: React.FC<{ size: number; scale: number; rotation: number }> = ({
  size,
  scale,
  rotation,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ flexShrink: 0, transform: `scale(${scale}) rotate(${rotation}deg)` }}
  >
    <path
      d="M20 12a8 8 0 1 1-2.6-5.9"
      fill="none"
      stroke={colors.accent}
      strokeWidth={2.6}
      strokeLinecap="round"
    />
    <path
      d="M20.5 3v5.5H15"
      fill="none"
      stroke={colors.accent}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const EndCard: React.FC<{ scene: EndCardScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { headline, subline, cta, brand, loopLine } = scene.props;

  const timeline = endCardTimeline(durationInFrames, {
    subline: Boolean(subline),
    cta: Boolean(cta),
    loopLine: Boolean(loopLine),
    brand: Boolean(brand),
  });
  const layout = endCardLayout(scene.props);

  const enter = (start: number | null, config: Parameters<typeof spring>[0]['config']): number =>
    start === null ? 0 : spring({ frame: frame - start, fps, config });

  const rise = (progress: number): React.CSSProperties => ({
    opacity: Math.min(1, progress),
    transform: `translateY(${interpolate(progress, [0, 1], [48, 0])}px)`,
  });

  const pulse = Math.sin((frame / fps) * Math.PI * 1.6);
  const ctaStart = timeline.ctaStart ?? 0;
  const ctaActive = timeline.ctaStart !== null && frame >= ctaStart + 15 ? 1 : 0;
  const ctaPop = enter(timeline.ctaStart, springs.bouncy);
  const ctaScale = interpolate(ctaPop, [0, 1], [0.7, 1]) * (1 + 0.025 * pulse * ctaActive);
  const ctaGlow = interpolate(pulse, [-1, 1], [0, 18]) * ctaActive;

  const loopStart = timeline.loopStart ?? 0;
  const loopActive = timeline.loopStart !== null && frame >= loopStart ? 1 : 0;
  const glyphScale = 1 + 0.12 * pulse * loopActive;
  const glyphRotation = interpolate(pulse, [-1, 1], [-8, 8]) * loopActive;
  const borderGlow = interpolate(pulse, [-1, 1], [0, 14]) * loopActive;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 24,
        fontFamily: fontFamily.title,
      }}
    >
      <div
        style={{
          ...rise(enter(timeline.headlineStart, springs.snappy)),
          fontWeight: 800,
          fontSize: layout.headlineFontSize,
          lineHeight: layout.lineHeight,
          color: colors.text,
        }}
      >
        <RichText text={headline} />
      </div>
      {subline ? (
        <div
          style={{
            ...rise(enter(timeline.sublineStart, springs.snappy)),
            fontWeight: 400,
            fontSize: layout.sublineFontSize,
            lineHeight: 1.45,
            color: colors.textMuted,
          }}
        >
          <RichText text={subline} />
        </div>
      ) : null}
      {cta ? (
        <div
          style={{
            alignSelf: 'flex-start',
            opacity: Math.min(1, ctaPop),
            transform: `scale(${ctaScale})`,
            transformOrigin: 'left center',
            background: colors.diagram,
            color: colors.bg,
            fontWeight: 700,
            fontSize: layout.ctaFontSize,
            lineHeight: 1.45,
            padding: `20px 40px`,
            borderRadius: 999,
            boxShadow: `0 0 ${ctaGlow}px ${colors.diagram}`,
          }}
        >
          {cta}
        </div>
      ) : null}
      {loopLine ? (
        <div
          style={{
            ...rise(enter(timeline.loopStart, springs.snappy)),
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: 20,
            background: colors.card,
            border: `2px solid ${colors.accent}`,
            borderRadius: 24,
            boxShadow: `0 0 ${borderGlow}px ${colors.accent}`,
            fontWeight: 700,
            fontSize: layout.loopFontSize,
            lineHeight: 1.45,
            color: colors.accent,
          }}
        >
          <LoopGlyph size={layout.loopFontSize * 1.2} scale={glyphScale} rotation={glyphRotation} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <RichText text={loopLine} />
          </div>
        </div>
      ) : null}
      {brand ? (
        <div
          style={{
            ...rise(enter(timeline.brandStart, springs.soft)),
            fontFamily: fontFamily.code,
            fontWeight: 700,
            fontSize: layout.brandFontSize,
            lineHeight: 1.45,
            color: colors.textMuted,
            paddingTop: spacing.xs,
          }}
        >
          {brand}
        </div>
      ) : null}
    </div>
  );
};
