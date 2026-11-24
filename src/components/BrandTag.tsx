import { CHANNEL_NAME } from '../design/brand';
import { colors, fontFamily, glow, safeZone } from '../design/tokens';

/** Small channel name at the top-left, above the step row (inside the left safe margin, clear of the TikTok tabs). */
export const BrandTag: React.FC = () => {
  const words = CHANNEL_NAME.split(' ');
  const last = words[words.length - 1] ?? '';
  return (
    <div
      style={{
        position: 'absolute',
        left: safeZone.left,
        top: 120,
        fontFamily: fontFamily.title,
        fontWeight: 800,
        fontSize: 40,
        letterSpacing: 1,
        color: colors.textMuted,
      }}
    >
      {words.slice(0, -1).join(' ')}{' '}
      <span style={{ color: colors.accent, textShadow: glow(colors.accent) }}>{last}</span>
    </div>
  );
};
