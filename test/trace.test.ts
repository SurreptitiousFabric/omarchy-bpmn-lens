import { describe, expect, it } from "vitest";
import { tracePath } from "../src/trace";
import type { TraceElement } from "../src/trace";

describe("BPMN path tracing", () => {
  const start: TraceElement = { id: "start", type: "bpmn:StartEvent", incoming: [], outgoing: [] };
  const task: TraceElement = { id: "task", type: "bpmn:Task", incoming: [], outgoing: [] };
  const gateway: TraceElement = { id: "gateway", type: "bpmn:ExclusiveGateway", incoming: [], outgoing: [] };
  const end: TraceElement = { id: "end", type: "bpmn:EndEvent", incoming: [], outgoing: [] };
  const connect = (id: string, source: TraceElement, target: TraceElement): TraceElement => {
    const flow: TraceElement = { id, type: "bpmn:SequenceFlow", incoming: [], outgoing: [], source, target };
    source.outgoing?.push(flow);
    target.incoming?.push(flow);
    return flow;
  };
  const first = connect("first", start, task);
  connect("second", task, gateway);
  connect("accepted", gateway, end);
  connect("retry", gateway, task);

  it("traces upstream nodes and flows", () => {
    expect([...tracePath(gateway, "upstream")].sort())
      .toEqual(["first", "gateway", "retry", "second", "start", "task"].sort());
  });

  it("traces downstream nodes and flows and terminates cycles", () => {
    expect([...tracePath(gateway, "downstream")].sort())
      .toEqual(["accepted", "end", "gateway", "retry", "second", "task"].sort());
  });

  it("traces both directions without duplicates", () => {
    expect(tracePath(task, "both"))
      .toEqual(new Set(["task", "first", "start", "second", "gateway", "accepted", "end", "retry"]));
  });

  it("starts a flow trace from its source or target as requested", () => {
    expect(tracePath(first, "upstream")).toEqual(new Set(["first", "start"]));
    expect(tracePath(first, "downstream").has("end")).toBe(true);
  });
});
