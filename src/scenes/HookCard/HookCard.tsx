import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fontFamily, lineHeight, spacing } from '../../design/tokens';
import { springs } from '../../design/springs';
import type { HookScene } from './schema';

export const HookCard: React.FC<{ scene: HookScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { badge, headline, subline } = scene.props;

  const enter = (delayFrames: number): number =>
    spring({ frame: frame - delayFrames, fps, config: springs.snappy });

  const rise = (progress: number): React.CSSProperties => ({
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [48, 0])}px)`,
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      {badge ? (
        <div
          style={{
            ...rise(enter(0)),
            alignSelf: 'flex-start',
            fontFamily: fontFamily.code,
            fontWeight: 700,
            fontSize: 36,
            color: colors.bg,
            background: colors.accent,
            padding: `${spacing.sm}px ${spacing.md}px`,
            borderRadius: 16,
          }}
        >
          {badge}
        </div>
      ) : null}
      <div
        style={{
          ...rise(enter(6)),
          fontFamily: fontFamily.title,
          fontWeight: 800,
          fontSize: 72,
          lineHeight: lineHeight.title,
          color: colors.text,
        }}
      >
        {headline}
      </div>
      {subline ? (
        <div
          style={{
            ...rise(enter(18)),
            fontFamily: fontFamily.title,
            fontWeight: 400,
            fontSize: 40,
            lineHeight: lineHeight.body,
            color: colors.textMuted,
          }}
        >
          {subline}
        </div>
      ) : null}
    </div>
  );
};
