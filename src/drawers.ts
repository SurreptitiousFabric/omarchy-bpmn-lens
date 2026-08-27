export type Drawer = "processes" | "details";

export function nextDrawer(current: Drawer | undefined, requested: Drawer): Drawer | undefined {
  return current === requested ? undefined : requested;
}

export function wrappedFocusIndex(length: number, current: number, direction: -1 | 1): number {
  if (length < 1) return -1;
  return (current + direction + length) % length;
}
