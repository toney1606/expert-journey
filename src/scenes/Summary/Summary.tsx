import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fontFamily, spacing } from '../../design/tokens';
import { springs } from '../../design/springs';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { spokenFrames } from '../../lib/cues';
import { summaryLayout } from './layout';
import type { SummaryScene } from './schema';
import { applySummaryCues, summaryTimeline } from './timeline';

const CheckMark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="11" fill={colors.correct} />
    <path
      d="M6.5 12.5l3.5 3.5 7.5-8"
      fill="none"
      stroke={colors.bg}
      strokeWidth={2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

export const Summary: React.FC<{ scene: SummaryScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { points, loopLine, pointsAt, loopAt } = scene.props;
  const words = useSceneWords();

  const cued = spokenFrames(words, [...points.map((_, i) => pointsAt?.[i]), loopAt], fps);
  const timeline = applySummaryCues(
    summaryTimeline(durationInFrames, points.length, Boolean(loopLine)),
    cued.slice(0, points.length),
    cued[points.length],
    durationInFrames,
  );
  const layout = summaryLayout(points, loopLine);

  const enter = (start: number): number =>
    spring({ frame: frame - start, fps, config: springs.snappy });

  const rise = (progress: number): React.CSSProperties => ({
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [48, 0])}px)`,
  });

  const pulse = Math.sin((frame / fps) * Math.PI * 1.6);
  const loopStart = timeline.loopStart ?? 0;
  const loopActive = frame >= loopStart ? 1 : 0;
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
        gap: 18,
      }}
    >
      <div
        style={{
          ...rise(enter(timeline.labelStart)),
          alignSelf: 'flex-start',
          fontFamily: fontFamily.code,
          fontWeight: 700,
          fontSize: 32,
          lineHeight: 1.4,
          color: colors.bg,
          background: colors.accent,
          padding: `${spacing.xs}px ${spacing.md}px`,
          borderRadius: 16,
          marginBottom: 6,
        }}
      >
        Takeaway
      </div>
      {points.map((point, i) => (
        <div
          key={`${i}-${point}`}
          style={{
            ...rise(enter(timeline.pointStarts[i] ?? 0)),
            display: 'flex',
            alignItems: 'flex-start',
            gap: 18,
            fontFamily: fontFamily.title,
            fontWeight: 600,
            fontSize: layout.fontSize,
            lineHeight: layout.lineHeight,
            color: colors.text,
          }}
        >
          <div
            style={{
              paddingTop: (layout.fontSize * layout.lineHeight - layout.fontSize * 1.1) / 2,
            }}
          >
            <CheckMark size={layout.fontSize * 1.1} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <RichText text={point} />
          </div>
        </div>
      ))}
      {loopLine ? (
        <div
          style={{
            ...rise(enter(loopStart)),
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: 20,
            background: colors.card,
            border: `2px solid ${colors.accent}`,
            borderRadius: 24,
            boxShadow: `0 0 ${borderGlow}px ${colors.accent}`,
            fontFamily: fontFamily.title,
            fontWeight: 700,
            fontSize: layout.loopFontSize,
            lineHeight: layout.lineHeight,
            color: colors.accent,
          }}
        >
          <LoopGlyph size={layout.loopFontSize * 1.2} scale={glyphScale} rotation={glyphRotation} />
          <div style={{ flex: 1, minWidth: 0 }}>{loopLine}</div>
        </div>
      ) : null}
    </div>
  );
};
