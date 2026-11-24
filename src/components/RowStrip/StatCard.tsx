import { colors, fontFamily } from '../../design/tokens';
import { GlassCard } from '../ui/ui';

type StatCardProps = {
  label: string;
  value: string;
  valueSize?: number;
  labelSize?: number;
  color?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** Vertical padding of the card (the GlassCard default is 28 top + 28 bottom). */
export const STAT_PAD_Y = 22;

/** The statistics card ("Thống kê: 5%"). It is always drawn with the same value: statistics never change. */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  valueSize = 150,
  labelSize = 44,
  color = colors.diagram,
  style,
  children,
}) => (
  <GlassCard
    tone="neutral"
    glow={0.5}
    style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${STAT_PAD_Y}px 28px`,
      borderColor: color,
      ...style,
    }}
  >
    <div
      style={{
        fontFamily: fontFamily.title,
        fontSize: labelSize,
        fontWeight: 700,
        lineHeight: 1.3,
        color: colors.textMuted,
        textAlign: 'center',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: fontFamily.title,
        fontSize: valueSize,
        fontWeight: 800,
        lineHeight: 1.1,
        color,
        textShadow: `0 0 40px ${color}66`,
      }}
    >
      {value}
    </div>
    {children}
  </GlassCard>
);
