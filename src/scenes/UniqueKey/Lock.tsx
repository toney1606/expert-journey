/** Padlock icon (24-unit grid, stroke only), local to this scene. */
export const LOCK_PATHS = [
  'M7 10.5V8a5 5 0 0 1 10 0v2.5',
  'M5.5 10.5h13v10h-13z',
  'M12 14.5v2.5',
] as const;

export const Lock: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {LOCK_PATHS.map((d) => (
      <path
        key={d}
        d={d}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
  </svg>
);
