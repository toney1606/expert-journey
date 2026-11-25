import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { CheckIcon, GlowBlob, Kicker, useDrift } from '../../components/ui/ui';
import { springs } from '../../design/springs';
import { CONTENT_BOX, colors, fontFamily, glow } from '../../design/tokens';
import { spokenFrames } from '../../lib/cues';
import {
  CHIP_ICON,
  CHIP_PAD,
  CHIP_SIZE,
  CLIENT_X,
  COUNTER_SIZE,
  GAP,
  HEADER_H,
  HERO_LINE,
  KICKER_H,
  LABEL_SIZE,
  MARKER_D,
  MARKER_SIZE,
  NODE_SIZE,
  SERVER_X,
  timeoutFlowLayout,
} from './layout';
import { TimeoutFlowPropsSchema } from './schema';
import type { TimeoutFlowScene } from './schema';
import { timeoutFlowCues } from './timeline';

/** Frames a packet needs to cross the diagram. */
const TRAVEL = 20;
/** Frames the timeout ring takes to fill. */
const RING_FRAMES = 42;
const RING_R = 38;
const LOST_REACH = 0.46;
const MARKER_X = 36;

const ease = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

const Cross: React.FC<{ x: number; y: number; r: number; color: string }> = ({
  x,
  y,
  r,
  color,
}) => (
  <g stroke={color} strokeWidth={14} strokeLinecap="round">
    <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
    <line x1={x + r} y1={y - r} x2={x - r} y2={y + r} />
  </g>
);

const Marker: React.FC<{ n: number; y: number; appear: number; color: string }> = ({
  n,
  y,
  appear,
  color,
}) => (
  <g
    opacity={Math.min(1, appear * 1.5)}
    transform={`translate(${MARKER_X} ${y}) scale(${0.5 + 0.5 * appear})`}
  >
    <circle r={MARKER_D / 2 - 2} fill={colors.card} stroke={color} strokeWidth={4} />
    <text
      y={MARKER_SIZE * 0.35}
      textAnchor="middle"
      fontSize={MARKER_SIZE}
      fontWeight={800}
      fill={color}
      style={{ fontFamily: fontFamily.title }}
    >
      {n}
    </text>
  </g>
);

const Arrow: React.FC<{
  y: number;
  fromX: number;
  toX: number;
  progress: number;
  color: string;
}> = ({ y, fromX, toX, progress, color }) => {
  const dir = Math.sign(toX - fromX);
  const tip = fromX + (toX - fromX) * progress;
  return (
    <g opacity={progress > 0 ? 1 : 0}>
      <line
        x1={fromX}
        y1={y}
        x2={tip - dir * 4}
        y2={y}
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <polygon
        points={`${tip},${y} ${tip - dir * 30},${y - 20} ${tip - dir * 30},${y + 20}`}
        fill={color}
      />
    </g>
  );
};

const Chip: React.FC<{
  y: number;
  width: number;
  label: string;
  color: string;
  appear: number;
  shake?: number;
}> = ({ y, width, label, color, appear, shake = 0 }) => {
  const h = CHIP_SIZE * 1.3 + 16;
  const right = CONTENT_BOX.width;
  return (
    <g
      opacity={Math.min(1, appear * 1.6)}
      transform={`translate(${right - width / 2 + shake} ${y}) scale(${0.7 + 0.3 * appear})`}
    >
      <rect
        x={-width / 2}
        y={-h / 2}
        width={width}
        height={h}
        rx={h / 2}
        fill={`color-mix(in srgb, ${color} 16%, ${colors.bg})`}
        stroke={color}
        strokeWidth={4}
      />
      <text
        x={-width / 2 + CHIP_PAD}
        y={CHIP_SIZE * 0.35}
        fontSize={CHIP_SIZE}
        fontWeight={800}
        fill={color}
        style={{ fontFamily: fontFamily.title }}
      >
        {label}
      </text>
      <g transform={`translate(${width / 2 - CHIP_PAD - CHIP_ICON} ${-CHIP_ICON / 2})`}>
        <CheckIcon size={CHIP_ICON} color={color} />
      </g>
    </g>
  );
};

