import type { ReactNode } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { colors, safeZone } from '../design/tokens';
import type { SafeZone } from '../design/tokens';
import { safeBox } from '../lib/safe-zone';

type Props = {
  children: ReactNode;
  /** Draw the safe zone outline and shade the unsafe margins. For debugging only. */
  debug?: boolean;
  insets?: SafeZone;
};

export const SafeZoneFrame: React.FC<Props> = ({ children, debug = false, insets = safeZone }) => {
  const { width, height } = useVideoConfig();
  const box = safeBox(insets, width, height);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
        }}
      >
        {children}
      </div>
      {debug ? (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              border: `3px dashed ${colors.wrong}`,
              boxShadow: '0 0 0 4000px rgba(243, 139, 168, 0.12)',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: box.x + 8,
              top: box.y + 6,
              color: colors.wrong,
              fontFamily: 'monospace',
              fontSize: 22,
            }}
          >
            safe zone {box.width}x{box.height}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
