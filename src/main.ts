import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import "bpmn-js/dist/assets/diagram-js.css";
import "./styles.css";
import { loadBundledDiagram, loadCatalog } from "./content";
import { activeFilterLabels, filterCatalog, groupCatalog } from "./catalog";
import type { CatalogFilters } from "./catalog";
import { nextDrawer, wrappedFocusIndex } from "./drawers";
import type { Drawer } from "./drawers";
import { adjacentElement, elementBounds, focusViewbox, navigableElements } from "./focus";
import { notationFor, notationPlacement } from "./notation";
import { buildOutline, filterOutline } from "./outline";
import type { OutlineItem } from "./outline";
import { adjustPanelWidth, clampPanelWidth, defaultPanelWidth, panelWidthBounds } from "./panels";
import type { PanelKind } from "./panels";
import { tracePath } from "./trace";
import type { TraceDirection } from "./trace";
import type { Catalog, CatalogItem, DiagramExplanation, ElementExplanation } from "./types";
import { actualSizeViewbox, diagramBounds, widthViewbox } from "./view";
import type { ViewMode } from "./view";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root is missing.");

app.innerHTML = `
  <header class="app-header">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">◇</span>
      <div><strong>BPMN Lens</strong><span>Local process explorer</span></div>
    </div>
    <div class="view-actions" aria-label="Workspace panels">
      <button id="toggle-processes" class="panel-toggle" type="button" aria-label="Hide processes panel" aria-controls="diagram-nav" aria-expanded="true">
        <span aria-hidden="true">◧</span><span class="panel-toggle-label">Processes</span>
      </button>
      <button id="toggle-details" class="panel-toggle" type="button" aria-label="Hide details panel" aria-controls="explanation-panel" aria-expanded="true">
        <span aria-hidden="true">◨</span><span class="panel-toggle-label">Details</span>
      </button>
    </div>
    <div class="header-actions">
      <label class="file-action" for="file-picker">Open BPMN</label>
      <input id="file-picker" type="file" accept=".bpmn,.xml,application/xml,text/xml" />
      <button id="about-button" class="quiet-button" type="button">About</button>
    </div>
  </header>
  <button id="drawer-backdrop" class="drawer-backdrop" type="button" aria-label="Close open panel" hidden tabindex="-1"></button>
  <div id="workspace" class="workspace">
    <nav id="diagram-nav" class="diagram-nav" aria-label="BPMN explorer" tabindex="-1">
      <div class="panel-heading">
        <div><span class="eyebrow">Capability suite</span><h1>Explore</h1></div>
        <span id="diagram-count" class="count"></span>
        <button id="close-processes-drawer" class="drawer-close" type="button" aria-label="Close processes drawer">×</button>
      </div>
      <div class="nav-tabs" role="tablist" aria-label="Explorer view">
        <button id="processes-tab" role="tab" type="button" aria-selected="true" aria-controls="processes-view">Processes</button>
        <button id="outline-tab" role="tab" type="button" aria-selected="false" aria-controls="outline-view" tabindex="-1">Outline</button>
      </div>
      <div id="processes-view" role="tabpanel" aria-labelledby="processes-tab">
        <form id="catalog-filters" class="catalog-filters" aria-label="Filter processes">
          <label class="catalog-title-filter"><span>Title</span><input id="catalog-search" type="search" autocomplete="off" placeholder="Find a process" /></label>
          <div class="catalog-filter-grid">
            <label><span>Classification</span><select id="catalog-classification">
              <option value="all">All</option><option value="observed-current">Observed current</option><option value="target">Target</option><option value="target-partial">Target partial</option><option value="target-unimplemented">Target unimplemented</option>
            </select></label>
            <label><span>Implementation</span><select id="catalog-implementation">
              <option value="all">All</option><option value="current">Current</option><option value="partial">Partial</option><option value="unimplemented">Unimplemented</option>
            </select></label>
            <label><span>Channel</span><select id="catalog-channel">
              <option value="all">All</option><option value="tui">TUI</option><option value="web">Web</option>
            </select></label>
          </div>
          <div class="catalog-filter-status"><span id="catalog-result-count" role="status"></span><button id="catalog-clear" type="button" hidden>Clear</button></div>
          <p id="catalog-active-filters" class="catalog-active-filters"></p>
        </form>
        <div id="diagram-list" class="diagram-list"></div>
        <div class="legend">
          <span><i class="dot current"></i>Observed current</span>
          <span><i class="dot target"></i>Target or partial</span>
        </div>
      </div>
      <div id="outline-view" class="outline-view" role="tabpanel" aria-labelledby="outline-tab" hidden>
        <label class="outline-search-label" for="outline-search">Find an element</label>
        <input id="outline-search" type="search" autocomplete="off" placeholder="Label or BPMN type" />
        <p id="outline-status" class="outline-status" role="status"></p>
        <ul id="outline-list" class="outline-list" aria-label="Diagram elements"></ul>
      </div>
    </nav>
    <div id="processes-resizer" class="panel-resizer" role="separator" aria-label="Resize processes panel" aria-controls="diagram-nav" aria-orientation="vertical" tabindex="0" title="Drag or use arrow keys; Home or double-click resets"></div>
    <main class="diagram-region">
      <div class="diagram-toolbar">
        <div class="diagram-title-block">
          <span id="classification" class="classification"></span>
          <h2 id="diagram-title">Loading diagrams…</h2>
        </div>
        <div class="diagram-controls">
          <div id="focus-controls" class="focus-controls" aria-label="Selection focus" hidden>
            <button id="focus-previous" type="button" title="Previous element (P)">← <span>Previous</span></button>
            <button id="focus-next" type="button" title="Next element (N)"><span>Next</span> →</button>
          </div>
          <div id="trace-controls" class="trace-controls" aria-label="Trace selected path" hidden>
            <button id="trace-upstream" type="button" title="Trace incoming path" aria-pressed="false">Upstream</button>
            <button id="trace-downstream" type="button" title="Trace outgoing path" aria-pressed="false">Downstream</button>
            <button id="trace-both" type="button" title="Trace incoming and outgoing paths" aria-pressed="false">Both</button>
            <button id="trace-clear" type="button" title="Clear path trace" hidden>Clear</button>
          </div>
          <div class="zoom-controls" aria-label="Diagram view">
            <button id="view-overview" type="button" title="Fit complete diagram (0)" aria-pressed="true">Overview</button>
            <button id="view-width" type="button" title="Fit diagram width (W)" aria-pressed="false">Width</button>
            <button id="view-selection" type="button" title="Fit selected element (F)" aria-pressed="false" disabled>Selection</button>
            <button id="view-actual" type="button" title="One diagram unit per CSS pixel (1)" aria-pressed="false">100%</button>
            <button id="zoom-out" type="button" aria-label="Zoom out" title="Zoom out (−)">−</button>
            <button id="zoom-in" type="button" aria-label="Zoom in" title="Zoom in (+)">+</button>
          </div>
        </div>
      </div>
      <div id="diagram-canvas" tabindex="0" aria-label="Interactive read-only BPMN diagram"></div>
      <aside id="notation-overlay" class="notation-overlay" aria-live="polite" hidden>
        <button id="close-notation" class="notation-close" type="button" aria-label="Close notation explanation">×</button>
        <div id="notation-content" class="notation-content">
          <span class="eyebrow">BPMN notation</span>
          <h3 id="notation-title"></h3>
          <p id="notation-symbol" class="notation-symbol"></p>
          <p id="notation-meaning" class="notation-meaning"></p>
          <p id="notation-selection" class="notation-selection"></p>
        </div>
      </aside>
      <p id="status" class="status" role="status" aria-live="polite">Preparing the local viewer…</p>
    </main>
    <div id="details-resizer" class="panel-resizer" role="separator" aria-label="Resize details panel" aria-controls="explanation-panel" aria-orientation="vertical" tabindex="0" title="Drag or use arrow keys; Home or double-click resets"></div>
    <aside id="explanation-panel" class="explanation-panel" aria-labelledby="explanation-title" tabindex="-1">
      <button id="close-details-drawer" class="drawer-close" type="button" aria-label="Close details drawer">×</button>
      <section id="notation-dock" class="notation-dock" aria-live="polite" hidden></section>
      <div id="explanation-content"></div>
    </aside>
  </div>
  <dialog id="about-dialog">
    <div class="dialog-heading"><h2>About BPMN Lens</h2><button id="close-about" type="button" aria-label="Close">×</button></div>
    <p>This is a read-only design companion. It renders BPMN locally and keeps explanatory claims in reviewable JSON sidecars.</p>
    <p><strong>Current</strong> means observed or executable evidence supports the behavior. <strong>Target</strong> means a product or data contract says the behavior should exist; it is not an implementation claim.</p>
    <p>No BPMN file is uploaded. Files opened from your computer remain in this browser session.</p>
    <p><strong>Keyboard:</strong> <kbd>[</kbd>/<kbd>]</kbd> panels, <kbd>0</kbd> overview, <kbd>W</kbd> width, <kbd>F</kbd> selection, <kbd>1</kbd> 100%, <kbd>P</kbd>/<kbd>N</kbd> previous/next, <kbd>Esc</kbd> close notation.</p>
  </dialog>
`;

