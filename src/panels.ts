export type PanelKind = "processes" | "details";

const policy: Record<PanelKind, { min: number; max: number; default: number }> = {
  processes: { min: 224, max: 480, default: 288 },
  details: { min: 288, max: 560, default: 368 }
};

export function defaultPanelWidth(kind: PanelKind): number {
  return policy[kind].default;
}

export function panelWidthBounds(kind: PanelKind): { min: number; max: number } {
  return policy[kind];
}

export function clampPanelWidth(kind: PanelKind, width: number): number {
  const { min, max } = policy[kind];
  return Math.round(Math.min(max, Math.max(min, width)));
}

export function adjustPanelWidth(
  kind: PanelKind,
  current: number,
  key: "ArrowLeft" | "ArrowRight" | "Home",
  largeStep: boolean
): number {
  if (key === "Home") return defaultPanelWidth(kind);
  const screenDirection = key === "ArrowLeft" ? -1 : 1;
  const panelDirection = kind === "processes" ? screenDirection : -screenDirection;
  return clampPanelWidth(kind, current + panelDirection * (largeStep ? 32 : 8));
}
