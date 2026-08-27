import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import "bpmn-js/dist/assets/diagram-js.css";
import "./styles.css";
import { loadBundledDiagram, loadCatalog } from "./content";
import type { Catalog, CatalogItem, DiagramExplanation, ElementExplanation } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root is missing.");

app.innerHTML = `
  <header class="app-header">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">◇</span>
      <div><strong>BPMN Lens</strong><span>Local process explorer</span></div>
    </div>
    <div class="header-actions">
      <label class="file-action" for="file-picker">Open BPMN</label>
      <input id="file-picker" type="file" accept=".bpmn,.xml,application/xml,text/xml" />
      <button id="about-button" class="quiet-button" type="button">About</button>
    </div>
  </header>
  <div class="workspace">
    <nav class="diagram-nav" aria-label="BPMN diagrams">
      <div class="panel-heading">
        <div><span class="eyebrow">Capability suite</span><h1>Processes</h1></div>
        <span id="diagram-count" class="count"></span>
      </div>
      <div id="diagram-list" class="diagram-list"></div>
      <div class="legend">
        <span><i class="dot current"></i>Observed current</span>
        <span><i class="dot target"></i>Target or partial</span>
      </div>
    </nav>
    <main class="diagram-region">
      <div class="diagram-toolbar">
        <div class="diagram-title-block">
          <span id="classification" class="classification"></span>
          <h2 id="diagram-title">Loading diagrams…</h2>
        </div>
        <div class="zoom-controls" aria-label="Diagram zoom">
          <button id="zoom-out" type="button" aria-label="Zoom out">−</button>
          <button id="zoom-fit" type="button">Fit</button>
          <button id="zoom-in" type="button" aria-label="Zoom in">+</button>
        </div>
      </div>
      <div id="diagram-canvas" tabindex="0" aria-label="Interactive read-only BPMN diagram"></div>
      <p id="status" class="status" role="status" aria-live="polite">Preparing the local viewer…</p>
    </main>
    <aside class="explanation-panel" aria-labelledby="explanation-title">
      <div id="explanation-content"></div>
    </aside>
  </div>
  <dialog id="about-dialog">
    <div class="dialog-heading"><h2>About BPMN Lens</h2><button id="close-about" type="button" aria-label="Close">×</button></div>
    <p>This is a read-only design companion. It renders BPMN locally and keeps explanatory claims in reviewable JSON sidecars.</p>
    <p><strong>Current</strong> means observed or executable evidence supports the behavior. <strong>Target</strong> means a product or data contract says the behavior should exist; it is not an implementation claim.</p>
    <p>No BPMN file is uploaded. Files opened from your computer remain in this browser session.</p>
  </dialog>
`;

const get = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
};

const list = get<HTMLDivElement>("#diagram-list");
const title = get<HTMLHeadingElement>("#diagram-title");
const classification = get<HTMLSpanElement>("#classification");
const explanationContent = get<HTMLDivElement>("#explanation-content");
const status = get<HTMLParagraphElement>("#status");
const filePicker = get<HTMLInputElement>("#file-picker");
const dialog = get<HTMLDialogElement>("#about-dialog");
const viewer = new NavigatedViewer({ container: "#diagram-canvas" });

let catalog: Catalog;
let activeItem: CatalogItem | undefined;
let activeExplanation: DiagramExplanation | undefined;
let selectedElementId: string | undefined;