const get = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
};

const list = get<HTMLDivElement>("#diagram-list");
const catalogSearch = get<HTMLInputElement>("#catalog-search");
const catalogClassification = get<HTMLSelectElement>("#catalog-classification");
const catalogImplementation = get<HTMLSelectElement>("#catalog-implementation");
const catalogChannel = get<HTMLSelectElement>("#catalog-channel");
const catalogResultCount = get<HTMLSpanElement>("#catalog-result-count");
const catalogActiveFilters = get<HTMLParagraphElement>("#catalog-active-filters");
const catalogClear = get<HTMLButtonElement>("#catalog-clear");
const title = get<HTMLHeadingElement>("#diagram-title");
const classification = get<HTMLSpanElement>("#classification");
const explanationContent = get<HTMLDivElement>("#explanation-content");
const status = get<HTMLParagraphElement>("#status");
const filePicker = get<HTMLInputElement>("#file-picker");
const dialog = get<HTMLDialogElement>("#about-dialog");
const notationOverlay = get<HTMLElement>("#notation-overlay");
const notationDock = get<HTMLElement>("#notation-dock");
const notationContent = get<HTMLDivElement>("#notation-content");
const workspace = get<HTMLDivElement>("#workspace");
const diagramRegion = get<HTMLElement>(".diagram-region");
const diagramNav = get<HTMLElement>("#diagram-nav");
const explanationPanel = get<HTMLElement>("#explanation-panel");
const processesToggle = get<HTMLButtonElement>("#toggle-processes");
const detailsToggle = get<HTMLButtonElement>("#toggle-details");
const drawerBackdrop = get<HTMLButtonElement>("#drawer-backdrop");
const processesResizer = get<HTMLDivElement>("#processes-resizer");
const detailsResizer = get<HTMLDivElement>("#details-resizer");
const diagramCanvas = get<HTMLDivElement>("#diagram-canvas");
const focusControls = get<HTMLDivElement>("#focus-controls");
const traceControls = get<HTMLDivElement>("#trace-controls");
const processesView = get<HTMLDivElement>("#processes-view");
const outlineView = get<HTMLDivElement>("#outline-view");
const processesTab = get<HTMLButtonElement>("#processes-tab");
const outlineTab = get<HTMLButtonElement>("#outline-tab");
const outlineSearch = get<HTMLInputElement>("#outline-search");
const outlineList = get<HTMLUListElement>("#outline-list");
const outlineStatus = get<HTMLParagraphElement>("#outline-status");
const viewer = new NavigatedViewer({ container: "#diagram-canvas" });

