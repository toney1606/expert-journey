import { colors, fontFamily, lineHeight } from '../design/tokens';

/** Shown for scene types whose component is not implemented yet. */
export const ScenePlaceholder: React.FC<{ type: string; voice: string }> = ({ type, voice }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 32,
      fontFamily: fontFamily.title,
      color: colors.textMuted,
    }}
  >
    <div style={{ fontFamily: fontFamily.code, fontSize: 40, color: colors.diagram }}>
      scene: {type} (not implemented)
    </div>
    <div style={{ fontSize: 44, lineHeight: lineHeight.body }}>{voice}</div>
  </div>
);
