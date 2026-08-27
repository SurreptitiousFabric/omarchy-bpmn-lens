import { describe, expect, it } from "vitest";
import { buildOutline, filterOutline, typeLabel } from "../src/outline";

describe("semantic outline", () => {
  const elements = [
    { id: "lane", type: "bpmn:Lane", x: 0, y: 0, width: 900, height: 200, businessObject: { name: "Application" } },
    { id: "task", type: "bpmn:UserTask", x: 100, y: 80, width: 160, height: 72, businessObject: { name: "Review evidence" } },
    { id: "gateway", type: "bpmn:ExclusiveGateway", x: 320, y: 90, width: 50, height: 50, businessObject: {} },
    { id: "named-flow", type: "bpmn:SequenceFlow", waypoints: [{ x: 260, y: 116 }, { x: 320, y: 116 }], businessObject: { name: "Accepted" } },
    { id: "plain-flow", type: "bpmn:SequenceFlow", waypoints: [{ x: 370, y: 116 }, { x: 500, y: 116 }], businessObject: {} },
    { id: "participant", type: "bpmn:Participant", x: 0, y: 0, width: 900, height: 300, businessObject: { name: "Pool" } }
  ];

  it("includes tasks, events, gateways, lanes, and only named paths", () => {
    expect(buildOutline(elements).map((item) => item.id))
      .toEqual(["lane", "task", "named-flow", "gateway"]);
  });

  it("provides an explicit label for unnamed semantic elements", () => {
    expect(buildOutline(elements).find((item) => item.id === "gateway")?.label)
      .toBe("Unnamed exclusive gateway");
  });

  it("searches labels and human-readable BPMN types case-insensitively", () => {
    const outline = buildOutline(elements);
    expect(filterOutline(outline, "EVIDENCE").map((item) => item.id)).toEqual(["task"]);
    expect(filterOutline(outline, "sequence flow").map((item) => item.id)).toEqual(["named-flow"]);
  });

  it("humanizes BPMN type names", () => {
    expect(typeLabel("bpmn:IntermediateCatchEvent")).toBe("Intermediate catch event");
  });
});
