import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { RichText } from '../../components/RichText';
import { useSceneWords } from '../../components/SceneTiming';
import { GlowBlob, Kicker, useBounceEnter, useDrift, useEnter } from '../../components/ui/ui';
import { colors, fontFamily, glow } from '../../design/tokens';
import { springs } from '../../design/springs';
import { spokenFrames } from '../../lib/cues';
import {
  ARROW_ROW_H,
  BAND_H,
  CHIP_PAD_X,
  CHIP_PAD_Y,
  CHIP_SIZE,
  CLIENT_W,
  COUNTER_NUM,
  GAP,
  HERO_LINE,
  LANE_H,
  LANE_PAD,
  LANE_PAD_X,
  PACKET_H,
  PACKET_PAD_X,
  PACKET_SIZE,
  ROW_GAP,
  SERVER_W,
  TEXT,
  TEXT_LINE,
  idemKeyLayout,
} from './layout';
import { IdemKeyPropsSchema } from './schema';
import type { IdemKeyScene } from './schema';
import { HERO_LINE_DELAY, SPARKS, TRAVEL_FRAMES, idemKeyCues } from './timeline';

const ROW_H = Math.ceil(TEXT * TEXT_LINE);
const mix = (c: string, pct: number): string => `color-mix(in srgb, ${c} ${pct}%, ${colors.bg})`;

const rowStyle: React.CSSProperties = {
  height: ROW_H,
  display: 'flex',
  alignItems: 'center',
  fontSize: TEXT,
  lineHeight: TEXT_LINE,
  fontWeight: 800,
  whiteSpace: 'nowrap',
};

