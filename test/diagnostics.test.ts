import { describe, expect, it } from "vitest";
import { buildImportDiagnostics, inspectBpmnSource, normalizeImportWarning } from "../src/diagnostics";

describe("local BPMN diagnostics", () => {
  it("counts source-level processes, participants, and lanes", () => {
    const xml = `<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
      <process id="p1"><laneSet><lane id="l1"/><lane id="l2"/></laneSet></process>
      <collaboration><participant id="pool" processRef="p1"/></collaboration>
    </definitions>`;
    expect(inspectBpmnSource(xml)).toEqual({ processes: 1, participants: 1, lanes: 2, parseError: undefined });
  });

  it("never throws while collecting pre-import source counts", () => {
    expect(() => inspectBpmnSource("<definitions><process></definitions>")).not.toThrow();
  });

  it("retains warning messages and only real supplied element IDs", () => {
    expect(normalizeImportWarning({ message: "Missing target", element: { id: "flow-1" } }))
      .toEqual({ message: "Missing target", elementId: "flow-1" });
    expect(normalizeImportWarning({ message: "No element id here" }))
      .toEqual({ message: "No element id here", elementId: undefined });
  });

  it("counts rendered semantic elements and discloses generic notation", () => {
    const diagnostics = buildImportDiagnostics(
      { processes: 1, participants: 0, lanes: 0, parseError: undefined },
      [
        { id: "task", type: "bpmn:Task", businessObject: { name: "Work" } },
        { id: "data", type: "bpmn:DataObjectReference", businessObject: { name: "Record" } },
        { id: "task_label", type: "label" }
      ],
      [{ message: "Review this file" }]
    );
    expect(diagnostics.counts.elements).toBe(2);
    expect(diagnostics.counts.warnings).toBe(1);
    expect(diagnostics.disclosures).toEqual([{ elementId: "data", label: "Record", type: "bpmn:DataObjectReference" }]);
  });
});
