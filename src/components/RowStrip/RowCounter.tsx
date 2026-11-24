import { colors, fontFamily } from '../../design/tokens';
import { formatNumber } from './format';

/** Digits in equal-width slots so a ticking counter never changes width. */
const slotWidth = (ch: string): number => (/\d/.test(ch) ? 0.66 : ch === '~' ? 0.56 : 0.28);

/** Rough pixel width of a counter string (shared with layout checks). */
export const counterWidth = (text: string, size: number): number =>
  [...text].reduce((sum, ch) => sum + size * slotWidth(ch), 0);

/** Size of the small label above the hero number. */
export const COUNTER_LABEL_SIZE = 56;
/** Line heights used for the hero number and its label (layout checks use the same numbers). */
export const COUNTER_NUMBER_LH = 1.2;
export const COUNTER_LABEL_LH = 1.3;

/** Height of a RowCounter: label line + number line. */
export const counterHeight = (size: number): number =>
  Math.ceil(COUNTER_LABEL_SIZE * COUNTER_LABEL_LH + size * COUNTER_NUMBER_LH);

type RowCounterProps = {
  /** Text above the number, e.g. "đã đọc". */
  label: string;
  value: number;
  /** Shown before the number, e.g. "~". */
  prefix?: string;
  size: number;
  /** Final value, used to reserve the width so the number does not jump while counting. */
  finalValue?: number;
  color?: string;
  opacity?: number;
  scale?: number;
};

/** The hero counter: small label on top, huge glowing number below, centred. */
export const RowCounter: React.FC<RowCounterProps> = ({
  label,
  value,
  prefix = '',
  size,
  finalValue,
  color = colors.correct,
  opacity = 1,
  scale = 1,
}) => {
  const text = `${prefix}${formatNumber(value)}`;
  const reserved = `${prefix}${formatNumber(finalValue ?? value)}`;
  const padded = text.padStart(reserved.length, ' ');
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        fontFamily: fontFamily.title,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <span
        style={{
          fontSize: COUNTER_LABEL_SIZE,
          fontWeight: 700,
          lineHeight: COUNTER_LABEL_LH,
          color: colors.text,
        }}
      >
        {label}
      </span>
      <span style={{ display: 'inline-flex', fontWeight: 800, color }}>
        {[...padded].map((ch, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: `${slotWidth(ch === ' ' ? '0' : ch)}em`,
              textAlign: 'center',
              fontSize: size,
              lineHeight: COUNTER_NUMBER_LH,
              visibility: ch === ' ' ? 'hidden' : 'visible',
              textShadow: `0 0 36px ${color}88, 0 0 90px ${color}44`,
            }}
          >
            {ch}
          </span>
        ))}
      </span>
    </div>
  );
};
