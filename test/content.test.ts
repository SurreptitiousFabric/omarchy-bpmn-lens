import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Catalog, DiagramExplanation } from "../src/types";

const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

describe("capability content", () => {
  it("keeps every bundled BPMN file paired with one catalog entry and sidecar", async () => {
    const catalog = await json<Catalog>(path.join(publicDir, "content/catalog.json"));
    const diagrams = (await readdir(path.join(publicDir, "content/diagrams")))
      .filter((file) => file.endsWith(".bpmn"))
      .sort();

    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.diagrams.map((item) => path.basename(item.diagram)).sort()).toEqual(diagrams);
    expect(new Set(catalog.diagrams.map((item) => item.id)).size).toBe(catalog.diagrams.length);

    for (const item of catalog.diagrams) {
      const sidecar = await json<DiagramExplanation>(path.join(publicDir, item.explanation));
      expect(sidecar.id).toBe(item.id);
      expect(sidecar.file).toBe(path.basename(item.diagram));
      expect(Object.keys(sidecar.elements).length).toBeGreaterThan(1);
    }
  });

  it("does not blur current implementation claims with target contracts", async () => {
    const catalog = await json<Catalog>(path.join(publicDir, "content/catalog.json"));
    const current = catalog.diagrams.filter((item) => item.classification === "observed-current");
    const target = catalog.diagrams.filter((item) => item.classification.startsWith("target"));

    expect(current.map((item) => item.id)).toEqual([
      "01-current-tui-startup-navigation",
      "02-current-tui-edit-save"
    ]);
    expect(target).toHaveLength(8);
  });

  it("provides TUI, web, status, and source fields for every selectable element", async () => {
    const catalog = await json<Catalog>(path.join(publicDir, "content/catalog.json"));
    for (const item of catalog.diagrams) {
      const sidecar = await json<DiagramExplanation>(path.join(publicDir, item.explanation));
      for (const explanation of Object.values(sidecar.elements)) {
        expect(explanation.meaning).not.toBe("");
        expect(explanation.implementation.detail).not.toBe("");
        expect(explanation.tui.guidance).not.toBe("");
        expect(explanation.web.guidance).not.toBe("");
        expect(explanation.sources.length).toBeGreaterThan(0);
      }
    }
  });
});
