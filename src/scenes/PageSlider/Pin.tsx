/** Push-pin icon (24-unit grid, stroke only), local to this scene. */
export const PIN_PATHS = ['M12 16.5V22', 'M9 3.5h6l-1 5.5 3.2 3.2v2.3H6.8v-2.3L10 9z'] as const;

export const Pin: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {PIN_PATHS.map((d) => (
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
