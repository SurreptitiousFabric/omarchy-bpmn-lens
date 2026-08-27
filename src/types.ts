export type Classification = "observed-current" | "target" | "target-partial" | "target-unimplemented";

export interface CatalogItem {
  id: string;
  title: string;
  classification: Classification;
  summary: string;
  diagram: string;
  explanation: string;
}

export interface Catalog {
  schemaVersion: 1;
  suite: {
    title: string;
    description: string;
    generatedFrom: string;
  };
  diagrams: CatalogItem[];
}

export interface ElementExplanation {
  id: string;
  label: string;
  bpmnType: string;
  actor: string;
  meaning: string;
  implementation: { state: string; detail: string };
  tui: { relevance: string; guidance: string };
  web: { relevance: string; guidance: string };
  sources: string[];
}

export interface DiagramExplanation {
  schemaVersion: 1;
  id: string;
  file: string;
  title: string;
  classification: Classification;
  summary: string;
  implementationStatus: string;
  tuiDesign: string;
  webDesign: string;
  sources: string[];
  warnings: string[];
  elements: Record<string, ElementExplanation>;
}
