import { describe, expect, it } from "vitest";
import { notationFor, notationPlacement } from "../src/notation";

describe("BPMN notation explanations", () => {
  it.each([
    ["bpmn:Task", "Task", "Rounded rectangle"],
    ["bpmn:UserTask", "Task", "Rounded rectangle"],
    ["bpmn:ExclusiveGateway", "Exclusive gateway", "Diamond with an ×"],
    ["bpmn:StartEvent", "Start event", "Thin single circle"],
    ["bpmn:EndEvent", "End event", "Thick single circle"],
    ["bpmn:SequenceFlow", "Sequence flow", "Solid line with an arrow"],
    ["bpmn:Lane", "Lane", "Band inside a pool"]
  ])("explains %s", (type, title, symbol) => {
    expect(notationFor(type)).toMatchObject({ title, symbol });
  });

  it("gives unfamiliar elements a readable fallback", () => {
    expect(notationFor("bpmn:DataObjectReference")).toEqual({
      title: "Data Object Reference",
      symbol: "BPMN element",
      meaning: "A component of the process model."
    });
  });
});

describe("notation placement", () => {
  it("docks a selected explanation when Details is open", () => {
    expect(notationPlacement(true, true, false)).toBe("dock");
  });

  it("uses the canvas fallback when Details is collapsed", () => {
    expect(notationPlacement(false, true, false)).toBe("overlay");
  });

  it("honours an explicit canvas dismissal until the selection changes", () => {
    expect(notationPlacement(false, true, true)).toBe("hidden");
    expect(notationPlacement(true, true, true)).toBe("dock");
    expect(notationPlacement(true, false, false)).toBe("hidden");
  });
});
