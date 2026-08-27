export interface NotationExplanation {
  title: string;
  symbol: string;
  meaning: string;
}

function fallbackTitle(type: string): string {
  return type
    .replace(/^bpmn:/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function notationFor(type: string): NotationExplanation {
  if (type === "bpmn:ExclusiveGateway") return {
    title: "Exclusive gateway",
    symbol: "Diamond with an ×",
    meaning: "A decision or merge. At a decision, exactly one outgoing path is taken."
  };
  if (type === "bpmn:ParallelGateway") return {
    title: "Parallel gateway",
    symbol: "Diamond with a +",
    meaning: "Splits work into simultaneous paths, or waits for parallel paths to rejoin."
  };
  if (type === "bpmn:InclusiveGateway") return {
    title: "Inclusive gateway",
    symbol: "Diamond with a circle",
    meaning: "Selects one or more outgoing paths, or rejoins the paths that were selected."
  };
  if (type.endsWith("Gateway")) return {
    title: "Gateway",
    symbol: "Diamond",
    meaning: "Controls how the process branches or how separate paths merge."
  };
  if (type === "bpmn:StartEvent") return {
    title: "Start event",
    symbol: "Thin single circle",
    meaning: "Marks where this process begins."
  };
  if (type === "bpmn:EndEvent") return {
    title: "End event",
    symbol: "Thick single circle",
    meaning: "Marks where this path through the process ends."
  };
  if (type.includes("Intermediate") && type.endsWith("Event")) return {
    title: "Intermediate event",
    symbol: "Double circle",
    meaning: "Something that happens or is awaited while the process is under way."
  };
  if (type.endsWith("Task") || type === "bpmn:Task") return {
    title: "Task",
    symbol: "Rounded rectangle",
    meaning: "A unit of work or action performed in the process."
  };
  if (type === "bpmn:SequenceFlow") return {
    title: "Sequence flow",
    symbol: "Solid line with an arrow",
    meaning: "Shows the order of work and the path taken through the process."
  };
  if (type === "bpmn:Lane") return {
    title: "Lane",
    symbol: "Band inside a pool",
    meaning: "Groups work by the role or system responsible for it."
  };
  if (type === "bpmn:Participant") return {
    title: "Participant pool",
    symbol: "Large rectangular container",
    meaning: "Contains the process activities belonging to one participant."
  };
  return {
    title: fallbackTitle(type || "BPMN element"),
    symbol: "BPMN element",
    meaning: "A component of the process model."
  };
}
