import { describe, expect, it } from "vitest";
import { adjacentElement, elementBounds, focusViewbox, navigableElements } from "../src/focus";

describe("focus view geometry", () => {
  it("uses shape bounds directly", () => {
    expect(elementBounds({ id: "task", type: "bpmn:Task", x: 100, y: 50, width: 160, height: 72 }))
      .toEqual({ x: 100, y: 50, width: 160, height: 72 });
  });

  it("derives connection bounds from every waypoint", () => {
    expect(elementBounds({
      id: "flow",
      type: "bpmn:SequenceFlow",
      waypoints: [{ x: 300, y: 80 }, { x: 500, y: 80 }, { x: 500, y: 240 }]
    })).toEqual({ x: 300, y: 80, width: 200, height: 160 });
  });

  it("centres a readable minimum viewbox on the selection", () => {
    expect(focusViewbox({ x: 100, y: 50, width: 160, height: 72 }))
      .toEqual({ x: -140, y: -94, width: 640, height: 360 });
  });
});

describe("focus navigation", () => {
  const elements = navigableElements([
    { id: "late", type: "bpmn:Task", x: 500, y: 100, width: 160, height: 72 },
    { id: "lane", type: "bpmn:Lane", x: 0, y: 0, width: 900, height: 200 },
    { id: "early-low", type: "bpmn:Task", x: 100, y: 200, width: 160, height: 72 },
    { id: "early-high", type: "bpmn:StartEvent", x: 100, y: 50, width: 36, height: 36 }
  ]);

  it("orders navigable elements spatially and excludes containers", () => {
    expect(elements.map((element) => element.id)).toEqual(["early-high", "early-low", "late"]);
  });

  it("moves cyclically in either direction", () => {
    expect(adjacentElement(elements, "late", 1)?.id).toBe("early-high");
    expect(adjacentElement(elements, "early-high", -1)?.id).toBe("late");
  });
});
