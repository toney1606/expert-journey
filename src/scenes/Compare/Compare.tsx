import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Icon } from '../../components/Icon/Icon';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { spokenFrames } from '../../lib/cues';
import { CONTENT_BOX, colors, fontFamily, lineHeight } from '../../design/tokens';
import { springs } from '../../design/springs';
import {
  CAPTION_LINE_HEIGHT,
  CARD_PAD,
  ICON_GAP,
  LABEL_LINE_HEIGHT,
  TEXT_GAP,
  TITLE_GAP,
  VERDICT_GAP,
  VERDICT_LINE_HEIGHT,
  VERDICT_PAD_X,
  VERDICT_PAD_Y,
  VS_SIZE,
  chooseLayout,
  type CompareLayout,
} from './layout';
import { alpha, toneColor } from './tones';
import { buildTimeline, compareCueFrames } from './timeline';
import type { CompareScene } from './schema';

type Side = CompareScene['props']['left'];

const SideCard: React.FC<{
  side: Side;
  layout: CompareLayout;
  progress: number;
  frame: number;
  glow: boolean;
  fromX: number;
}> = ({ side, layout, progress, frame, glow, fromX }) => {
  // Scene props may reach the component without zod defaults applied (raw JSON), so default here too.
  const toneName = (side.tone as Side['tone'] | undefined) ?? 'neutral';
  const tone = toneColor[toneName];
  const stacked = layout.orientation === 'stacked';
  const pulse = glow ? 0.75 + 0.25 * Math.sin(frame / 12) : 0.6;
  const badge = toneName === 'neutral' ? null : toneName === 'good' ? 'check' : 'cross';
  return (
    <div
      style={{
        opacity: progress,
        transform: `translate(${interpolate(progress, [0, 1], [fromX, 0])}px, ${interpolate(progress, [0, 1], [stacked ? 0 : 40, 0])}px) scale(${interpolate(progress, [0, 1], [0.94, 1])})`,
        width: layout.cardWidth,
        height: layout.cardHeight,
        boxSizing: 'border-box',
        position: 'relative',
        padding: CARD_PAD,
        borderRadius: 28,
        backgroundColor: colors.card,
        border: `3px solid ${tone}${glow ? '' : alpha.glow}`,
        boxShadow: glow ? `0 0 ${40 * pulse}px ${tone}${alpha.glow}` : 'none',
        display: 'flex',
        flexDirection: stacked ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: stacked ? 'flex-start' : 'center',
        gap: ICON_GAP,
        textAlign: stacked ? 'left' : 'center',
      }}
    >
      {side.icon ? (
        <div
          style={{
            flexShrink: 0,
            width: layout.iconSize,
            height: layout.iconSize,
            borderRadius: 24,
            background: `${tone}${alpha.soft}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={side.icon} size={layout.iconSize * 0.62} color={tone} />
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: TEXT_GAP, minWidth: 0 }}>
        <div
          style={{
            fontFamily: fontFamily.title,
            fontWeight: 800,
            fontSize: layout.labelSize,
            lineHeight: LABEL_LINE_HEIGHT,
            color: colors.text,
          }}
        >
          {side.label}
        </div>
        {side.caption ? (
          <div
            style={{
              fontFamily: fontFamily.title,
              fontWeight: 400,
              fontSize: layout.captionSize,
              lineHeight: CAPTION_LINE_HEIGHT,
              color: colors.textMuted,
            }}
          >
            {side.caption}
          </div>
        ) : null}
      </div>
      {badge ? (
        <div
          style={{
            position: 'absolute',
            top: -22,
            right: 14,
            width: 48,
            height: 48,
            borderRadius: 24,
            background: tone,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${progress})`,
          }}
        >
          <Icon name={badge} size={30} color={colors.bg} />
        </div>
      ) : null}
    </div>
  );
};