let catalog: Catalog;
let activeItem: CatalogItem | undefined;
let activeExplanation: DiagramExplanation | undefined;
let selectedElementId: string | undefined;
let activeViewMode: ViewMode = "overview";
let focusOrder: ReturnType<typeof navigableElements> = [];
let outlineItems: OutlineItem[] = [];
let activeNavView: "processes" | "outline" = "processes";
let traceDirection: TraceDirection | undefined;
let traceMarkerIds = new Set<string>();
let notationDismissed = false;
let catalogFilters: CatalogFilters = { query: "", classification: "all", implementation: "all", channel: "all" };
let processesWidth = defaultPanelWidth("processes");
let detailsWidth = defaultPanelWidth("details");
let applyingNamedView = false;
let resizeFrame: number | undefined;
const panelStorageKey = "bpmn-lens.panels.v2";
const legacyPanelStorageKey = "bpmn-lens.panels.v1";
let processesOpen = true;
let detailsOpen = true;
const narrowMedia = window.matchMedia("(max-width: 60rem)");
let activeDrawer: Drawer | undefined;
let drawerReturnFocus: HTMLElement | undefined;

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

function loadPanelPreferences(): void {
  try {
    const stored = JSON.parse(window.localStorage.getItem(panelStorageKey) || window.localStorage.getItem(legacyPanelStorageKey) || "{}") as {
      processesOpen?: boolean;
      detailsOpen?: boolean;
      processesWidth?: number;
      detailsWidth?: number;
    };
    if (typeof stored.processesOpen === "boolean") processesOpen = stored.processesOpen;
    if (typeof stored.detailsOpen === "boolean") detailsOpen = stored.detailsOpen;
    if (typeof stored.processesWidth === "number") processesWidth = clampPanelWidth("processes", stored.processesWidth);
    if (typeof stored.detailsWidth === "number") detailsWidth = clampPanelWidth("details", stored.detailsWidth);
  } catch {
    // Invalid or unavailable local storage falls back to the fully open workspace.
  }
}

function savePanelPreferences(): void {
  try {
    window.localStorage.setItem(panelStorageKey, JSON.stringify({ processesOpen, detailsOpen, processesWidth, detailsWidth }));
  } catch {
    // Panel controls remain functional when storage is unavailable.
  }
}

function updateResizer(handle: HTMLElement, kind: PanelKind, width: number): void {
  const bounds = panelWidthBounds(kind);
  handle.setAttribute("aria-valuemin", String(bounds.min));
  handle.setAttribute("aria-valuemax", String(bounds.max));
  handle.setAttribute("aria-valuenow", String(width));
  handle.setAttribute("aria-valuetext", `${width} pixels`);
}

function applyPanelWidths(): void {
  workspace.style.setProperty("--processes-column", `${processesWidth}px`);
  workspace.style.setProperty("--details-column", `${detailsWidth}px`);
  updateResizer(processesResizer, "processes", processesWidth);
  updateResizer(detailsResizer, "details", detailsWidth);
}

