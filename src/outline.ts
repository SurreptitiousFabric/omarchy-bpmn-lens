import { elementBounds } from "./focus";
import type { FocusableElement } from "./focus";

export interface OutlineElement extends FocusableElement {
  businessObject?: { name?: string };
}

export interface OutlineItem {
  id: string;
  label: string;
  type: string;
  typeLabel: string;
}

export function typeLabel(type: string): string {
  const name = type.replace(/^bpmn:/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "BPMN element";
}

function isOutlined(element: OutlineElement): boolean {
  const type = element.type.replace(/^bpmn:/, "");
  if (type === "SequenceFlow") return Boolean(element.businessObject?.name?.trim());
  return type === "Lane" || type.endsWith("Task") || type.endsWith("Event") || type.endsWith("Gateway");
}

export function buildOutline(elements: OutlineElement[]): OutlineItem[] {
  return elements
    .filter(isOutlined)
    .sort((first, second) => {
      const firstLane = first.type === "bpmn:Lane" ? 0 : 1;
      const secondLane = second.type === "bpmn:Lane" ? 0 : 1;
      if (firstLane !== secondLane) return firstLane - secondLane;
      const firstBounds = elementBounds(first);
      const secondBounds = elementBounds(second);
      const firstX = firstBounds ? firstBounds.x + firstBounds.width / 2 : 0;
      const secondX = secondBounds ? secondBounds.x + secondBounds.width / 2 : 0;
      const firstY = firstBounds ? firstBounds.y + firstBounds.height / 2 : 0;
      const secondY = secondBounds ? secondBounds.y + secondBounds.height / 2 : 0;
      return firstX - secondX || firstY - secondY || first.id.localeCompare(second.id);
    })
    .map((element) => {
      const readableType = typeLabel(element.type);
      return {
        id: element.id,
        label: element.businessObject?.name?.trim() || `Unnamed ${readableType.toLowerCase()}`,
        type: element.type,
        typeLabel: readableType
      };
    });
}

export function filterOutline(items: OutlineItem[], query: string): OutlineItem[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return items;
  return items.filter((item) => `${item.label} ${item.typeLabel}`.toLocaleLowerCase().includes(normalized));
}