function escapeHtml(value: string): string {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function classLabel(value: string): string {
  const labels: Record<string, string> = {
    "observed-current": "Observed current",
    target: "Target",
    "target-partial": "Target · partial",
    "target-unimplemented": "Target · unimplemented"
  };
  return labels[value] || value;
}

function updateUrl(diagramId?: string, elementId?: string): void {
  const url = new URL(window.location.href);
  if (diagramId) url.searchParams.set("diagram", diagramId);
  else url.searchParams.delete("diagram");
  if (elementId) url.searchParams.set("element", elementId);
  else url.searchParams.delete("element");
  window.history.replaceState(null, "", url);
}

function renderDiagramExplanation(explanation: DiagramExplanation): void {
  explanationContent.innerHTML = `
    <span class="eyebrow">Diagram explanation</span>
    <h2 id="explanation-title">What this shows</h2>
    <p class="lead">${escapeHtml(explanation.summary)}</p>
    <section><h3>Delivery status</h3><p>${escapeHtml(explanation.implementationStatus)}</p></section>
    <section><h3>TUI design</h3><p>${escapeHtml(explanation.tuiDesign)}</p></section>
    <section><h3>Web design</h3><p>${escapeHtml(explanation.webDesign)}</p></section>
    <section><h3>Sources</h3><ul>${explanation.sources.map((source) => `<li>${escapeHtml(source)}</li>`).join("")}</ul></section>
    <p class="selection-hint">Select a task, event, gateway, or path for an element-level explanation.</p>
  `;
}

function renderElementExplanation(explanation: ElementExplanation): void {
  explanationContent.innerHTML = `
    <span class="eyebrow">Selected ${escapeHtml(explanation.bpmnType.replace("bpmn:", ""))}</span>
    <h2 id="explanation-title">${escapeHtml(explanation.label)}</h2>
    <dl class="facts"><div><dt>Owner</dt><dd>${escapeHtml(explanation.actor)}</dd></div><div><dt>Status</dt><dd>${escapeHtml(classLabel(explanation.implementation.state))}</dd></div></dl>
    <p class="lead">${escapeHtml(explanation.meaning)}</p>
    <section><h3>Implementation reading</h3><p>${escapeHtml(explanation.implementation.detail)}</p></section>
    <section><h3>TUI implication</h3><p>${escapeHtml(explanation.tui.guidance)}</p></section>
    <section><h3>Web implication</h3><p>${escapeHtml(explanation.web.guidance)}</p></section>
    <section><h3>Sources</h3><ul>${explanation.sources.map((source) => `<li>${escapeHtml(source)}</li>`).join("")}</ul></section>
  `;
}

function renderList(): void {
  list.innerHTML = catalog.diagrams.map((item, index) => `
    <button class="diagram-item ${item.id === activeItem?.id ? "active" : ""}" type="button" data-diagram-id="${escapeHtml(item.id)}">
      <span class="diagram-number">${String(index + 1).padStart(2, "0")}</span>
      <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(classLabel(item.classification))}</small></span>
    </button>
  `).join("");
  for (const button of list.querySelectorAll<HTMLButtonElement>("[data-diagram-id]")) {
    button.addEventListener("click", () => void openBundled(button.dataset.diagramId || ""));
  }
}

async function importXml(xml: string): Promise<void> {
  const result = await viewer.importXML(xml);
  viewer.get("canvas").zoom("fit-viewport");
  status.textContent = result.warnings.length ? `Opened with ${result.warnings.length} BPMN warning(s).` : "Diagram ready. Select an element to explain it.";
}

async function openBundled(id: string, requestedElement?: string): Promise<void> {
  const item = catalog.diagrams.find((candidate) => candidate.id === id);
  if (!item) return;
  status.textContent = `Opening ${item.title}…`;
  try {
    const loaded = await loadBundledDiagram(item);
    activeItem = item;
    activeExplanation = loaded.explanation;
    selectedElementId = undefined;
    title.textContent = item.title;
    classification.textContent = classLabel(item.classification);
    classification.dataset.kind = item.classification;
    renderList();
    renderDiagramExplanation(loaded.explanation);
    await importXml(loaded.xml);
    updateUrl(item.id);
    if (requestedElement && loaded.explanation.elements[requestedElement]) selectElement(requestedElement);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "The diagram could not be opened.";
  }
}

function selectElement(id: string): void {
  const explanation = activeExplanation?.elements[id];
  if (!explanation) return;
  const canvas = viewer.get("canvas");
  if (selectedElementId) canvas.removeMarker(selectedElementId, "is-explained");
  selectedElementId = id;
  canvas.addMarker(id, "is-explained");
  renderElementExplanation(explanation);
  updateUrl(activeItem?.id, id);
}

viewer.get("eventBus").on("element.click", (event) => {
  const id = event.element?.businessObject?.id || event.element?.id;
  if (id) selectElement(id);
});

filePicker.addEventListener("change", async () => {
  const file = filePicker.files?.[0];
  if (!file) return;
  try {
    const xml = await file.text();
    activeItem = undefined;
    activeExplanation = undefined;
    selectedElementId = undefined;
    title.textContent = file.name;
    classification.textContent = "Local file · no sidecar";
    classification.dataset.kind = "local";
    renderList();
    explanationContent.innerHTML = `<span class="eyebrow">Local file</span><h2 id="explanation-title">No explanation sidecar</h2><p class="lead">The diagram is rendered only in this browser session. BPMN Lens does not invent product meaning for an arbitrary file.</p>`;
    await importXml(xml);
    updateUrl();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "The local file could not be opened.";
  } finally {
    filePicker.value = "";
  }
});

get<HTMLButtonElement>("#zoom-in").addEventListener("click", () => {
  const canvas = viewer.get("canvas");
  canvas.zoom(Math.min(4, canvas.zoom() * 1.2));
});
get<HTMLButtonElement>("#zoom-out").addEventListener("click", () => {
  const canvas = viewer.get("canvas");
  canvas.zoom(Math.max(0.2, canvas.zoom() / 1.2));
});
get<HTMLButtonElement>("#zoom-fit").addEventListener("click", () => viewer.get("canvas").zoom("fit-viewport"));
get<HTMLButtonElement>("#about-button").addEventListener("click", () => dialog.showModal());
get<HTMLButtonElement>("#close-about").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

async function start(): Promise<void> {
  try {
    catalog = await loadCatalog();
    get<HTMLSpanElement>("#diagram-count").textContent = String(catalog.diagrams.length);
    renderList();
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("diagram");
    const initial = catalog.diagrams.find((item) => item.id === requestedId) || catalog.diagrams[0];
    if (!initial) throw new Error("The catalog contains no diagrams.");
    await openBundled(initial.id, params.get("element") || undefined);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "BPMN Lens could not start.";
  }
}

void start();
