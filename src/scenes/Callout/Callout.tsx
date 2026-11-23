import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { spokenFrames } from '../../lib/cues';
import { springs } from '../../design/springs';
import { colors, fontFamily, spacing } from '../../design/tokens';
import { parseRichText } from '../../lib/rich-text';
import { CALLOUT_KIND_STYLE, kickerFor } from './kinds';
import { calloutLayout } from './layout';
import type { CalloutScene } from './schema';
import { calloutCueFrames, calloutTimeline, slamShake } from './timeline';

const SLAM_SPRING = { damping: 11, stiffness: 320, mass: 0.8 };
const STRIKE_HEIGHT = 8;

/** Myth statement: parts marked {wrong|...} get a line drawn through them as `progress` goes 0 -> 1. */
const MythStatement: React.FC<{ text: string; progress: number }> = ({ text, progress }) => (
  <>
    {parseRichText(text).map((segment, index) =>
      segment.color === 'wrong' ? (
        <span
          key={index}
          style={{
            color: colors.wrong,
            backgroundImage: `linear-gradient(${colors.wrong}, ${colors.wrong})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '0 58%',
            backgroundSize: `${progress * 100}% ${STRIKE_HEIGHT}px`,
          }}
        >
          {segment.text}
        </span>
      ) : segment.color ? (
        <span key={index} style={{ color: colors[segment.color] }}>
          {segment.text}
        </span>
      ) : (
        <span key={index}>{segment.text}</span>
      ),
    )}
  </>
);

export const Callout: React.FC<{ scene: CalloutScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { kind, kicker, statement, explanation, statementAt, explanationAt } = scene.props;

  const timeline = calloutTimeline(durationInFrames);
  const words = useSceneWords();
  const { statement: slamFrame, explanation: explanationFrame } = calloutCueFrames(
    spokenFrames(words, [statementAt, explanationAt], fps),
    durationInFrames,
    explanation !== undefined,
  );
  const layout = calloutLayout(statement, explanation);
  const { color } = CALLOUT_KIND_STYLE[kind];

  const kickerPop = spring({
    frame: frame - timeline.kickerStart,
    fps,
    config: springs.bouncy,
  });
  const slam = spring({ frame: frame - slamFrame, fps, config: SLAM_SPRING });
  const slamScale = interpolate(slam, [0, 1], [1.6, 1]);
  const slamOpacity = interpolate(frame - slamFrame, [0, 3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shake = slamShake(frame - slamFrame);
  const explain = spring({ frame: frame - explanationFrame, fps, config: springs.snappy });

  const pulse = Math.sin((frame / fps) * Math.PI * 1.6);
  const glow = interpolate(pulse, [-1, 1], [10, 34]);
  const strike = spring({
    frame: frame - (slamFrame + timeline.strikeDelay),
    fps,
    config: springs.snappy,
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <div
        style={{
          alignSelf: 'flex-start',
          opacity: Math.min(1, kickerPop),
          transform: `scale(${interpolate(kickerPop, [0, 1], [0.4, 1])})`,
          transformOrigin: 'left center',
          fontFamily: fontFamily.code,
          fontWeight: 700,
          fontSize: 32,
          lineHeight: 1.4,
          color: colors.bg,
          background: color,
          padding: `${spacing.xs}px ${spacing.md}px`,
          borderRadius: 16,
        }}
      >
        {kickerFor(kind, kicker)}
      </div>
      <div
        style={{
          opacity: slamOpacity,
          transform: `translateX(${shake}px) scale(${slamScale})`,
          transformOrigin: 'center center',
          background: colors.card,
          border: `3px solid ${color}`,
          borderRadius: 32,
          padding: 40,
          boxShadow: `0 0 ${glow}px ${color}99`,
          fontFamily: fontFamily.title,
          color: colors.text,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: layout.statementFontSize,
            lineHeight: layout.statementLineHeight,
          }}
        >
          {kind === 'myth' ? (
            <MythStatement text={statement} progress={strike} />
          ) : (
            <RichText text={statement} glow />
          )}
        </div>
        {explanation ? (
          <div
            style={{
              marginTop: 24,
              opacity: explain,
              transform: `translateY(${interpolate(explain, [0, 1], [24, 0])}px)`,
              fontWeight: 400,
              fontSize: layout.explanationFontSize,
              lineHeight: layout.explanationLineHeight,
              color: colors.textMuted,
            }}
          >
            {explanation}
          </div>
        ) : null}
      </div>
    </div>
  );
};
