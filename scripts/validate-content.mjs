import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { BpmnModdle } from "bpmn-moddle";

const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");
const catalog = JSON.parse(await readFile(path.join(publicDir, "content/catalog.json"), "utf8"));
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const moddle = new BpmnModdle();
const errors = [];

if (manifest.schemaVersion !== 1) errors.push("manifest schemaVersion must be 1");
if (manifest.id !== "surreptitiousfabric.bpmn-lens") errors.push("manifest id is not stable");
if (!manifest.kinds?.includes("panel")) errors.push("manifest must declare panel kind");
if (manifest.entryPoints?.panel !== "omarchy/Panel.qml") errors.push("manifest panel entry point is invalid");
await access(path.join(root, manifest.entryPoints.panel));

if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.diagrams) || catalog.diagrams.length === 0) {
  errors.push("catalog must contain at least one schema v1 diagram");
}

const listed = new Set();
for (const item of catalog.diagrams || []) {
  listed.add(path.basename(item.diagram));
  const diagramPath = path.join(publicDir, item.diagram);
  const explanationPath = path.join(publicDir, item.explanation);
  const xml = await readFile(diagramPath, "utf8");
  const sidecar = JSON.parse(await readFile(explanationPath, "utf8"));
  const { rootElement, warnings } = await moddle.fromXML(xml);
  const process = rootElement.rootElements.find((entry) => entry.$type === "bpmn:Process");
  if (!process) errors.push(`${item.id}: missing BPMN process`);
  if (warnings.length) errors.push(`${item.id}: BPMN parse warnings: ${warnings.map((w) => w.message).join("; ")}`);
  if (sidecar.schemaVersion !== 1 || sidecar.id !== item.id) errors.push(`${item.id}: sidecar identity mismatch`);
  if (!sidecar.summary || !sidecar.implementationStatus || !sidecar.tuiDesign || !sidecar.webDesign) {
    errors.push(`${item.id}: incomplete diagram explanation`);
  }
  if (!sidecar.elements || Object.keys(sidecar.elements).length < 2) errors.push(`${item.id}: missing element explanations`);
}

const diskDiagrams = (await readdir(path.join(publicDir, "content/diagrams"))).filter((name) => name.endsWith(".bpmn"));
for (const file of diskDiagrams) if (!listed.has(file)) errors.push(`${file}: not listed in catalog`);

const directDependencies = Object.keys(JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).dependencies || {});
const allowedRuntime = new Set(["bpmn-js", "bpmn-moddle"]);
for (const dependency of directDependencies) if (!allowedRuntime.has(dependency)) errors.push(`unapproved runtime dependency: ${dependency}`);

const distPath = path.join(root, "dist");
try {
  const assets = await readdir(path.join(distPath, "assets"));
  let total = (await stat(path.join(distPath, "index.html"))).size;
  for (const file of assets) total += (await stat(path.join(distPath, "assets", file))).size;
  if (total > 2_500_000) errors.push(`static build is ${total} bytes; 2.5 MB budget exceeded`);
} catch {
  // dist is checked after build; content validation is also useful before it exists.
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${catalog.diagrams.length} BPMN diagrams, sidecars, plugin manifest, and dependency policy`);
}
