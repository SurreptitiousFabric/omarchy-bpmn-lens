import type { Catalog, CatalogItem, DiagramExplanation } from "./types";

async function fetchText(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.text();
}

async function fetchJson(path: string): Promise<unknown> {
  return JSON.parse(await fetchText(path));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertCatalog(value: unknown): asserts value is Catalog {
  if (!isRecord(value) || value.schemaVersion !== 2 || !Array.isArray(value.diagrams) || !isRecord(value.suite)) {
    throw new Error("The diagram catalog does not match schema version 2.");
  }
  const groups = new Set(["observed-current", "shared-target", "tui-target", "web-target"]);
  const channels = new Set(["tui", "web"]);
  const implementationStates = new Set(["current", "partial", "unimplemented"]);
  for (const item of value.diagrams) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string" ||
        typeof item.diagram !== "string" || typeof item.explanation !== "string" ||
        typeof item.group !== "string" || !groups.has(item.group) ||
        typeof item.implementationState !== "string" || !implementationStates.has(item.implementationState) ||
        !Array.isArray(item.channels) || !item.channels.length || !item.channels.every((channel) => channels.has(channel))) {
      throw new Error("The diagram catalog contains an invalid entry.");
    }
  }
}

function assertExplanation(value: unknown, expected: CatalogItem): asserts value is DiagramExplanation {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.id !== expected.id ||
      typeof value.summary !== "string" || typeof value.implementationStatus !== "string" ||
      !Array.isArray(value.sources) || !isRecord(value.elements)) {
    throw new Error(`The explanation for ${expected.title} is invalid.`);
  }
}

export async function loadCatalog(): Promise<Catalog> {
  const value: unknown = await fetchJson("/content/catalog.json");
  assertCatalog(value);
  return value;
}

export async function loadBundledDiagram(item: CatalogItem): Promise<{ xml: string; explanation: DiagramExplanation }> {
  const [xml, value] = await Promise.all([fetchText(`/${item.diagram}`), fetchJson(`/${item.explanation}`)]);
  assertExplanation(value, item);
  return { xml, explanation: value };
}
