import { colors, fontFamily, safeZone } from '../../design/tokens';
import {
  AXIS_FONT,
  AXIS_ROW_HEIGHT,
  FLOAT_ROW_HEIGHT,
  STRIP_BLEED,
  TRAIL_CELLS,
  cellOrigin,
  stripGeometry,
} from './layout';
import { cellState, easeInOutCubic, staggerProgress } from './motion';

export type RowStripProps = {
  width?: number;
  cols?: number;
  rows?: number;
  /** Pending (orange) cells before the move, as read-order indexes sorted ascending. */
  pendingFrom: readonly number[];
  /** Pending cells after the move (defaults to `pendingFrom`). */
  pendingTo?: readonly number[];
  /** 0..1: orange cells slide from `pendingFrom` to `pendingTo`. */
  morph?: number;
  /** 0..1: orange cells pop in one after another. */
  appear?: number;
  /** Fractional read-order index of the cursor; null hides it. */
  cursor?: number | null;
  /** First index the cursor reads (cells before it are never touched). */
  readStart?: number;
  /** Floating label above the cursor while it passes non-pending cells (e.g. "bỏ"); null hides it. */
  skipLabel?: string | null;
  /** Colour of the cursor trail and of the floating label. */
  trailColor?: string;
  /** Shown left in the row above the band (e.g. the orange "5% = đơn chờ" legend). */
  legend?: React.ReactNode;
  oldLabel?: string;
  newLabel?: string;
};

/** Puts the strip in a wrapper that bleeds over the side margins (the band is the full video width). */
export const StripBleed: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => <div style={{ marginLeft: -STRIP_BLEED, ...style }}>{children}</div>;

/**
 * The orders table as one wide band of cells (a few hundred cells stand for millions of rows): OLD on the
 * left, NEW on the right. A glowing cursor walks right to left leaving a fading trail. Pure function of its
 * props, so every scene draws exactly the same table.
 */
export const RowStrip: React.FC<RowStripProps> = ({
  width,
  cols,
  rows,
  pendingFrom,
  pendingTo,
  morph = 0,
  appear = 1,
  cursor = null,
  readStart = 0,
  skipLabel = null,
  trailColor = colors.diagram,
  legend = null,
  oldLabel = 'CŨ',
  newLabel = 'MỚI',
}) => {
  const g = stripGeometry(width, cols, rows);
  const to = pendingTo ?? pendingFrom;
  const settled = morph >= 1;
  const active = settled ? to : pendingFrom;
  const activeSet = new Set(active);
  const n = pendingFrom.length;
  const radius = Math.round(g.cell * 0.24);
  const head = cursor === null ? -1 : Math.floor(cursor);

  const cells = Array.from({ length: g.total }, (_, i) => {
    const state = cellState(i, activeSet, readStart, cursor);
    const { x, y } = cellOrigin(i, g);
    const age = head - i;
    const warm = state === 'skipped' ? Math.max(0, 1 - age / TRAIL_CELLS) : 0;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: g.cell,
          height: g.cell,
          borderRadius: radius,
          background: state === 'skipped' ? (warm > 0 ? trailColor : colors.textMuted) : '#262626',
          opacity: state === 'skipped' ? 0.2 + 0.7 * warm : 1,
          boxShadow:
            warm > 0.4
              ? `0 0 ${Math.round(22 * warm)}px color-mix(in srgb, ${trailColor} 70%, transparent)`
              : undefined,
        }}
      />
    );
  });

  const tokens = pendingFrom.map((from, k) => {
    const pop = staggerProgress(appear, k, n, 0.6);
    if (pop <= 0) return null;
    const move = easeInOutCubic(staggerProgress(morph, k, n, 0.45));
    const target = to[k] ?? from;
    const a = cellOrigin(from, g);
    const b = cellOrigin(target, g);
    const index = settled ? target : from;
    const collected = cellState(index, activeSet, readStart, cursor) === 'collected';
    const color = collected ? colors.correct : colors.pending;
    const bump = collected ? Math.max(0, 1 - (head - index) / 5) : 0;
    return (
      <div
        key={k}
        style={{
          position: 'absolute',
          left: a.x + (b.x - a.x) * move,
          top: a.y + (b.y - a.y) * move,
          width: g.cell,
          height: g.cell,
          borderRadius: radius,
          background: color,
          boxShadow: `0 0 ${collected ? 26 : 16}px ${color}, inset 0 0 0 3px rgba(255,255,255,0.28)`,
          transform: `scale(${(0.2 + 0.8 * pop) * (1 + 0.3 * bump)})`,
          opacity: pop,
          zIndex: 2,
        }}
      />
    );
  });

  const cursorX = cursor === null ? 0 : (g.cols - cursor / g.rows) * g.pitch;
  const trailWidth = TRAIL_CELLS * 0.5 * g.pitch;
  const cursorIndex = head;
  const showLabel =
    skipLabel !== null &&
    cursor !== null &&
    cellState(cursorIndex, activeSet, readStart, cursor) === 'skipped';
  const labelWidth = 150;

  return (
    <div style={{ position: 'relative', width: g.width }}>
      <div
        style={{
          position: 'relative',
          height: FLOAT_ROW_HEIGHT,
          fontFamily: fontFamily.title,
        }}
      >
        {legend ? (
          <div style={{ position: 'absolute', left: 0, bottom: 0, paddingLeft: STRIP_BLEED }}>
            {legend}
          </div>
        ) : null}
        {showLabel ? (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: Math.max(0, Math.min(g.width - labelWidth, cursorX - labelWidth / 2)),
              width: labelWidth,
              textAlign: 'center',
              fontWeight: 800,
              fontSize: 48,
              lineHeight: 1.2,
              color: colors.wrong,
              textShadow: `0 0 18px ${colors.wrong}`,
            }}
          >
            {skipLabel}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'relative',
          width: g.width,
          height: g.height,
          background: 'linear-gradient(180deg, rgba(17,17,27,0.55), rgba(17,17,27,0.3))',
          borderTop: `2px solid ${colors.card}`,
          borderBottom: `2px solid ${colors.card}`,
          boxSizing: 'content-box',
        }}
      >
        {cursor !== null ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: cursorX,
              width: trailWidth,
              height: g.height,
              background: `linear-gradient(90deg, color-mix(in srgb, ${trailColor} 38%, transparent), transparent)`,
              zIndex: 1,
            }}
          />
        ) : null}
        {cells}
        {tokens}
        {cursor !== null ? (
          <>
            <div
              style={{
                position: 'absolute',
                top: -14,
                left: cursorX - 5,
                width: 10,
                height: g.height + 28,
                borderRadius: 5,
                background: '#ffffff',
                boxShadow: `0 0 18px 4px ${trailColor}, 0 0 46px 10px color-mix(in srgb, ${trailColor} 60%, transparent)`,
                zIndex: 3,
              }}
            />
          </>
        ) : null}
      </div>
      <div
        style={{
          height: AXIS_ROW_HEIGHT,
          padding: `0 ${safeZone.right}px 0 ${STRIP_BLEED}px`,
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: fontFamily.title,
          fontWeight: 800,
          letterSpacing: 2,
          fontSize: AXIS_FONT,
          color: colors.textMuted,
        }}
      >
        <span>{`← ${oldLabel}`}</span>
        <span>{`${newLabel} →`}</span>
      </div>
    </div>
  );
};
