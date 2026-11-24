import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fontFamily, glow } from '../../design/tokens';
import { springs } from '../../design/springs';

export type UiTone = 'neutral' | 'good' | 'bad' | 'pending' | 'accent';

export const toneColors: Record<UiTone, string> = {
  neutral: colors.diagram,
  good: colors.correct,
  bad: colors.wrong,
  pending: colors.pending,
  accent: colors.accent,
};

/** Smallest text allowed in the video body (px); only the kicker may be smaller. */
export const MIN_TEXT = 44;
export const KICKER_SIZE = 36;

/** Top row of every scene: step label chip (left) and progress dots (right). Keeps all scenes consistent. */
export const Kicker: React.FC<{ label: string; step: number; total: number; tone?: UiTone }> = ({
  label,
  step,
  total,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: springs.snappy });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [-24, 0])}px)`,
        fontFamily: fontFamily.title,
      }}
    >
      <div
        style={{
          fontSize: KICKER_SIZE,
          fontWeight: 800,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: colors.accentMuted,
          border: `2px solid ${colors.border}`,
          borderRadius: 14,
          padding: '4px 22px',
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              boxSizing: 'border-box',
              background:
                i + 1 === step ? colors.accent : i + 1 < step ? colors.accentMuted : 'transparent',
              border: i + 1 <= step ? 'none' : `3px solid ${colors.textMuted}66`,
              boxShadow: i + 1 === step ? `0 0 14px ${colors.accent}aa` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Window card: near-black fill, thin border (tinted by `tone` unless neutral). With `title` it gets an IDE-style
 * title bar (traffic-light dots + file name).
 */
export const GlassCard: React.FC<{
  tone?: UiTone;
  glow?: number;
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ tone = 'neutral', glow: glowAmount = 0.35, title, children, style }) => {
  const color = toneColors[tone];
  const tinted = tone !== 'neutral';
  return (
    <div
      style={{
        background: colors.card,
        border: `2px solid ${tinted ? `color-mix(in srgb, ${color} 55%, ${colors.border})` : colors.border}`,
        borderRadius: 28,
        boxShadow: tinted
          ? `0 0 ${Math.round(50 * glowAmount)}px color-mix(in srgb, ${color} ${Math.round(30 * glowAmount)}%, transparent)`
          : 'none',
        boxSizing: 'border-box',
        padding: '28px 34px',
        fontFamily: fontFamily.title,
        color: colors.text,
        overflow: 'hidden',
        ...style,
      }}
    >
      {title ? <WindowBar title={title} /> : null}
      {children}
    </div>
  );
};

/** IDE-style title bar: red / yellow / green dots and a file name on the right. */
export const WindowBar: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      margin: '-28px -34px 24px',
      padding: '16px 28px',
      borderBottom: `2px solid ${colors.border}`,
      background: '#101010',
    }}
  >
    <div style={{ display: 'flex', gap: 12 }}>
      {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
        <div key={c} style={{ width: 22, height: 22, borderRadius: '50%', background: c }} />
      ))}
    </div>
    <div
      style={{
        fontFamily: fontFamily.code,
        fontSize: 30,
        fontWeight: 700,
        color: colors.textMuted,
      }}
    >
      {title}
    </div>
  </div>
);

/** Slow push-in for the hero of a scene: scale from 1 to 1 + amount over the whole scene. */
export const useDrift = (amount = 0.035): number => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return 1 + interpolate(frame, [0, durationInFrames], [0, amount], { extrapolateRight: 'clamp' });
};

/** Staggered entrance: 0..1 spring starting at `start` (frames). */
export const useEnter = (start: number, config = springs.snappy): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config });
};

/** Width (em) of one character in a `DigitSlots` row: digits are equal-width so a ticking number never jitters. */
export const slotEm = (ch: string): number => (/\d/.test(ch) ? 0.62 : ch === ' ' ? 0.3 : 0.3);

/** Total width (em) of `text` drawn by `DigitSlots`. */
export const slotsWidthEm = (text: string): number =>
  [...text].reduce((sum, ch) => sum + slotEm(ch), 0);

/** Big ticking number: every character sits in a fixed-width slot (tabular, never jitters). */
export const DigitSlots: React.FC<{ text: string; size: number }> = ({ text, size }) => (
  <span
    style={{
      display: 'inline-flex',
      whiteSpace: 'nowrap',
      fontSize: size,
      textShadow: glow('currentColor'),
    }}
  >
    {[...text].map((ch, i) => (
      <span
        key={i}
        style={{ display: 'inline-block', width: `${slotEm(ch)}em`, textAlign: 'center' }}
      >
        {ch}
      </span>
    ))}
  </span>
);

/** Soft radial glow that may bleed past the content box (decorative, centred on its parent). */
export const GlowBlob: React.FC<{
  color: string;
  size?: number;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({ color, size = 1100, opacity = 0.35, style }) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: size,
      height: size,
      marginLeft: -size / 2,
      marginTop: -size / 2,
      borderRadius: '50%',
      background: `radial-gradient(circle, color-mix(in srgb, ${color} 55%, transparent) 0%, transparent 62%)`,
      opacity,
      pointerEvents: 'none',
      ...style,
    }}
  />
);

/** Bold check mark glyph drawn as SVG (no font dependency). */
export const CheckIcon: React.FC<{ size: number; color?: string }> = ({
  size,
  color = colors.correct,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path
      d="M4.5 12.8l4.8 4.8L19.5 6.8"
      stroke={color}
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Pill chip (>= 48px text): tone-coloured outline, translucent fill. */
export const Chip: React.FC<{
  tone?: UiTone;
  size?: number;
  solid?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ tone = 'neutral', size = 48, solid = false, children, style }) => {
  const color = toneColors[tone];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: fontFamily.title,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.3,
        padding: '4px 28px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        color: solid ? colors.bg : color,
        background: solid ? color : `color-mix(in srgb, ${color} 16%, ${colors.bg})`,
        border: `3px solid color-mix(in srgb, ${color} 70%, transparent)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Entrance with a visible overshoot (0..~1.1..1) starting at `start` frames: for hero pops. */
export const useBounceEnter = (start: number): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 150, mass: 1 } });
};
