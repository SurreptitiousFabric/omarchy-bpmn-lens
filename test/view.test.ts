import { describe, expect, it } from "vitest";
import { actualSizeViewbox, diagramBounds, widthViewbox } from "../src/view";

describe("diagram view geometry", () => {
  it("unions shape and connection geometry while ignoring labels", () => {
    expect(diagramBounds([
      { id: "first", type: "bpmn:Task", x: 100, y: 80, width: 160, height: 72 },
      { id: "flow", type: "bpmn:SequenceFlow", waypoints: [{ x: 260, y: 116 }, { x: 500, y: 300 }] },
      { id: "label", type: "label", x: -900, y: -900, width: 40, height: 20 }
    ])).toEqual({ x: 100, y: 80, width: 400, height: 220 });
  });

  it("returns no bounds for an empty registry", () => {
    expect(diagramBounds([])).toBeUndefined();
  });

  it("fits the padded diagram width using the viewport aspect ratio", () => {
    expect(widthViewbox({ x: 100, y: 80, width: 400, height: 220 }, 2))
      .toEqual({ x: 4, y: 42, width: 592, height: 296 });
  });

  it("uses a safe square aspect ratio when the viewport is unavailable", () => {
    expect(widthViewbox({ x: 0, y: 0, width: 400, height: 200 }, 0))
      .toEqual({ x: -96, y: -196, width: 592, height: 592 });
  });

  it("centres a one-diagram-unit-per-CSS-pixel view on the diagram", () => {
    expect(actualSizeViewbox({ x: 100, y: 80, width: 400, height: 220 }, 800, 500))
      .toEqual({ x: -100, y: -60, width: 800, height: 500 });
  });
});
