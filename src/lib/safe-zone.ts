export type Box = { x: number; y: number; width: number; height: number };
type Insets = { top: number; bottom: number; right: number; left: number };

/** The rectangle inside the frame where content is guaranteed to be visible. */
export const safeBox = (insets: Insets, width: number, height: number): Box => {
  const box: Box = {
    x: insets.left,
    y: insets.top,
    width: width - insets.left - insets.right,
    height: height - insets.top - insets.bottom,
  };
  if (box.width <= 0 || box.height <= 0) {
    throw new Error('Safe zone insets leave no visible area');
  }
  return box;
};