/** Pill holding the key (mono, yellow outline): the same chip rides every packet. */
const Packet: React.FC<{ value: string; style?: React.CSSProperties }> = ({ value, style }) => (
  <div
    style={{
      position: 'absolute',
      top: (ARROW_ROW_H - PACKET_H) / 2,
      height: PACKET_H,
      display: 'flex',
      alignItems: 'center',
      padding: `0 ${PACKET_PAD_X}px`,
      boxSizing: 'border-box',
      borderRadius: 18,
      border: `3px solid ${colors.accent}`,
      background: mix(colors.accent, 16),
      boxShadow: `0 0 28px ${colors.accent}66`,
      fontFamily: fontFamily.code,
      fontWeight: 800,
      fontSize: PACKET_SIZE,
      color: colors.accent,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {value}
  </div>
);

const Arrowhead: React.FC<{ color: string; dir: 'left' | 'right' }> = ({ color, dir }) => (
  <svg
    width={34}
    height={44}
    viewBox="0 0 34 44"
    style={{ transform: dir === 'left' ? 'scaleX(-1)' : undefined, flex: 'none' }}
  >
    <path d="M2 4 L32 22 L2 40 Z" fill={color} />
  </svg>
);

const Box: React.FC<{ width: number; label: string; tone: string; children?: React.ReactNode }> = ({
  width,
  label,
  tone,
  children,
}) => (
  <div
    style={{
      position: 'relative',
      zIndex: 2,
      width,
      height: ARROW_ROW_H,
      flex: 'none',
      boxSizing: 'border-box',
      borderRadius: 22,
      background: colors.card,
      border: `3px solid ${mix(tone, 70)}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: TEXT,
      fontWeight: 800,
      lineHeight: TEXT_LINE,
    }}
  >
    {label}
    {children}
  </div>
);

const Lane: React.FC<{
  appear: number;
  tone: string;
  header: React.ReactNode;
  headerRight?: React.ReactNode;
  arrow: React.ReactNode;
  third: React.ReactNode;
  fourth: React.ReactNode;
  serverChildren?: React.ReactNode;
}> = ({ appear, tone, header, headerRight, arrow, third, fourth, serverChildren }) => (
  <div
    style={{
      height: LANE_H,
      boxSizing: 'border-box',
      padding: `${LANE_PAD}px ${LANE_PAD_X}px`,
      borderRadius: 28,
      background: colors.card,
      border: `2px solid ${mix(tone, 45)}`,
      display: 'flex',
      flexDirection: 'column',
      gap: ROW_GAP,
      opacity: Math.min(1, appear * 1.4),
      transform: `translateY(${interpolate(appear, [0, 1], [40, 0])}px)`,
      textAlign: 'left',
    }}
  >
    <div style={{ ...rowStyle, justifyContent: 'space-between' }}>
      <div>{header}</div>
      {headerRight}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', height: ARROW_ROW_H }}>
      <Box width={CLIENT_W} label="Client" tone={colors.diagram} />
      <div style={{ position: 'relative', flex: 1, height: ARROW_ROW_H }}>{arrow}</div>
      <Box width={SERVER_W} label="Server" tone={colors.diagram}>
        {serverChildren}
      </Box>
    </div>
    <div style={rowStyle}>{third}</div>
    <div style={rowStyle}>{fourth}</div>
  </div>
);

export const IdemKey: React.FC<{ scene: IdemKeyScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const props = IdemKeyPropsSchema.parse(scene.props);
  const layout = idemKeyLayout(props);
  const words = useSceneWords();
  const cues = idemKeyCues(
    spokenFrames(
      words,
      [
        props.heroAt,
        props.lanesAt,
        props.chipAt,
        props.sendAt,
        props.retryAt,
        props.saveAt,
        props.stampAt,
        props.noChargeAt,
        props.returnAt,
      ],
      fps,
    ),
    durationInFrames,
  );
  const drift = useDrift(0.03);
  const heroIn = (i: number): number =>
    spring({
      frame: frame - cues.hero - i * HERO_LINE_DELAY,
      fps,
      config: { ...springs.bouncy, mass: 1 },
    });
  const lane1In = useEnter(cues.lanes, springs.snappy);
  const lane2In = useEnter(cues.lanes + 6, springs.snappy);
  const chip = useBounceEnter(cues.chip);
  const sinceChip = frame - cues.chip;
  const spark = interpolate(sinceChip, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const placeholder = interpolate(frame - cues.lanes, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const travel = (start: number, delay = 0): number =>
    interpolate(frame - start - delay, [0, TRAVEL_FRAMES], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => 1 - (1 - t) ** 3,
    });
  const packetW = layout.packetWidth;
  // Zone width = box - lane padding - client - server (the arrow zone is flex:1).
  const zoneW = 830 - 2 * LANE_PAD_X - CLIENT_W - SERVER_W;
  const packetLeft = (t: number): number =>
    interpolate(t, [0, 1], [20 - CLIENT_W, zoneW + SERVER_W - packetW - 10]);
  // Packets slip behind the server box and vanish.
  const packetFade = (t: number): number => 1 - Math.min(1, Math.max(0, (t - 0.88) / 0.12));
  const packetOpacity = (start: number, t: number): number =>
    (frame >= start ? 1 : 0) * packetFade(t);

  const saved = spring({ frame: frame - cues.save, fps, config: { ...springs.bouncy, mass: 1 } });
  const ledgerIn = useEnter(cues.save, springs.snappy);
  const stampT = spring({
    frame: frame - cues.stamp,
    fps,
    config: { damping: 9, stiffness: 260, mass: 0.8 },
  });
  const sinceStamp = frame - cues.stamp;
  const shake =
    sinceStamp >= 0 && sinceStamp < 12
      ? 9 * Math.exp(-sinceStamp / 3) * Math.sin(sinceStamp * 2.1)
      : 0;
  const noChargeIn = useBounceEnter(cues.noCharge);
  const back = interpolate(frame - cues.back, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const note1 = useEnter(cues.send, springs.snappy);
  const note2 = useEnter(cues.stamp, springs.snappy);
  const outcome1 = useEnter(cues.save + 6, springs.snappy);
  const retryBadgeIn = useBounceEnter(cues.retry + 4);

  const keyText = props.keyValue;
  const arrowLine = (color: string, t: number): React.ReactNode => (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 28,
        top: ARROW_ROW_H / 2 - 3,
        height: 6,
        borderRadius: 3,
        background: `linear-gradient(90deg, ${color}, ${mix(color, 55)})`,
        opacity: 0.25 + 0.5 * t,
        boxShadow: `0 0 14px ${color}55`,
      }}
    />
  );
  const arrowHead = (color: string): React.ReactNode => (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: (ARROW_ROW_H - 44) / 2,
        opacity: 0.6,
        zIndex: 1,
      }}
    >
      <Arrowhead color={color} dir="right" />
    </div>
  );

  const t1 = travel(cues.send);
  const t2 = travel(cues.retry);

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
        textAlign: 'center',
        color: colors.text,
      }}
    >
      <GlowBlob color={colors.accent} opacity={0.2} style={{ top: '34%' }} />
      {props.kicker ? <Kicker {...props.kicker} tone="accent" /> : <div style={{ height: 64 }} />}
      {/* Hero: huge headline, fit-to-width. */}
      <div style={{ transform: `scale(${drift})`, transformOrigin: 'center top' }}>
        {props.hero.map((line, i) => {
          const p = heroIn(i);
          return (
            <div
              key={line}
              style={{
                fontSize: layout.heroSizes[i],
                lineHeight: HERO_LINE,
                fontWeight: 800,
                whiteSpace: 'nowrap',
                opacity: Math.min(1, p * 1.5),
                transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
                textShadow: i === 0 ? glow(colors.accent) : 'none',
              }}
            >
              <RichText text={line} />
            </div>
          );
        })}
      </div>
      {/* Band: generated key chip (left) and the "charged" counter (right). */}
      <div style={{ height: BAND_H, display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <div style={{ position: 'relative', width: layout.chipWidth, flex: 'none' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 26,
              border: `3px dashed ${colors.textMuted}`,
              opacity: placeholder * (1 - Math.min(1, chip * 1.2)) * 0.6,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              boxSizing: 'border-box',
              borderRadius: 26,
              padding: `${CHIP_PAD_Y}px ${CHIP_PAD_X}px`,
              border: `3px solid ${colors.accent}`,
              background: mix(colors.accent, 14),
              boxShadow: `0 0 ${24 + 40 * (1 - spark)}px ${colors.accent}88`,
              fontFamily: fontFamily.code,
              fontSize: CHIP_SIZE,
              fontWeight: 800,
              lineHeight: 1.4,
              textAlign: 'left',
              color: colors.accent,
              opacity: Math.min(1, chip * 1.6),
              transform: `scale(${interpolate(chip, [0, 1], [0.4, 1])})`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              textShadow: glow(colors.accent),
            }}
          >
            <span style={{ color: colors.text, textShadow: 'none' }}>{props.keyLabel}</span>
            <span>{keyText}</span>
          </div>
          {SPARKS.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 14,
                height: 14,
                marginLeft: -7,
                marginTop: -7,
                borderRadius: '50%',
                background: colors.accent,
                boxShadow: `0 0 16px ${colors.accent}`,
                opacity: sinceChip < 0 ? 0 : (1 - spark) * 0.95,
                transform: `translate(${Math.cos(s.angle) * s.reach * (150 + 230 * spark)}px, ${Math.sin(s.angle) * s.reach * (70 + 110 * spark)}px) scale(${1 - 0.5 * spark})`,
              }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            borderRadius: 26,
            border: `2px solid ${mix(colors.correct, 45)}`,
            background: colors.card,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: placeholder,
          }}
        >
          <div
            style={{
              fontSize: TEXT,
              fontWeight: 700,
              lineHeight: TEXT_LINE,
              color: colors.textMuted,
            }}
          >
            {props.counterLabel}
          </div>
          <div
            style={{
              fontSize: COUNTER_NUM,
              lineHeight: 1,
              fontWeight: 800,
              color: colors.correct,
              textShadow: glow(colors.correct),
              transform: `scale(${1 + 0.25 * Math.max(0, saved - 1) + (saved < 1 ? 0 : 0)})`,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {frame >= cues.save + 3 ? '1' : '0'}
          </div>
        </div>
      </div>
      {/* Lane 1: first attempt, key unknown, charged and stored. */}
      <Lane
        appear={lane1In}
        tone={colors.correct}
        header={
          <>
            {props.lane1.title}
            <span
              style={{ opacity: note1, color: colors.textMuted }}
            >{` → ${props.lane1.note}`}</span>
          </>
        }
        arrow={
          <>
            {arrowLine(colors.diagram, t1)}
            {arrowHead(colors.diagram)}
            <Packet
              value={keyText}
              style={{
                width: packetW,
                left: packetLeft(t1),
                opacity: packetOpacity(cues.send, t1),
              }}
            />
          </>
        }
        third={
          <div
            style={{
              fontFamily: fontFamily.code,
              fontSize: TEXT,
              color: colors.correct,
              opacity: Math.min(1, ledgerIn * 1.4),
              transform: `translateX(${interpolate(ledgerIn, [0, 1], [-40, 0])}px)`,
            }}
          >
            {props.lane1.ledger}
          </div>
        }
        fourth={
          <div
            style={{
              color: colors.correct,
              opacity: Math.min(1, outcome1 * 1.4),
              transform: `translateX(${interpolate(outcome1, [0, 1], [-40, 0])}px)`,
            }}
          >
            {props.lane1.outcome}
          </div>
        }
      />
      {/* Lane 2: retry with the SAME key, server recognises it and returns the old result. */}
      <Lane
        appear={lane2In}
        tone={colors.correct}
        header={
          <>
            {props.lane2.title}
            <span
              style={{ opacity: note2, color: colors.textMuted }}
            >{` → ${props.lane2.note}`}</span>
          </>
        }
        headerRight={
          <div
            style={{
              fontFamily: fontFamily.code,
              color: colors.accent,
              transform: `scale(${retryBadgeIn})`,
              opacity: Math.min(1, retryBadgeIn),
            }}
          >
            {props.retryBadge}
          </div>
        }
        arrow={
          <>
            {arrowLine(colors.diagram, t2)}
            {arrowHead(colors.diagram)}
            {[2, 1].map((n) => (
              <Packet
                key={n}
                value={keyText}
                style={{
                  width: packetW,
                  left: packetLeft(travel(cues.retry, n * 4)),
                  top: (ARROW_ROW_H - PACKET_H) / 2 - n * 11,
                  opacity:
                    (frame >= cues.retry + n * 4 ? 1 : 0) *
                    (0.45 - n * 0.1) *
                    packetFade(travel(cues.retry, n * 4)),
                  zIndex: 0,
                }}
              />
            ))}
            <Packet
              value={keyText}
              style={{
                width: packetW,
                left: packetLeft(t2),
                opacity: packetOpacity(cues.retry, t2),
                zIndex: 1,
              }}
            />
          </>
        }
        serverChildren={
          <div
            style={{
              position: 'absolute',
              left: '30%',
              top: '50%',
              padding: '0 14px',
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              color: colors.correct,
              background: mix(colors.correct, 24),
              border: `5px solid ${colors.correct}`,
              borderRadius: 14,
              boxShadow: `0 0 30px ${colors.correct}77`,
              opacity: Math.min(1, stampT * 2),
              transform: `translate(calc(-50% + ${shake}px), -50%) rotate(${-9 * Math.min(1, stampT)}deg) scale(${interpolate(stampT, [0, 1], [2.6, 1])})`,
            }}
          >
            {props.lane2.stamp}
          </div>
        }
        third={
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <div style={{ width: CLIENT_W / 2, flex: 'none' }} />
            <div
              style={{
                position: 'relative',
                flex: 1,
                height: ROW_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: ROW_H / 2 - 3,
                  height: 6,
                  width: `${back * 100}%`,
                  background: colors.correct,
                  borderRadius: 3,
                  boxShadow: `0 0 14px ${colors.correct}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: (ROW_H - 44) / 2,
                  opacity: back > 0.9 ? 1 : 0,
                }}
              >
                <Arrowhead color={colors.correct} dir="left" />
              </div>
              <div
                style={{
                  position: 'relative',
                  padding: '0 18px',
                  background: colors.card,
                  color: colors.correct,
                  opacity: back,
                }}
              >
                {props.lane2.returnText}
              </div>
            </div>
            <div style={{ width: SERVER_W / 2, flex: 'none' }} />
          </div>
        }
        fourth={
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              color: colors.correct,
              opacity: Math.min(1, noChargeIn * 1.4),
              transform: `scale(${noChargeIn})`,
              transformOrigin: 'left center',
            }}
          >
            {props.lane2.outcome}
          </div>
        }
      />
    </div>
  );
};
