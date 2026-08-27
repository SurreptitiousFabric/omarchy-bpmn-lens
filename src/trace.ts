export type TraceDirection = "upstream" | "downstream" | "both";

export interface TraceElement {
  id: string;
  type: string;
  incoming?: TraceElement[];
  outgoing?: TraceElement[];
  source?: TraceElement;
  target?: TraceElement;
}

function walk(start: TraceElement, direction: Exclude<TraceDirection, "both">, result: Set<string>): void {
  const visited = new Set<string>();
  const visit = (element: TraceElement): void => {
    if (visited.has(element.id)) return;
    visited.add(element.id);
    result.add(element.id);
    const flows = direction === "upstream" ? element.incoming : element.outgoing;
    for (const flow of flows || []) {
      result.add(flow.id);
      const next = direction === "upstream" ? flow.source : flow.target;
      if (next) visit(next);
    }
  };

  if (start.type === "bpmn:SequenceFlow") {
    result.add(start.id);
    const next = direction === "upstream" ? start.source : start.target;
    if (next) visit(next);
  } else {
    visit(start);
  }
}

export function tracePath(start: TraceElement, direction: TraceDirection): Set<string> {
  const result = new Set<string>([start.id]);
  if (direction === "upstream" || direction === "both") walk(start, "upstream", result);
  if (direction === "downstream" || direction === "both") walk(start, "downstream", result);
  return result;
}
