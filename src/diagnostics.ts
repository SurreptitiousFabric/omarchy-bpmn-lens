export interface SourceCounts {
  processes: number;
  participants: number;
  lanes: number;
  parseError?: string;
}

export interface DiagnosticElement {
  id: string;
  type: string;
  businessObject?: { name?: string };
}

export interface ImportWarning {
  message: string;
  elementId?: string;
}

export interface NotationDisclosure {
  elementId: string;
  label: string;
  type: string;
}

export interface ImportDiagnostics {
  counts: SourceCounts & { elements: number; warnings: number };
  warnings: ImportWarning[];
  disclosures: NotationDisclosure[];
}

function regexCount(xml: string, localName: string): number {
  return [...xml.matchAll(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${localName}(?:\\s|/?>)`, "g"))].length;
}

export function inspectBpmnSource(xml: string): SourceCounts {
  if (typeof DOMParser === "undefined") {
    return {
      processes: regexCount(xml, "process"),
      participants: regexCount(xml, "participant"),
      lanes: regexCount(xml, "lane")
    };
  }
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = document.querySelector("parsererror")?.textContent?.trim();
  return {
    processes: document.getElementsByTagNameNS("*", "process").length,
    participants: document.getElementsByTagNameNS("*", "participant").length,
    lanes: document.getElementsByTagNameNS("*", "lane").length,
    parseError: parserError || undefined
  };
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

export function normalizeImportWarning(value: unknown): ImportWarning {
  const warning = record(value);
  const element = record(warning?.element);
  const error = record(warning?.error);
  const errorElement = record(error?.element);
  const suppliedId = warning?.elementId ?? element?.id ?? errorElement?.id;
  return {
    message: typeof warning?.message === "string" ? warning.message : String(value),
    elementId: typeof suppliedId === "string" ? suppliedId : undefined
  };
}

function hasSpecificNotation(type: string): boolean {
  return type === "bpmn:SequenceFlow" || type === "bpmn:Lane" || type === "bpmn:Participant" ||
    type.endsWith("Task") || type.endsWith("Event") || type.endsWith("Gateway");
}

function isCountedElement(element: DiagnosticElement): boolean {
  return element.type !== "label" && !["bpmn:Process", "bpmn:Collaboration", "bpmn:Participant", "bpmn:Lane"].includes(element.type);
}

export function buildImportDiagnostics(
  source: SourceCounts,
  elements: DiagnosticElement[],
  rawWarnings: unknown[]
): ImportDiagnostics {
  const semanticElements = elements.filter(isCountedElement);
  const warnings = rawWarnings.map(normalizeImportWarning);
  return {
    counts: { ...source, elements: semanticElements.length, warnings: warnings.length },
    warnings,
    disclosures: semanticElements
      .filter((element) => !hasSpecificNotation(element.type))
      .map((element) => ({
        elementId: element.id,
        label: element.businessObject?.name?.trim() || element.id,
        type: element.type
      }))
  };
}
