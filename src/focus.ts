export interface DiagramPoint {
  x: number;
  y: number;
}

export interface DiagramBounds extends DiagramPoint {
  width: number;
  height: number;
}

export interface FocusableElement {
  id: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  waypoints?: DiagramPoint[];
}

export function elementBounds(element: FocusableElement): DiagramBounds | undefined {
  if ([element.x, element.y, element.width, element.height].every((value) => typeof value === "number")) {
    return {
      x: element.x as number,
      y: element.y as number,
      width: element.width as number,
      height: element.height as number
    };
  }
  if (!element.waypoints?.length) return undefined;
  const xs = element.waypoints.map((point) => point.x);
  const ys = element.waypoints.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

export function focusViewbox(bounds: DiagramBounds): DiagramBounds {
  const paddedWidth = bounds.width + 192;
  const paddedHeight = bounds.height + 192;
  const width = Math.max(640, paddedWidth);
  const height = Math.max(360, paddedHeight);
  return {
    x: bounds.x + bounds.width / 2 - width / 2,
    y: bounds.y + bounds.height / 2 - height / 2,
    width,
    height
  };
}

function isNavigable(element: FocusableElement): boolean {
  if (!elementBounds(element)) return false;
  return !["bpmn:Lane", "bpmn:Participant"].includes(element.type) && element.type !== "label";
}

export function navigableElements(elements: FocusableElement[]): FocusableElement[] {
  return elements.filter(isNavigable).sort((first, second) => {
    const firstBounds = elementBounds(first) as DiagramBounds;
    const secondBounds = elementBounds(second) as DiagramBounds;
    const firstCenterX = firstBounds.x + firstBounds.width / 2;
    const secondCenterX = secondBounds.x + secondBounds.width / 2;
    const firstCenterY = firstBounds.y + firstBounds.height / 2;
    const secondCenterY = secondBounds.y + secondBounds.height / 2;
    return firstCenterX - secondCenterX || firstCenterY - secondCenterY || first.id.localeCompare(second.id);
  });
}

export function adjacentElement(
  elements: FocusableElement[],
  currentId: string,
  direction: -1 | 1
): FocusableElement | undefined {
  if (!elements.length) return undefined;
  const currentIndex = elements.findIndex((element) => element.id === currentId);
  if (currentIndex < 0) return elements[direction > 0 ? 0 : elements.length - 1];
  return elements[(currentIndex + direction + elements.length) % elements.length];
}