export const Compare: React.FC<{ scene: CompareScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { title, left, right, verdict } = scene.props;

  const layout = chooseLayout(
    title,
    verdict,
    [
      { label: left.label, caption: left.caption, hasIcon: left.icon !== undefined },
      { label: right.label, caption: right.caption, hasIcon: right.icon !== undefined },
    ],
    CONTENT_BOX,
  );
  const timeline = buildTimeline(durationInFrames, verdict !== undefined);
  const words = useSceneWords();
  const {
    left: leftAt,
    right: rightAt,
    verdict: verdictAt,
  } = compareCueFrames(
    spokenFrames(words, [left.at, right.at, scene.props.verdictAt], fps),
    durationInFrames,
    verdict !== undefined,
  );

  const enter = (start: number, config: object = springs.snappy): number =>
    spring({ frame: frame - start, fps, config });

  const stacked = layout.orientation === 'stacked';
  const titleP = enter(timeline.title);
  const leftP = enter(leftAt);
  const rightP = enter(rightAt);
  const vsP = enter(Math.round((leftAt + rightAt) / 2), springs.bouncy);
  const verdictP = enter(verdictAt);

  // Glow on the winning side only when exactly one side is "good".
  const winner =
    left.tone === 'good' && right.tone !== 'good'
      ? 'left'
      : right.tone === 'good' && left.tone !== 'good'
        ? 'right'
        : null;

  const vs = (
    <div
      style={{
        ...(stacked
          ? { height: VS_SIZE, width: '100%', flexDirection: 'row' as const }
          : {
              position: 'absolute' as const,
              left: '50%',
              top: '50%',
              marginLeft: -VS_SIZE / 2,
              marginTop: -VS_SIZE / 2,
              width: VS_SIZE,
              height: VS_SIZE,
            }),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 2,
      }}
    >
      {stacked ? (
        <div
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: colors.textMuted,
            opacity: 0.4,
            transform: `scaleX(${vsP})`,
            transformOrigin: 'right center',
          }}
        />
      ) : null}
      <div
        style={{
          flexShrink: 0,
          width: VS_SIZE,
          height: VS_SIZE,
          borderRadius: VS_SIZE / 2,
          background: colors.bg,
          border: `3px solid ${colors.accent}`,
          color: colors.accent,
          fontFamily: fontFamily.title,
          fontWeight: 800,
          fontSize: 30,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${vsP}) rotate(${interpolate(vsP, [0, 1], [-30, 0])}deg)`,
        }}
      >
        VS
      </div>
      {stacked ? (
        <div
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: colors.textMuted,
            opacity: 0.4,
            transform: `scaleX(${vsP})`,
            transformOrigin: 'left center',
          }}
        />
      ) : null}
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        paddingTop: layout.top,
      }}
    >
      <div
        style={{
          opacity: titleP,
          transform: `translateY(${interpolate(titleP, [0, 1], [40, 0])}px)`,
          fontFamily: fontFamily.title,
          fontWeight: 800,
          fontSize: layout.titleSize,
          lineHeight: lineHeight.title,
          color: colors.text,
          marginBottom: TITLE_GAP,
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: stacked ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: stacked ? 'stretch' : 'flex-start',
          gap: 0,
        }}
      >
        <SideCard
          side={left}
          layout={layout}
          progress={leftP}
          frame={frame}
          glow={winner === 'left'}
          fromX={stacked ? -80 : 0}
        />
        {vs}
        <SideCard
          side={right}
          layout={layout}
          progress={rightP}
          frame={frame}
          glow={winner === 'right'}
          fromX={stacked ? 80 : 0}
        />
      </div>
      {verdict ? (
        <div
          style={{
            marginTop: VERDICT_GAP,
            padding: `${VERDICT_PAD_Y}px ${VERDICT_PAD_X}px`,
            boxSizing: 'border-box',
            opacity: verdictP,
            transform: `translateY(${interpolate(verdictP, [0, 1], [32, 0])}px)`,
            borderRadius: 24,
            background: `${colors.accent}${alpha.faint}`,
            border: `3px solid ${colors.accent}`,
            textAlign: 'center',
            fontFamily: fontFamily.title,
            fontWeight: 800,
            fontSize: layout.verdictSize,
            lineHeight: VERDICT_LINE_HEIGHT,
            color: colors.text,
          }}
        >
          <RichText text={verdict} />
        </div>
      ) : null}
    </div>
  );
};