function setFocusVisual(active: boolean): void {
  if (selectedElementId) {
    const canvas = viewer.get("canvas");
    if (active) canvas.addMarker(selectedElementId, "is-focused");
    else canvas.removeMarker(selectedElementId, "is-focused");
  }
  diagramCanvas.classList.toggle("focus-mode", active);
}

function applyActiveView(announce = false): void {
  const canvas = viewer.get("canvas");
  const bounds = diagramBounds(viewer.get("elementRegistry").getAll());
  setFocusVisual(activeViewMode === "selection");
  applyingNamedView = true;
  try {
    if (activeViewMode === "overview") canvas.zoom("fit-viewport");
    else if (activeViewMode === "width" && bounds) {
      canvas.viewbox(widthViewbox(bounds, diagramCanvas.clientWidth / diagramCanvas.clientHeight));
    } else if (activeViewMode === "selection" && selectedElementId) {
      const element = viewer.get("elementRegistry").get(selectedElementId);
      const selectedBounds = element && elementBounds(element);
      if (selectedBounds) canvas.viewbox(focusViewbox(selectedBounds));
    } else if (activeViewMode === "actual" && bounds) {
      canvas.viewbox(actualSizeViewbox(bounds, diagramCanvas.clientWidth, diagramCanvas.clientHeight));
    }
  } finally {
    applyingNamedView = false;
  }
  updateViewControls();
  updateUrl(activeItem?.id, selectedElementId);
  if (announce) status.textContent = viewStatus(activeViewMode);
}

function applyPanelLayout(refit = true): void {
  const narrow = narrowMedia.matches;
  const processesVisible = narrow ? activeDrawer === "processes" : processesOpen;
  const detailsVisible = narrow ? activeDrawer === "details" : detailsOpen;
  workspace.classList.toggle("processes-collapsed", !processesOpen);
  workspace.classList.toggle("details-collapsed", !detailsOpen);
  workspace.classList.toggle("processes-drawer-open", narrow && processesVisible);
  workspace.classList.toggle("details-drawer-open", narrow && detailsVisible);
  diagramNav.hidden = !processesVisible;
  explanationPanel.hidden = !detailsVisible;
  processesResizer.hidden = narrow || !processesOpen;
  detailsResizer.hidden = narrow || !detailsOpen;
  drawerBackdrop.hidden = !narrow || !activeDrawer;
  diagramRegion.inert = narrow && Boolean(activeDrawer);
  processesToggle.setAttribute("aria-expanded", String(processesVisible));
  detailsToggle.setAttribute("aria-expanded", String(detailsVisible));
  processesToggle.title = `${processesVisible ? "Close" : "Open"} processes ${narrow ? "drawer" : "panel"} ([)`;
  detailsToggle.title = `${detailsVisible ? "Close" : "Open"} details ${narrow ? "drawer" : "panel"} (])`;
  processesToggle.setAttribute("aria-label", `${processesVisible ? "Close" : "Open"} processes ${narrow ? "drawer" : "panel"}`);
  detailsToggle.setAttribute("aria-label", `${detailsVisible ? "Close" : "Open"} details ${narrow ? "drawer" : "panel"}`);
  processesToggle.classList.toggle("is-collapsed", !processesVisible);
  detailsToggle.classList.toggle("is-collapsed", !detailsVisible);
  placeNotation();
  applyPanelWidths();
  if (refit && activeViewMode !== "manual") window.requestAnimationFrame(() => applyActiveView(false));
}

function toggleProcesses(): void {
  if (narrowMedia.matches) {
    toggleDrawer("processes", processesToggle);
    return;
  }
  processesOpen = !processesOpen;
  savePanelPreferences();
  applyPanelLayout();
}

function toggleDetails(): void {
  if (narrowMedia.matches) {
    toggleDrawer("details", detailsToggle);
    return;
  }
  detailsOpen = !detailsOpen;
  savePanelPreferences();
  applyPanelLayout();
}

function toggleDrawer(requested: Drawer, returnFocus: HTMLElement): void {
  activeDrawer = nextDrawer(activeDrawer, requested);
  drawerReturnFocus = activeDrawer ? returnFocus : drawerReturnFocus;
  applyPanelLayout();
  if (activeDrawer) {
    const panel = activeDrawer === "processes" ? diagramNav : explanationPanel;
    window.requestAnimationFrame(() => {
      const first = panel.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex='0']");
      (first || panel).focus();
    });
  } else {
    drawerReturnFocus?.focus();
    drawerReturnFocus = undefined;
  }
}

function closeDrawer(returnFocus = true): void {
  if (!activeDrawer) return;
  const target = drawerReturnFocus;
  activeDrawer = undefined;
  drawerReturnFocus = undefined;
  applyPanelLayout();
  if (returnFocus) target?.focus();
}