export const TimeoutFlow: React.FC<{ scene: TimeoutFlowScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const props = TimeoutFlowPropsSchema.parse(scene.props);
  const layout = timeoutFlowLayout(props);
  const words = useSceneWords();
  const cues = timeoutFlowCues(
    spokenFrames(
      words,
      [
        props.requestAt,
        props.chargeAt,
        props.lostAt,
        props.timeoutAt,
        props.retryAt,
        props.chargeAgainAt,
        props.lessonAt,
      ],
      fps,
    ),
    durationInFrames,
  );
  const drift = useDrift(0.03);
  const enter = spring({ frame, fps, config: springs.snappy });
  const pop = (start: number): number =>
    spring({ frame: frame - start, fps, config: { ...springs.bouncy, mass: 1 } });
  const snap = (start: number): number =>
    spring({ frame: frame - start, fps, config: springs.snappy });

  const { rowHeight } = layout;
  const cy = (i: number): number => HEADER_H + rowHeight * (i + 0.5);
  const lifeTop = HEADER_H - 6;
  const lifeBottom = layout.diagramHeight;

  // Step 1: request packet.
  const reqP = ease((frame - cues.request) / TRAVEL);
  // Step 2: charge.
  const chargeAppear = pop(cues.charge);
  const serverPulse1 = Math.max(0, 1 - Math.abs(frame - cues.charge - 6) / 12);
  // Step 3: reply is lost.
  const lostP = ease((frame - cues.lost) / TRAVEL) * LOST_REACH;
  const lostX = SERVER_X + (CLIENT_X - SERVER_X) * lostP;
  const crossIn = pop(cues.lost + TRAVEL);
  const lessonPulse =
    frame >= cues.lesson ? Math.sin(Math.min(1, (frame - cues.lesson) / 24) * Math.PI) : 0;
  // Step 4: timeout ring.
  const ringP = ease((frame - cues.timeout) / RING_FRAMES);
  const ringIn = snap(cues.timeout);
  const ringColor = ringP >= 1 ? colors.wrong : colors.pending;
  const circ = 2 * Math.PI * RING_R;
  // Step 5: retry.
  const retryP = ease((frame - cues.retry) / TRAVEL);
  // Step 6: second charge.
  const againAppear = pop(cues.chargeAgain);
  const serverPulse2 = Math.max(0, 1 - Math.abs(frame - cues.chargeAgain - 6) / 12);
  const shakeT = frame - cues.chargeAgain;
  const shake = shakeT >= 0 && shakeT < 18 ? Math.sin(shakeT * 1.9) * 14 * (1 - shakeT / 18) : 0;
  const counterValue = frame >= cues.chargeAgain ? 2 : 1;
  const counterColor = counterValue === 2 ? colors.wrong : colors.correct;
  const counterIn = snap(cues.charge);
  const counterBump = frame >= cues.chargeAgain ? 1 + 0.25 * Math.max(0, 1 - shakeT / 14) : 1;

  const nodeW = 200;
  const nodeH = NODE_SIZE * 1.3 + 16;
  const node = (x: number, label: string, pulse: number, pulseColor: string): React.ReactNode => (
    <g transform={`translate(${x} ${HEADER_H / 2 - 4}) scale(${1 + 0.08 * pulse})`}>
      <rect
        x={-nodeW / 2}
        y={-nodeH / 2}
        width={nodeW}
        height={nodeH}
        rx={22}
        fill={colors.card}
        stroke={pulse > 0 ? pulseColor : colors.diagram}
        strokeWidth={4}
      />
      <text
        y={NODE_SIZE * 0.35}
        textAnchor="middle"
        fontSize={NODE_SIZE}
        fontWeight={800}
        fill={colors.text}
        style={{ fontFamily: fontFamily.title }}
      >
        {label}
      </text>
    </g>
  );
  const serverColor = frame >= cues.chargeAgain ? colors.wrong : colors.correct;

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
      }}
    >
      <GlowBlob color={colors.accent} opacity={0.14} style={{ top: '14%' }} />
      {props.kicker ? (
        <Kicker {...props.kicker} tone="accent" />
      ) : (
        <div style={{ height: KICKER_H }} />
      )}
      <div
        style={{
          textAlign: 'center',
          fontSize: layout.heroSize,
          lineHeight: HERO_LINE,
          fontWeight: 800,
          color: colors.text,
          whiteSpace: 'nowrap',
          opacity: enter,
          transform: `scale(${drift * interpolate(enter, [0, 1], [0.85, 1])})`,
        }}
      >
        <RichText text={props.hero} glow />
      </div>
      <svg
        width={CONTENT_BOX.width}
        height={layout.diagramHeight}
        viewBox={`0 0 ${CONTENT_BOX.width} ${layout.diagramHeight}`}
        style={{ overflow: 'visible', opacity: enter }}
      >
        {[CLIENT_X, SERVER_X].map((x) => (
          <line
            key={x}
            x1={x}
            y1={lifeTop}
            x2={x}
            y2={lifeBottom}
            stroke={colors.diagram}
            strokeOpacity={0.35}
            strokeWidth={5}
            strokeDasharray="4 14"
            strokeLinecap="round"
          />
        ))}
        {node(CLIENT_X, props.clientLabel, 0, colors.diagram)}
        {node(SERVER_X, props.serverLabel, Math.max(serverPulse1, serverPulse2), serverColor)}

        {/* Counter between the two boxes. */}
        <g
          opacity={Math.min(1, counterIn * 1.5)}
          transform={`translate(${(CLIENT_X + SERVER_X) / 2 + shake} ${HEADER_H / 2 - 4}) scale(${counterBump})`}
        >
          <text
            textAnchor="middle"
            y={COUNTER_SIZE * 0.35}
            fontSize={COUNTER_SIZE}
            fontWeight={800}
            fill={counterColor}
            style={{ fontFamily: fontFamily.title, textShadow: glow(counterColor) }}
          >
            {props.counterLabel} {counterValue}
          </text>
        </g>

        {/* 1: request */}
        <Marker n={1} y={cy(0)} appear={snap(cues.request)} color={colors.diagram} />
        <g opacity={Math.min(1, snap(cues.request) * 1.5)}>
          <text
            x={(CLIENT_X + SERVER_X) / 2}
            y={cy(0) - 26}
            textAnchor="middle"
            fontSize={LABEL_SIZE}
            fontWeight={800}
            fill={colors.text}
            style={{ fontFamily: fontFamily.title }}
          >
            {props.requestLabel}
          </text>
        </g>
        <Arrow y={cy(0)} fromX={CLIENT_X} toX={SERVER_X} progress={reqP} color={colors.diagram} />
        {reqP > 0 && reqP < 1 ? (
          <circle
            cx={CLIENT_X + (SERVER_X - CLIENT_X) * reqP}
            cy={cy(0)}
            r={20}
            fill={colors.text}
          />
        ) : null}

        {/* 2: server charges */}
        <Marker n={2} y={cy(1)} appear={snap(cues.charge)} color={colors.correct} />
        <Chip
          y={cy(1)}
          width={layout.chipWidths.charge}
          label={props.chargeLabel}
          color={colors.correct}
          appear={chargeAppear}
        />

        {/* 3: reply lost */}
        <Marker n={3} y={cy(2)} appear={snap(cues.lost)} color={colors.wrong} />
        <g opacity={Math.min(1, snap(cues.lost) * 1.5)}>
          <text
            x={(CLIENT_X + SERVER_X) / 2}
            y={cy(2) - 52}
            textAnchor="middle"
            fontSize={LABEL_SIZE}
            fontWeight={800}
            fill={colors.wrong}
            style={{ fontFamily: fontFamily.title }}
          >
            {props.lostLabel}
          </text>
          <line
            x1={SERVER_X}
            y1={cy(2)}
            x2={CLIENT_X}
            y2={cy(2)}
            stroke={colors.wrong}
            strokeOpacity={0.28}
            strokeWidth={6}
            strokeDasharray="2 16"
            strokeLinecap="round"
          />
        </g>
        <Arrow
          y={cy(2)}
          fromX={SERVER_X}
          toX={lostX}
          progress={lostP > 0 ? 1 : 0}
          color={colors.wrong}
        />
        {lostP > 0 ? (
          <g transform={`translate(${lostX} ${cy(2)}) scale(${1 + 0.35 * lessonPulse})`}>
            <g opacity={crossIn > 0.05 ? Math.min(1, crossIn) : 0} transform={`scale(${crossIn})`}>
              <circle r={36} fill={colors.card} stroke={colors.wrong} strokeWidth={4} />
              <Cross x={0} y={0} r={15} color={colors.wrong} />
            </g>
          </g>
        ) : null}

        {/* 4: timeout ring on the client side */}
        <Marker n={4} y={cy(3)} appear={snap(cues.timeout)} color={colors.pending} />
        <g
          opacity={Math.min(1, ringIn * 1.5)}
          transform={`translate(${CLIENT_X} ${cy(3)}) scale(${0.6 + 0.4 * ringIn})`}
        >
          <circle r={RING_R + 14} fill={colors.card} />
          <circle r={RING_R} fill="none" stroke={colors.border} strokeWidth={12} />
          <circle
            r={RING_R}
            fill="none"
            stroke={ringColor}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${circ * ringP} ${circ}`}
            transform="rotate(-90)"
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={-RING_R + 12}
            stroke={ringColor}
            strokeWidth={7}
            strokeLinecap="round"
            transform={`rotate(${ringP * 360})`}
          />
        </g>
        <text
          x={CLIENT_X + RING_R + 42}
          y={cy(3) + LABEL_SIZE * 0.35}
          fontSize={LABEL_SIZE}
          fontWeight={800}
          fill={ringColor}
          opacity={Math.min(1, ringIn * 1.5)}
          style={{ fontFamily: fontFamily.title }}
        >
          {props.timeoutLabel}
        </text>

        {/* 5: retry */}
        <Marker n={5} y={cy(4)} appear={snap(cues.retry)} color={colors.diagram} />
        <g opacity={Math.min(1, snap(cues.retry) * 1.5)}>
          <text
            x={(CLIENT_X + SERVER_X) / 2}
            y={cy(4) - 26}
            textAnchor="middle"
            fontSize={LABEL_SIZE}
            fontWeight={800}
            fill={colors.text}
            style={{ fontFamily: fontFamily.title }}
          >
            {props.retryLabel}
          </text>
        </g>
        <Arrow y={cy(4)} fromX={CLIENT_X} toX={SERVER_X} progress={retryP} color={colors.diagram} />
        {retryP > 0 && retryP < 1 ? (
          <circle
            cx={CLIENT_X + (SERVER_X - CLIENT_X) * retryP}
            cy={cy(4)}
            r={20}
            fill={colors.text}
          />
        ) : null}

        {/* 6: second charge */}
        <Marker n={6} y={cy(5)} appear={snap(cues.chargeAgain)} color={colors.wrong} />
        <Chip
          y={cy(5)}
          width={layout.chipWidths.again}
          label={props.chargeAgainLabel}
          color={colors.wrong}
          appear={againAppear}
          shake={shake}
        />
      </svg>
    </div>
  );
};
