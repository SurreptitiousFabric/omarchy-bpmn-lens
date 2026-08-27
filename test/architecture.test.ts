import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("architecture constraints", () => {
  it("keeps runtime dependencies to the reviewed BPMN boundary", async () => {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["bpmn-js", "bpmn-moddle"]);
    expect(Object.values(pkg.dependencies).every((version) => /^\d+\.\d+\.\d+$/.test(version))).toBe(true);
  });

  it("exposes only a thin Omarchy panel entry point", async () => {
    const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8")) as {
      schemaVersion: number;
      id: string;
      kinds: string[];
      entryPoints: Record<string, string>;
    };
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      id: "surreptitiousfabric.bpmn-lens",
      kinds: ["panel"],
      entryPoints: { panel: "omarchy/Panel.qml" }
    });
    const panelEntryPoint = manifest.entryPoints.panel;
    if (!panelEntryPoint) throw new Error("panel entry point is missing");
    expect(await readFile(path.join(root, panelEntryPoint), "utf8")).toContain("mise");
  });

  it("installs the desktop entry through the same mise-owned local boundary", async () => {
    const [installer, mise] = await Promise.all([
      readFile(path.join(root, "scripts/install-app.mjs"), "utf8"),
      readFile(path.join(root, "mise.toml"), "utf8")
    ]);

    expect(mise).toContain('[tasks."app:install"]');
    expect(installer).toContain(".local/share/applications");
    expect(installer).toContain("Exec=mise -C");
    expect(installer).not.toContain("sudo");
    expect(installer).not.toContain("shell: true");
  });
});