function setupResizer(handle: HTMLElement, kind: PanelKind): void {
  const getWidth = (): number => kind === "processes" ? processesWidth : detailsWidth;
  const setWidth = (width: number): void => {
    if (kind === "processes") processesWidth = clampPanelWidth(kind, width);
    else detailsWidth = clampPanelWidth(kind, width);
    applyPanelWidths();
  };
  const finish = (): void => {
    document.body.classList.remove("is-resizing");
    handle.classList.remove("is-resizing");
    savePanelPreferences();
    if (activeViewMode !== "manual") window.requestAnimationFrame(() => applyActiveView(false));
  };
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = getWidth();
    handle.setPointerCapture(event.pointerId);
    handle.classList.add("is-resizing");
    document.body.classList.add("is-resizing");
    const move = (moveEvent: PointerEvent): void => {
      const delta = moveEvent.clientX - startX;
      setWidth(startWidth + (kind === "processes" ? delta : -delta));
    };
    const stop = (): void => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      finish();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  });
  handle.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home") return;
    event.preventDefault();
    setWidth(adjustPanelWidth(kind, getWidth(), event.key, event.shiftKey));
    finish();
    status.textContent = `${kind === "processes" ? "Processes" : "Details"} panel width ${getWidth()} pixels.`;
  });
  handle.addEventListener("dblclick", () => {
    setWidth(defaultPanelWidth(kind));
    finish();
    status.textContent = `${kind === "processes" ? "Processes" : "Details"} panel width reset.`;
  });
}

function placeNotation(): void {
  const effectiveDetailsOpen = narrowMedia.matches ? activeDrawer === "details" : detailsOpen;
  const placement = notationPlacement(effectiveDetailsOpen, Boolean(selectedElementId), notationDismissed);
  notationOverlay.hidden = placement !== "overlay";
  notationDock.hidden = placement !== "dock";
  if (placement === "dock" && notationContent.parentElement !== notationDock) notationDock.append(notationContent);
  if (placement === "overlay" && notationContent.parentElement !== notationOverlay) notationOverlay.append(notationContent);
}

function hideNotation(): void {
  notationDismissed = true;
  placeNotation();
}

function showNotation(type: string, selectedLabel?: string): void {
  const notation = notationFor(type);
  get<HTMLHeadingElement>("#notation-title").textContent = notation.title;
  get<HTMLParagraphElement>("#notation-symbol").textContent = notation.symbol;
  get<HTMLParagraphElement>("#notation-meaning").textContent = notation.meaning;
  const selection = get<HTMLParagraphElement>("#notation-selection");
  selection.textContent = selectedLabel ? `Selected: ${selectedLabel}` : "";
  selection.hidden = !selectedLabel;
  notationDismissed = false;
  placeNotation();
}

function updateUrl(diagramId?: string, elementId?: string): void {
  const url = new URL(window.location.href);
  if (diagramId) url.searchParams.set("diagram", diagramId);
  else url.searchParams.delete("diagram");
  if (elementId) url.searchParams.set("element", elementId);
  else url.searchParams.delete("element");
  if (activeViewMode === "selection" && elementId) url.searchParams.set("view", "focus");
  else url.searchParams.delete("view");
  window.history.replaceState(null, "", url);
}

function updateViewControls(): void {
  focusControls.hidden = !selectedElementId;
  get<HTMLButtonElement>("#focus-previous").disabled = focusOrder.length < 2;
  get<HTMLButtonElement>("#focus-next").disabled = focusOrder.length < 2;
  get<HTMLButtonElement>("#view-selection").disabled = !selectedElementId;
  for (const mode of ["overview", "width", "selection", "actual"] as const) {
    get<HTMLButtonElement>(`#view-${mode}`).setAttribute("aria-pressed", String(activeViewMode === mode));
  }
}

function updateTraceControls(): void {
  traceControls.hidden = !selectedElementId;
  for (const direction of ["upstream", "downstream", "both"] as const) {
    get<HTMLButtonElement>(`#trace-${direction}`).setAttribute("aria-pressed", String(traceDirection === direction));
  }
  get<HTMLButtonElement>("#trace-clear").hidden = !traceDirection;
}

function removeTraceMarkers(): void {
  const canvas = viewer.get("canvas");
  for (const id of traceMarkerIds) canvas.removeMarker(id, "is-traced");
  traceMarkerIds = new Set();
  diagramCanvas.classList.remove("trace-mode");
}

function clearTrace(announce = true): void {
  removeTraceMarkers();
  traceDirection = undefined;
  updateTraceControls();
  if (announce) status.textContent = "Path trace cleared.";
}

