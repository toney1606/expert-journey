import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CodeBlock } from '../../components/CodeBlock/CodeBlock';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { CheckIcon, GlowBlob, Kicker, useDrift } from '../../components/ui/ui';
import { spokenFrames } from '../../lib/cues';
import { colors, fontFamily, glow } from '../../design/tokens';
import { springs } from '../../design/springs';
import {
  CHECK_SIZE,
  GAP,
  LOCK_SIZE,
  ROW_GAP,
  ROW_LINE,
  ROW_PAD_X,
  TABLE_PAD,
  TITLE_SIZE,
  WALL_ZONE,
  HERO_LINE,
  uniqueKeyLayout,
} from './layout';
import { Lock } from './Lock';
import { UniqueKeyPropsSchema } from './schema';
import type { UniqueKeyScene } from './schema';
import { typeFrames, typedChars, uniqueKeyCues } from './timeline';

/** Frames the duplicate row needs to reach the wall, and the distance it travels past its resting place. */
const HIT_FRAMES = 9;
const TRAVEL = 120;
const SHAKE_PERIOD = 2.2;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const UniqueKey: React.FC<{ scene: UniqueKeyScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const props = UniqueKeyPropsSchema.parse(scene.props);
  const layout = uniqueKeyLayout(props);
  const words = useSceneWords();
  const heroAt = props.heroAt ?? [];
  const cues = uniqueKeyCues(
    spokenFrames(
      words,
      [heroAt[0], heroAt[1], props.codeAt, props.rowOkAt, props.rowDupAt, props.badgeAt],
      fps,
    ),
    durationInFrames,
  );
  const drift = useDrift(0.04);
  const enter = spring({ frame, fps, config: springs.snappy });

  const heroPop = (start: number): number =>
    spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 150, mass: 1 } });

  // Typed code.
  const typeLen = typeFrames(props.code.length, cues.code, cues.rowOk);
  const typed = typedChars(frame, cues.code, typeLen, props.code.length);
  const codeIn = spring({ frame: frame - cues.code + 6, fps, config: springs.snappy });
  const codeLines = props.code.split('\n');
  const lineStart = codeLines
    .slice(0, Math.max(0, layout.uniqueLine))
    .reduce((n, l) => n + l.length + 1, 0);
  const lineLen = layout.uniqueLine >= 0 ? (codeLines[layout.uniqueLine]?.length ?? 1) : 1;
  const uniqueLit = layout.uniqueLine >= 0 ? clamp01((typed - lineStart) / lineLen) : 0;
  const codeDone = typed >= props.code.length;
  const lockOn = spring({
    frame: frame - (cues.code + typeLen),
    fps,
    config: { damping: 10, stiffness: 160, mass: 1 },
  });

  // Row 1 slides in from the left; the check pops a few frames later.
  const rowWidth = layout.rowSize * 0.6 * props.rowOk.length + 2 * ROW_PAD_X + CHECK_SIZE + 16;
  const okSlide = spring({ frame: frame - cues.rowOk, fps, config: springs.snappy });
  const okX = -(rowWidth + 60) * (1 - okSlide);
  const okCheck = spring({
    frame: frame - cues.rowOk - 8,
    fps,
    config: { damping: 10, stiffness: 180, mass: 1 },
  });

  // Row 2 runs at the wall, shakes against it and bounces back.
  const t = frame - cues.rowDup;
  const approach = clamp01(t / HIT_FRAMES);
  const bounce = spring({
    frame: t - HIT_FRAMES,
    fps,
    config: { damping: 9, stiffness: 190, mass: 1 },
  });
  const dupX =
    t < HIT_FRAMES
      ? -(rowWidth + 60) + (rowWidth + 60 + TRAVEL) * approach * approach
      : TRAVEL * (1 - bounce);
  const hitAge = t - HIT_FRAMES;
  const hitShake =
    hitAge >= 0 ? Math.sin(hitAge * SHAKE_PERIOD) * 16 * Math.max(0, 1 - hitAge / 14) : 0;
  const wallHit = hitAge >= 0 ? Math.max(0, 1 - hitAge / 18) : 0;
  const wallColor = t >= 0 ? colors.accent : colors.correct;

  // Stamp slams on the duplicate row; the whole table gives a short jolt.
  const stamp = spring({
    frame: frame - cues.badge,
    fps,
    config: { damping: 9, stiffness: 220, mass: 0.8 },
  });
  const stampAge = frame - cues.badge;
  const jolt = stampAge >= 0 ? Math.sin(stampAge * 2.6) * 10 * Math.max(0, 1 - stampAge / 12) : 0;

  const contentW = 830 - 2 * TABLE_PAD - 4;
  const slotH = layout.rowHeight;
  const rowStyle = (color: string): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: 0,
    height: slotH,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: `0 ${ROW_PAD_X}px`,
    borderRadius: 20,
    border: `3px solid color-mix(in srgb, ${color} 75%, transparent)`,
    background: `color-mix(in srgb, ${color} 14%, ${colors.bg})`,
    color,
    fontFamily: fontFamily.code,
    fontSize: layout.rowSize,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    boxShadow: `0 0 36px color-mix(in srgb, ${color} 28%, transparent)`,
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: GAP,
        fontFamily: fontFamily.title,
        color: colors.text,
      }}
    >
      <GlowBlob
        color={t >= 0 ? colors.accent : colors.correct}
        opacity={0.2}
        style={{ top: '62%' }}
      />
      {props.kicker ? <Kicker {...props.kicker} tone="accent" /> : <div style={{ height: 64 }} />}
      <div style={{ textAlign: 'center', transform: `scale(${drift})`, transformOrigin: 'top' }}>
        {props.hero.map((line, i) => {
          const p = heroPop(i === 0 ? cues.hero1 : cues.hero2);
          return (
            <div
              key={line}
              style={{
                fontSize: layout.heroSizes[i],
                fontWeight: 800,
                lineHeight: HERO_LINE,
                whiteSpace: 'nowrap',
                opacity: clamp01(p * 1.5),
                transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
                textShadow: i === 1 ? glow(colors.accent) : undefined,
              }}
            >
              <RichText text={line} glow />
            </div>
          );
        })}
      </div>
      <div
        style={{
          height: layout.codeHeight,
          opacity: clamp01(codeIn * 1.4),
          transform: `translateY(${interpolate(codeIn, [0, 1], [40, 0])}px)`,
        }}
      >
        <CodeBlock
          code={codeDone ? props.code : `${props.code.slice(0, typed)}▌`}
          language="sql"
          fontSize={layout.codeSize}
          highlightLines={layout.uniqueLine >= 0 ? [layout.uniqueLine] : []}
          highlightColor={colors.accent}
          highlightAmount={uniqueLit}
          style={{ borderRadius: 36, height: layout.codeHeight, textAlign: 'left' }}
        />
      </div>
      <div
        style={{
          position: 'relative',
          height: layout.tableHeight,
          boxSizing: 'border-box',
          padding: TABLE_PAD,
          background: colors.card,
          border: `2px solid color-mix(in srgb, ${colors.accent} ${Math.round(20 + 40 * lockOn)}%, ${colors.border})`,
          borderRadius: 28,
          overflow: 'hidden',
          opacity: enter,
          transform: `translate(${jolt}px, ${interpolate(enter, [0, 1], [40, 0])}px)`,
          boxShadow: `0 0 ${Math.round(60 * lockOn)}px color-mix(in srgb, ${colors.accent} 22%, transparent)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: fontFamily.code,
            fontSize: TITLE_SIZE,
            fontWeight: 800,
            lineHeight: ROW_LINE,
            height: Math.ceil(TITLE_SIZE * ROW_LINE) + 8,
          }}
        >
          <span>{props.tableName}</span>
          <span
            style={{
              display: 'inline-flex',
              transform: `scale(${0.8 + 0.2 * lockOn + 0.12 * wallHit})`,
              filter: `drop-shadow(0 0 ${Math.round(14 * lockOn)}px ${colors.accent})`,
            }}
          >
            <Lock size={LOCK_SIZE} color={lockOn > 0.05 ? colors.accent : colors.textMuted} />
          </span>
        </div>
        <div
          style={{
            fontFamily: fontFamily.code,
            fontSize: layout.rowSize,
            lineHeight: ROW_LINE,
            color: colors.textMuted,
            fontWeight: 600,
            padding: `0 ${ROW_PAD_X + 3}px`,
            marginTop: ROW_GAP,
            whiteSpace: 'nowrap',
          }}
        >
          {props.header}
        </div>
        <div style={{ position: 'relative', marginTop: ROW_GAP, height: 2 * slotH + ROW_GAP }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: contentW - WALL_ZONE }}>
            <div style={{ position: 'relative', height: slotH }}>
              <div
                style={{
                  ...rowStyle(colors.correct),
                  transform: `translateX(${okX}px)`,
                  opacity: clamp01(okSlide * 3),
                }}
              >
                <span>{props.rowOk}</span>
                <span style={{ display: 'inline-flex', transform: `scale(${okCheck})` }}>
                  <CheckIcon size={CHECK_SIZE} />
                </span>
              </div>
            </div>
            <div style={{ position: 'relative', height: slotH, marginTop: ROW_GAP }}>
              <div
                style={{
                  ...rowStyle(colors.wrong),
                  transform: `translateX(${dupX}px) translateY(${hitShake * 0.25}px)`,
                  opacity: t >= 0 ? 1 : 0,
                }}
              >
                <span>{props.rowDup}</span>
              </div>
            </div>
          </div>
          {/* The UNIQUE wall: vertical bar that lights up yellow when the duplicate hits it. */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: -ROW_GAP / 2,
              width: 22,
              height: 2 * slotH + 2 * ROW_GAP,
              borderRadius: 11,
              background: wallColor,
              opacity: 0.55 + 0.45 * Math.max(wallHit, lockOn),
              transform: `translateX(${-hitShake * 0.5}px) scaleX(${1 + 0.5 * wallHit})`,
              boxShadow: `0 0 ${Math.round(30 + 50 * wallHit)}px ${wallColor}`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 24,
              top: slotH + ROW_GAP,
              height: slotH,
              width: contentW - 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                opacity: clamp01(stamp * 2),
                transform: `rotate(-9deg) scale(${interpolate(stamp, [0, 1], [2.6, 1])})`,
                marginRight: WALL_ZONE - 30,
                padding: '0 24px',
                border: `7px solid ${colors.wrong}`,
                borderRadius: 18,
                color: colors.wrong,
                background: `color-mix(in srgb, ${colors.wrong} 22%, ${colors.bg})`,
                fontSize: 64,
                fontWeight: 900,
                letterSpacing: 4,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                boxShadow: `0 0 40px color-mix(in srgb, ${colors.wrong} 45%, transparent)`,
              }}
            >
              {props.badge}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
