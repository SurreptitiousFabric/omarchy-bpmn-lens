import type { CatalogGroup, CatalogItem, Channel, Classification, ImplementationState } from "./types";

export interface CatalogFilters {
  query: string;
  classification: Classification | "all";
  implementation: ImplementationState | "all";
  channel: Channel | "all";
}

export interface CatalogItemGroup {
  id: CatalogGroup;
  label: string;
  items: CatalogItem[];
}

const groupOrder: Array<{ id: CatalogGroup; label: string }> = [
  { id: "observed-current", label: "Observed current" },
  { id: "shared-target", label: "Shared target" },
  { id: "tui-target", label: "TUI target" },
  { id: "web-target", label: "Web target" }
];

export function filterCatalog(items: CatalogItem[], filters: CatalogFilters): CatalogItem[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return items.filter((item) =>
    (!query || item.title.toLocaleLowerCase().includes(query)) &&
    (filters.classification === "all" || item.classification === filters.classification) &&
    (filters.implementation === "all" || item.implementationState === filters.implementation) &&
    (filters.channel === "all" || item.channels.includes(filters.channel))
  );
}

export function groupCatalog(items: CatalogItem[]): CatalogItemGroup[] {
  return groupOrder
    .map((group) => ({ ...group, items: items.filter((item) => item.group === group.id) }))
    .filter((group) => group.items.length > 0);
}

export function activeFilterLabels(filters: CatalogFilters): string[] {
  const labels: string[] = [];
  if (filters.query.trim()) labels.push(`Title: ${filters.query.trim()}`);
  if (filters.classification !== "all") labels.push(`Classification: ${filters.classification}`);
  if (filters.implementation !== "all") labels.push(`Implementation: ${filters.implementation}`);
  if (filters.channel !== "all") labels.push(`Channel: ${filters.channel}`);
  return labels;
}