function applyTrace(direction: TraceDirection, announce = true): void {
  if (!selectedElementId) return;
  const registry = viewer.get("elementRegistry");
  const selected = registry.get(selectedElementId);
  if (!selected) return;
  removeTraceMarkers();
  traceDirection = direction;
  const canvas = viewer.get("canvas");
  const traced = tracePath(selected, direction);
  for (const id of traced) {
    canvas.addMarker(id, "is-traced");
    traceMarkerIds.add(id);
    const label = registry.get(`${id}_label`);
    if (label) {
      canvas.addMarker(label.id, "is-traced");
      traceMarkerIds.add(label.id);
    }
  }
  diagramCanvas.classList.add("trace-mode");
  setViewMode("overview", false);
  updateTraceControls();
  if (announce) {
    const label = direction === "both" ? "upstream and downstream" : direction;
    status.textContent = `Tracing ${label} from the selected element. ${traced.size} path elements shown.`;
  }
}

function viewStatus(mode: ViewMode): string {
  const labels: Record<ViewMode, string> = {
    overview: "Overview fitted to the complete diagram.",
    width: "Diagram width fitted to the canvas.",
    selection: "Selection fitted. Use Previous, Next, or Overview to continue.",
    actual: "100% view: one diagram unit per CSS pixel.",
    manual: "Manual zoom view."
  };
  return labels[mode];
}

function setViewMode(mode: Exclude<ViewMode, "manual">, announce = true): void {
  if (mode === "selection" && !selectedElementId) return;
  activeViewMode = mode;
  applyActiveView(announce);
}

function moveFocus(direction: -1 | 1): void {
  if (!selectedElementId) return;
  const next = adjacentElement(focusOrder, selectedElementId, direction);
  if (next) selectElement(next.id, true);
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
  const filtered = filterCatalog(catalog.diagrams, catalogFilters);
  const groups = groupCatalog(filtered);
  const activeLabels = activeFilterLabels(catalogFilters);
  catalogResultCount.textContent = `${filtered.length} of ${catalog.diagrams.length} processes`;
  catalogActiveFilters.textContent = activeLabels.length ? `Active: ${activeLabels.join(" · ")}` : "No active filters";
  catalogClear.hidden = activeLabels.length === 0;
  if (!groups.length) {
    list.innerHTML = '<div class="catalog-empty">No processes match these filters.</div>';
    return;
  }
  list.innerHTML = groups.map((group) => `
    <section class="catalog-group" aria-labelledby="catalog-group-${group.id}">
      <h2 id="catalog-group-${group.id}"><span>${escapeHtml(group.label)}</span><small>${group.items.length}</small></h2>
      <div class="catalog-group-items">
        ${group.items.map((item) => {
          const index = catalog.diagrams.findIndex((candidate) => candidate.id === item.id);
          return `<button class="diagram-item ${item.id === activeItem?.id ? "active" : ""}" type="button" data-diagram-id="${escapeHtml(item.id)}">
            <span class="diagram-number">${String(index + 1).padStart(2, "0")}</span>
            <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(classLabel(item.classification))} · ${item.channels.map((channel) => channel.toUpperCase()).join("/")}</small></span>
          </button>`;
        }).join("")}
      </div>
    </section>
  `).join("");
  for (const button of list.querySelectorAll<HTMLButtonElement>("[data-diagram-id]")) {
    button.addEventListener("click", async () => {
      await openBundled(button.dataset.diagramId || "");
      if (narrowMedia.matches) {
        closeDrawer(false);
        diagramCanvas.focus();
      }
    });
  }
}

function updateCatalogFilters(): void {
  catalogFilters = {
    query: catalogSearch.value,
    classification: catalogClassification.value as CatalogFilters["classification"],
    implementation: catalogImplementation.value as CatalogFilters["implementation"],
    channel: catalogChannel.value as CatalogFilters["channel"]
  };
  renderList();
}

