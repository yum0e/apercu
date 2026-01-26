export const HEADER_HEIGHT = 1;
export const STICKY_HEADER_HEIGHT = 1;
export const STATUS_HEIGHT = 1;
export const LEFT_RAIL_WIDTH = 28;

export function getViewportHeight(totalHeight: number): number {
  return Math.max(1, totalHeight - HEADER_HEIGHT - STICKY_HEADER_HEIGHT - STATUS_HEIGHT);
}
