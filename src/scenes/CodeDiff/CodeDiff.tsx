import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CONTENT_BOX, colors, fontFamily, lineHeight, spacing } from '../../design/tokens';
import { springs } from '../../design/springs';
import { diffLines, splitLines } from './diff';
import { fitFontSize } from './fit';
import { buildLayout, type CodeLayout, CODE_CARD_PAD } from './layout';
import { tokenColors } from './syntax';
import { useSceneWords } from '../../components/SceneTiming';
import { spokenFrames } from '../../lib/cues';
import { codeTimeline } from './timeline';
import type { CodeScene } from './schema';

const BOX_WIDTH = CONTENT_BOX.width;
const BOX_HEIGHT = CONTENT_BOX.height;
const HEADER_HEIGHT = 72;
const BADGE_RESERVE = 110;
const CODE_LINE_HEIGHT = 1.5;
const MIN_SCALE = 0.75;
const SCALE_STEP = 0.02;

const tint = (color: string, percent: number): string =>
  `color-mix(in srgb, ${color} ${Math.round(percent * 100)}%, transparent)`;

const baseName = (path: string): string => path.split(/[\\/]/).pop() ?? path;

const range = (value: number, from: number, to: number): number =>
  interpolate(value, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const CodeDiff: React.FC<{ scene: CodeScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { language, filename, before, after, testPath, morphAt, testedAt } = scene.props;
  const words = useSceneWords();

  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);
  const entries = diffLines(beforeLines, afterLines);

  const innerWidth = BOX_WIDTH - CODE_CARD_PAD * 2;
  const allLines = [...beforeLines, ...afterLines];
  const maxCodeHeight = BOX_HEIGHT - HEADER_HEIGHT - BADGE_RESERVE - CODE_CARD_PAD * 2;
  // The code block is drawn at `scale` (<1 when it is too tall); lay it out in a virtual width of
  // innerWidth / scale so the scaled block still spans the card. Take the largest scale that fits.
  let chosen: { scale: number; fontSize: number; layout: CodeLayout } | undefined;
  for (let scale = 1; scale >= MIN_SCALE - 1e-9 && !chosen; scale -= SCALE_STEP) {
    const fit = fitFontSize(allLines, innerWidth / scale);
    const layout = buildLayout(entries, language, fit.maxCols);
    const natural = Math.max(layout.beforeRows, layout.afterRows) * fit.fontSize * CODE_LINE_HEIGHT;
    if (natural * scale <= maxCodeHeight) chosen = { scale, fontSize: fit.fontSize, layout };
  }
  if (!chosen) {
    const fit = fitFontSize(allLines, innerWidth / MIN_SCALE);
    const layout = buildLayout(entries, language, fit.maxCols);
    const natural = Math.max(layout.beforeRows, layout.afterRows) * fit.fontSize * CODE_LINE_HEIGHT;
    chosen = {
      scale: Math.min(MIN_SCALE, maxCodeHeight / natural),
      fontSize: fit.fontSize,
      layout,
    };
  }
  const { scale, fontSize, layout } = chosen;
  const rowHeight = fontSize * CODE_LINE_HEIGHT;
  const virtualWidth = innerWidth / scale;

  const [morphCue, testedCue] = spokenFrames(words, [morphAt, testedAt], fps);
  const { morphStart, morphEnd, badgeStart } = codeTimeline(durationInFrames, morphCue, testedCue);
  const p = interpolate(frame, [morphStart, morphEnd], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const enter = spring({ frame, fps, config: springs.snappy });
  const badge = spring({
    frame: frame - badgeStart,
    fps,
    config: springs.snappy,
  });

  const rows = interpolate(p, [0, 1], [layout.beforeRows, layout.afterRows]);
  const codeHeight = rows * rowHeight * scale;

  const showAfter = frame >= morphEnd;
  const tabLabel = filename ?? language;

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
      <div
        style={{
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [48, 0])}px)`,
          background: colors.card,
          borderRadius: 24,
          overflow: 'hidden',
          width: BOX_WIDTH,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            height: HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${CODE_CARD_PAD}px`,
            background: tint(colors.bg, 0.55),
            fontFamily: fontFamily.code,
            fontSize: 30,
            color: colors.textMuted,
          }}
        >
          <span
            style={{
              color: colors.text,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tabLabel}
          </span>
          <span style={{ color: showAfter ? colors.correct : colors.wrong, fontWeight: 700 }}>
            {showAfter ? 'after' : 'before'}
          </span>
        </div>
        <div style={{ padding: CODE_CARD_PAD }}>
          <div style={{ position: 'relative', height: codeHeight, width: innerWidth }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: virtualWidth,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              {layout.lines.map((line, index) => {
                const rowBefore = line.rowBefore ?? 0;
                const rowAfter = line.rowAfter ?? 0;
                let row: number;
                let opacity = 1;
                let tintPct = 0;
                let tintColor: string = colors.wrong;
                let dx = 0;
                if (line.kind === 'same') {
                  row = interpolate(range(p, 0.15, 0.85), [0, 1], [rowBefore, rowAfter]);
                } else if (line.kind === 'removed') {
                  row = rowBefore;
                  tintPct = 0.28 * range(p, 0, 0.2);
                  opacity = 1 - range(p, 0.2, 0.6);
                  dx = -40 * range(p, 0.2, 0.6);
                } else {
                  row = rowAfter;
                  tintColor = colors.correct;
                  const appear = range(p, 0.5, 1);
                  opacity = appear;
                  dx = 60 * (1 - appear);
                  tintPct = 0.28 * appear - 0.18 * range(frame, morphEnd, morphEnd + fps * 1.5);
                }
                return (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: row * rowHeight,
                      width: virtualWidth,
                      opacity,
                      transform: `translateX(${dx}px)`,
                      background: tint(tintColor, Math.max(0, tintPct)),
                      borderRadius: 8,
                      fontFamily: fontFamily.code,
                      fontSize,
                      lineHeight: `${rowHeight}px`,
                      whiteSpace: 'pre',
                      fontVariantLigatures: 'none',
                    }}
                  >
                    {line.rows.map((tokens, rowIndex) => (
                      <div key={rowIndex} style={{ height: rowHeight }}>
                        {tokens.length === 0
                          ? '​'
                          : tokens.map((token, tokenIndex) => (
                              <span key={tokenIndex} style={{ color: tokenColors[token.type] }}>
                                {token.text}
                              </span>
                            ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          opacity: badge,
          transform: `translateY(${interpolate(badge, [0, 1], [32, 0])}px)`,
          alignSelf: 'flex-start',
          maxWidth: BOX_WIDTH,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          fontFamily: fontFamily.code,
          fontWeight: 700,
          fontSize: 30,
          lineHeight: lineHeight.body,
          color: colors.bg,
          background: colors.correct,
          padding: `${spacing.xs}px ${spacing.md}px`,
          borderRadius: 16,
          boxSizing: 'border-box',
        }}
      >
        <span>{'✓ tested'}</span>
        <span
          style={{
            fontWeight: 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {baseName(testPath)}
        </span>
      </div>
    </div>
  );
};
