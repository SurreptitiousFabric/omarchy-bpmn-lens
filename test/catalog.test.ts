import { describe, expect, it } from "vitest";
import { activeFilterLabels, filterCatalog, groupCatalog } from "../src/catalog";
import type { CatalogItem } from "../src/types";

const items: CatalogItem[] = [
  { id: "current", title: "TUI startup", classification: "observed-current", implementationState: "current", group: "observed-current", channels: ["tui"], summary: "", diagram: "", explanation: "" },
  { id: "shared", title: "Shared lifecycle", classification: "target-partial", implementationState: "partial", group: "shared-target", channels: ["tui", "web"], summary: "", diagram: "", explanation: "" },
  { id: "web", title: "Target web", classification: "target-unimplemented", implementationState: "unimplemented", group: "web-target", channels: ["web"], summary: "", diagram: "", explanation: "" }
];

describe("catalog filters", () => {
  it("filters independently by title, classification, implementation, and channel", () => {
    expect(filterCatalog(items, { query: "START", classification: "all", implementation: "all", channel: "all" }).map((item) => item.id)).toEqual(["current"]);
    expect(filterCatalog(items, { query: "", classification: "target-partial", implementation: "all", channel: "all" }).map((item) => item.id)).toEqual(["shared"]);
    expect(filterCatalog(items, { query: "", classification: "all", implementation: "unimplemented", channel: "all" }).map((item) => item.id)).toEqual(["web"]);
    expect(filterCatalog(items, { query: "", classification: "all", implementation: "all", channel: "tui" }).map((item) => item.id)).toEqual(["current", "shared"]);
  });

  it("groups only by explicit catalog metadata in the product order", () => {
    expect(groupCatalog(items).map((group) => [group.id, group.items.length]))
      .toEqual([["observed-current", 1], ["shared-target", 1], ["web-target", 1]]);
  });

  it("describes only active filters", () => {
    expect(activeFilterLabels({ query: "save", classification: "all", implementation: "partial", channel: "web" }))
      .toEqual(["Title: save", "Implementation: partial", "Channel: web"]);
  });
});
