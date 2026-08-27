import { elementBounds } from "./focus";
import type { DiagramBounds, FocusableElement } from "./focus";

export type ViewMode = "overview" | "width" | "selection" | "actual" | "manual";

export function diagramBounds(elements: FocusableElement[]): DiagramBounds | undefined {
  const bounds = elements
    .filter((element) => element.type !== "label")
    .map(elementBounds)
    .filter((value): value is DiagramBounds => Boolean(value));
  if (!bounds.length) return undefined;
  const left = Math.min(...bounds.map((value) => value.x));
  const top = Math.min(...bounds.map((value) => value.y));
  const right = Math.max(...bounds.map((value) => value.x + value.width));
  const bottom = Math.max(...bounds.map((value) => value.y + value.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function widthViewbox(bounds: DiagramBounds, viewportAspectRatio: number): DiagramBounds {
  const width = bounds.width + 192;
  const ratio = viewportAspectRatio > 0 && Number.isFinite(viewportAspectRatio) ? viewportAspectRatio : 1;
  const height = width / ratio;
  return {
    x: bounds.x + bounds.width / 2 - width / 2,
    y: bounds.y + bounds.height / 2 - height / 2,
    width,
    height
  };
}

export function actualSizeViewbox(bounds: DiagramBounds, viewportWidth: number, viewportHeight: number): DiagramBounds {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  return {
    x: bounds.x + bounds.width / 2 - width / 2,
    y: bounds.y + bounds.height / 2 - height / 2,
    width,
    height
  };
}