function syncOutlineSelection(): void {
  for (const button of outlineList.querySelectorAll<HTMLButtonElement>("[data-outline-id]")) {
    const selected = button.dataset.outlineId === selectedElementId;
    button.classList.toggle("active", selected);
    if (selected) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
}

function renderOutline(): void {
  const filtered = filterOutline(outlineItems, outlineSearch.value);
  outlineStatus.textContent = outlineItems.length
    ? `${filtered.length} of ${outlineItems.length} elements`
    : "No tasks, events, gateways, lanes, or named paths in this diagram.";
  if (!filtered.length) {
    outlineList.innerHTML = outlineItems.length ? '<li class="outline-empty">No elements match this search.</li>' : "";
    return;
  }
  outlineList.innerHTML = filtered.map((item) => `
    <li><button type="button" data-outline-id="${escapeHtml(item.id)}">
      <span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.typeLabel)}</small>
    </button></li>
  `).join("");
  for (const button of outlineList.querySelectorAll<HTMLButtonElement>("[data-outline-id]")) {
    button.addEventListener("click", () => {
      selectElement(button.dataset.outlineId || "", true);
      if (narrowMedia.matches) {
        closeDrawer(false);
        diagramCanvas.focus();
      }
    });
  }
  syncOutlineSelection();
}

function setNavView(view: "processes" | "outline", focusTab = false): void {
  activeNavView = view;
  const showProcesses = view === "processes";
  processesView.hidden = !showProcesses;
  outlineView.hidden = showProcesses;
  processesTab.setAttribute("aria-selected", String(showProcesses));
  outlineTab.setAttribute("aria-selected", String(!showProcesses));
  processesTab.tabIndex = showProcesses ? 0 : -1;
  outlineTab.tabIndex = showProcesses ? -1 : 0;
  if (focusTab) (showProcesses ? processesTab : outlineTab).focus();
}

async function importXml(xml: string): Promise<void> {
  clearTrace(false);
  const result = await viewer.importXML(xml);
  focusOrder = navigableElements(viewer.get("elementRegistry").getAll());
  outlineItems = buildOutline(viewer.get("elementRegistry").getAll());
  outlineSearch.value = "";
  renderOutline();
  activeViewMode = "overview";
  diagramCanvas.classList.remove("focus-mode");
  updateViewControls();
  updateTraceControls();
  applyActiveView(false);
  status.textContent = result.warnings.length ? `Opened with ${result.warnings.length} BPMN warning(s).` : "Diagram ready. Select an element to explain it.";
}

async function openBundled(id: string, requestedElement?: string, requestedFocus = false): Promise<void> {
  const item = catalog.diagrams.find((candidate) => candidate.id === id);
  if (!item) return;
  status.textContent = `Opening ${item.title}…`;
  try {
    const loaded = await loadBundledDiagram(item);
    activeItem = item;
    activeExplanation = loaded.explanation;
    selectedElementId = undefined;
    activeViewMode = "overview";
    hideNotation();
    title.textContent = item.title;
    classification.textContent = classLabel(item.classification);
    classification.dataset.kind = item.classification;
    renderList();
    renderDiagramExplanation(loaded.explanation);
    await importXml(loaded.xml);
    updateUrl(item.id);
    if (requestedElement) selectElement(requestedElement, requestedFocus);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "The diagram could not be opened.";
  }
}

function selectElement(id: string, shouldFocus = false): void {
  const element = viewer.get("elementRegistry").get(id);
  if (!element) return;
  const explanation = activeExplanation?.elements[id];
  const canvas = viewer.get("canvas");
  if (selectedElementId) {
    canvas.removeMarker(selectedElementId, "is-explained");
    if (selectedElementId !== id) canvas.removeMarker(selectedElementId, "is-focused");
  }
  selectedElementId = id;
  canvas.addMarker(id, "is-explained");
  const type = element.businessObject?.$type || element.type;
  const label = explanation?.label || element.businessObject?.name;
  if (explanation) renderElementExplanation(explanation);
  showNotation(type, label);
  syncOutlineSelection();
  updateViewControls();
  updateTraceControls();
  if (shouldFocus || activeViewMode === "selection") setViewMode("selection");
  else updateUrl(activeItem?.id, id);
  if (traceDirection) applyTrace(traceDirection);
}

viewer.get("eventBus").on("element.click", (event) => {
  const element = event.element;
  const businessObject = element?.businessObject;
  const id = businessObject?.id || element?.id;
  if (id) selectElement(id);
});

viewer.get("eventBus").on("canvas.viewbox.changed", () => {
  if (applyingNamedView) return;
  activeViewMode = "manual";
  setFocusVisual(false);
  updateViewControls();
  updateUrl(activeItem?.id, selectedElementId);
});

filePicker.addEventListener("change", async () => {
  const file = filePicker.files?.[0];
  if (!file) return;
  try {
    const xml = await file.text();
    activeItem = undefined;
    activeExplanation = undefined;
    selectedElementId = undefined;
    activeViewMode = "overview";
    focusOrder = [];
    hideNotation();
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
  activeViewMode = "manual";
  setFocusVisual(false);
  canvas.zoom(Math.min(4, canvas.zoom() * 1.2));
  updateViewControls();
  updateUrl(activeItem?.id, selectedElementId);
});
get<HTMLButtonElement>("#zoom-out").addEventListener("click", () => {
  const canvas = viewer.get("canvas");
  activeViewMode = "manual";
  setFocusVisual(false);
  canvas.zoom(Math.max(0.2, canvas.zoom() / 1.2));
  updateViewControls();
  updateUrl(activeItem?.id, selectedElementId);
});
get<HTMLButtonElement>("#view-overview").addEventListener("click", () => setViewMode("overview"));
get<HTMLButtonElement>("#view-width").addEventListener("click", () => setViewMode("width"));
get<HTMLButtonElement>("#view-selection").addEventListener("click", () => setViewMode("selection"));
get<HTMLButtonElement>("#view-actual").addEventListener("click", () => setViewMode("actual"));
get<HTMLButtonElement>("#focus-previous").addEventListener("click", () => moveFocus(-1));
get<HTMLButtonElement>("#focus-next").addEventListener("click", () => moveFocus(1));
get<HTMLButtonElement>("#trace-upstream").addEventListener("click", () => applyTrace("upstream"));
get<HTMLButtonElement>("#trace-downstream").addEventListener("click", () => applyTrace("downstream"));
get<HTMLButtonElement>("#trace-both").addEventListener("click", () => applyTrace("both"));
get<HTMLButtonElement>("#trace-clear").addEventListener("click", () => clearTrace());
processesToggle.addEventListener("click", toggleProcesses);
detailsToggle.addEventListener("click", toggleDetails);
drawerBackdrop.addEventListener("click", () => closeDrawer());
get<HTMLButtonElement>("#close-processes-drawer").addEventListener("click", () => closeDrawer());
get<HTMLButtonElement>("#close-details-drawer").addEventListener("click", () => closeDrawer());
setupResizer(processesResizer, "processes");
setupResizer(detailsResizer, "details");
get<HTMLFormElement>("#catalog-filters").addEventListener("submit", (event) => event.preventDefault());
catalogSearch.addEventListener("input", updateCatalogFilters);
catalogClassification.addEventListener("change", updateCatalogFilters);
catalogImplementation.addEventListener("change", updateCatalogFilters);
catalogChannel.addEventListener("change", updateCatalogFilters);
catalogClear.addEventListener("click", () => {
  catalogSearch.value = "";
  catalogClassification.value = "all";
  catalogImplementation.value = "all";
  catalogChannel.value = "all";
  updateCatalogFilters();
  catalogSearch.focus();
});
processesTab.addEventListener("click", () => setNavView("processes"));
outlineTab.addEventListener("click", () => setNavView("outline"));
for (const tab of [processesTab, outlineTab]) {
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setNavView(activeNavView === "processes" ? "outline" : "processes", true);
  });
}
outlineSearch.addEventListener("input", renderOutline);
outlineSearch.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown") return;
  const first = outlineList.querySelector<HTMLButtonElement>("[data-outline-id]");
  if (first) {
    event.preventDefault();
    first.focus();
  }
});
outlineList.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const buttons = [...outlineList.querySelectorAll<HTMLButtonElement>("[data-outline-id]")];
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
});
get<HTMLButtonElement>("#about-button").addEventListener("click", () => dialog.showModal());
get<HTMLButtonElement>("#close-about").addEventListener("click", () => dialog.close());
get<HTMLButtonElement>("#close-notation").addEventListener("click", hideNotation);
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
window.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement | null;
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (activeDrawer && event.key === "Escape") {
    event.preventDefault();
    closeDrawer();
    return;
  }
  if (activeDrawer && event.key === "Tab") {
    const panel = activeDrawer === "processes" ? diagramNav : explanationPanel;
    const focusable = [...panel.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex='0']")]
      .filter((element) => !element.hidden && element.getClientRects().length > 0);
    if (focusable.length) {
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      if (current < 0 || (event.shiftKey && current === 0) || (!event.shiftKey && current === focusable.length - 1)) {
        event.preventDefault();
        focusable[wrappedFocusIndex(focusable.length, current < 0 ? (event.shiftKey ? 0 : -1) : current, event.shiftKey ? -1 : 1)]?.focus();
      }
    }
    return;
  }
  if (target?.matches("input, textarea, select, button, [contenteditable='true']")) return;
  if (event.key === "[") {
    event.preventDefault();
    toggleProcesses();
  } else if (event.key === "]") {
    event.preventDefault();
    toggleDetails();
  } else if (event.key === "0") {
    event.preventDefault();
    setViewMode("overview");
  } else if (event.key.toLowerCase() === "w") {
    event.preventDefault();
    setViewMode("width");
  } else if (event.key.toLowerCase() === "f" && selectedElementId) {
    event.preventDefault();
    setViewMode("selection");
  } else if (event.key === "1") {
    event.preventDefault();
    setViewMode("actual");
  } else if (event.key.toLowerCase() === "p" && selectedElementId) {
    event.preventDefault();
    moveFocus(-1);
  } else if (event.key.toLowerCase() === "n" && selectedElementId) {
    event.preventDefault();
    moveFocus(1);
  } else if (event.key === "Escape" && !notationOverlay.hidden) {
    hideNotation();
  }
});

async function start(): Promise<void> {
  try {
    catalog = await loadCatalog();
    get<HTMLSpanElement>("#diagram-count").textContent = String(catalog.diagrams.length);
    renderList();
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("diagram");
    const initial = catalog.diagrams.find((item) => item.id === requestedId) || catalog.diagrams[0];
    if (!initial) throw new Error("The catalog contains no diagrams.");
    await openBundled(initial.id, params.get("element") || undefined, params.get("view") === "focus");
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "BPMN Lens could not start.";
  }
}

loadPanelPreferences();
applyPanelLayout(false);
narrowMedia.addEventListener("change", () => {
  activeDrawer = undefined;
  drawerReturnFocus = undefined;
  applyPanelLayout();
});
window.addEventListener("resize", () => {
  if (activeViewMode === "manual") return;
  if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = undefined;
    applyActiveView(false);
  });
});
void start();
