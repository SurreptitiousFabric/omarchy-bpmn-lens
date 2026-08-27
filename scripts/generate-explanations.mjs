import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BpmnModdle } from "bpmn-moddle";

const root = path.resolve(import.meta.dirname, "..");
const diagramsDir = path.join(root, "public/content/diagrams");
const explanationsDir = path.join(root, "public/content/explanations");
const blueprints = JSON.parse(await readFile(path.join(root, "content-blueprints.json"), "utf8"));
const moddle = new BpmnModdle();

const actorGuidance = {
  User: "A person makes an explicit choice or reviews an outcome.",
  Frontend: "The active presentation adapter owns this interaction, not the domain model.",
  Application: "A channel-neutral application workflow owns this decision or transformation.",
  "STEMMA / persistence": "The STEMMA model, validation, store, or persistence adapter owns this work."
};

function humanType(type) {
  return String(type || "bpmn:Element").replace(/^bpmn:/, "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function collectFlowElements(container, output = []) {
  for (const element of container.flowElements || []) {
    output.push(element);
    if (element.flowElements) collectFlowElements(element, output);
  }
  return output;
}

function laneByElement(process) {
  const result = new Map();
  for (const laneSet of process.laneSets || []) {
    for (const lane of laneSet.lanes || []) {
      for (const ref of lane.flowNodeRef || []) result.set(ref.id, lane.name || "Unassigned");
    }
  }
  return result;
}

function explainElement(element, actor, blueprint) {
  const label = element.name || humanType(element.$type);
  const isCurrent = blueprint.classification === "observed-current";
  const isFlow = element.$type === "bpmn:SequenceFlow";
  const meaning = isFlow
    ? `The process continues${element.name ? ` when “${element.name}” applies` : " along this path"}.`
    : `${label} is a ${humanType(element.$type)} in this workflow. ${actorGuidance[actor] || "Its owning layer is not assigned."}`;

  return {
    id: element.id,
    label,
    bpmnType: element.$type,
    actor,
    meaning,
    implementation: {
      state: isCurrent ? "current" : blueprint.classification,
      detail: blueprint.implementationStatus
    },
    tui: {
      relevance: actor === "Frontend" || actor === "User" ? "direct" : "through-shared-workflow",
      guidance: blueprint.tuiDesign
    },
    web: {
      relevance: actor === "Frontend" || actor === "User" ? "direct" : "through-shared-workflow",
      guidance: blueprint.webDesign
    },
    sources: blueprint.sources
  };
}

const files = (await readdir(diagramsDir)).filter((file) => file.endsWith(".bpmn")).sort();
const catalog = [];

for (const file of files) {
  const blueprint = blueprints.diagrams[file];
  if (!blueprint) throw new Error(`Missing reviewed blueprint for ${file}`);
  const xml = await readFile(path.join(diagramsDir, file), "utf8");
  const { rootElement, warnings } = await moddle.fromXML(xml);
  const process = rootElement.rootElements.find((entry) => entry.$type === "bpmn:Process");
  if (!process) throw new Error(`No BPMN process in ${file}`);
  const lanes = laneByElement(process);
  const elements = Object.fromEntries(
    collectFlowElements(process).map((element) => [
      element.id,
      explainElement(element, lanes.get(element.id) || (element.$type === "bpmn:SequenceFlow" ? "Process" : "Unassigned"), blueprint)
    ])
  );
  const id = file.replace(/\.bpmn$/, "");
  const sidecar = {
    schemaVersion: 1,
    id,
    file,
    ...blueprint,
    warnings: warnings.map((warning) => warning.message),
    elements
  };
  const explanationFile = `${id}.json`;
  await writeFile(path.join(explanationsDir, explanationFile), `${JSON.stringify(sidecar, null, 2)}\n`);
  catalog.push({
    id,
    title: blueprint.title,
    classification: blueprint.classification,
    summary: blueprint.summary,
    diagram: `content/diagrams/${file}`,
    explanation: `content/explanations/${explanationFile}`
  });
}

await writeFile(
  path.join(root, "public/content/catalog.json"),
  `${JSON.stringify({ schemaVersion: 1, suite: blueprints.suite, diagrams: catalog }, null, 2)}\n`
);

console.log(`Generated ${catalog.length} explanation sidecars and catalog.json`);
