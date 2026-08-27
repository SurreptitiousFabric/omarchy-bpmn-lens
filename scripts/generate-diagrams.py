#!/usr/bin/env python3
"""Generate the nicelydrapped capability BPMN suite deterministically."""

from pathlib import Path
from xml.etree import ElementTree as ET
from heapq import heappop, heappush

OUT = Path(__file__).resolve().parent.parent / "public" / "content" / "diagrams"

NS = {
    "bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
    "bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
    "dc": "http://www.omg.org/spec/DD/20100524/DC",
    "di": "http://www.omg.org/spec/DD/20100524/DI",
}
for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)

LANES = ["User", "Frontend", "Application", "STEMMA / persistence"]
LANE_TOP = 80
LANE_MIN_HEIGHT = 140
LANE_PADDING = 32
STACK_GAP = 16


def q(prefix, name):
    return f"{{{NS[prefix]}}}{name}"


def event(node_id, label, lane, x, kind="task", note=""):
    return {"id": node_id, "label": label, "lane": lane, "x": x, "kind": kind, "note": note}


def flow(source, target, label=""):
    return {"source": source, "target": target, "label": label}


MODELS = [
    {
        "file": "01-current-tui-startup-navigation.bpmn",
        "name": "CURRENT — TUI startup, discovery, navigation, filter, and search",
        "status": "OBSERVED_CURRENT",
        "basis": "Direct PTY observation on 2026-08-27 using the mise-built cmd/tui binary; docs/demos tapes; tui-v1 master spec; Plan 4 reality audit.",
        "nodes": [
            event("start", "Start TUI", "User", 80, "start"),
            event("choose", "Choose Open or Create", "User", 260, "gateway"),
            event("scan", "Scan runtime root", "Frontend", 470),
            event("pick", "Pick candidate file", "User", 660),
            event("validate", "Validate candidate", "Application", 850),
            event("valid", "Candidate valid?", "Application", 1040, "gateway"),
            event("show_error", "Show failure and recovery guidance", "Frontend", 1230),
            event("create", "Enter new-file details", "Frontend", 470),
            event("create_ws", "Create workspace", "STEMMA / persistence", 660),
            event("open", "Open selected workspace", "STEMMA / persistence", 1420),
            event("load", "Load runtime surface", "Application", 1610),
            event("browse", "Browse Document, Dataset, and entities", "Frontend", 1800),
            event("discover", "Filter table or run plain/guided search", "Frontend", 1990),
            event("select", "Select qualified result", "User", 2180),
            event("inspect", "Inspect detail and contextual actions", "Frontend", 2370),
            event("back", "Return or continue browsing", "User", 2560, "gateway"),
            event("end", "Leave TUI", "User", 2750, "end"),
        ],
        "flows": [
            flow("start", "choose"), flow("choose", "scan", "Open"), flow("scan", "pick"),
            flow("pick", "validate"), flow("validate", "valid"), flow("valid", "show_error", "No"),
            flow("show_error", "pick", "Retry"), flow("choose", "create", "Create"),
            flow("create", "create_ws"), flow("create_ws", "open"), flow("valid", "open", "Yes"),
            flow("open", "load"), flow("load", "browse"), flow("browse", "discover"),
            flow("discover", "select"), flow("select", "inspect"), flow("inspect", "back"),
            flow("back", "browse", "Continue"), flow("back", "end", "Quit"),
        ],
    },
    {
        "file": "02-current-tui-edit-save.bpmn",
        "name": "CURRENT — TUI edit, collection CRUD, guarded delete, and save",
        "status": "OBSERVED_AND_TESTED_CURRENT",
        "basis": "Direct PTY observation of controlled choice editing; 65 shipped VHS scripts; full-editing contract; mutation-path audit and focused test evidence.",
        "nodes": [
            event("start", "Open an editable detail", "User", 80, "start"),
            event("action", "Choose scalar, choice, link, list, text, create, or delete action", "User", 260, "gateway"),
            event("editor", "Open contextual editor or picker", "Frontend", 470),
            event("stage", "Stage typed mutation", "Application", 660),
            event("cancel", "Cancel without mutation", "Frontend", 850),
            event("preflight", "Validate key, value, link, scope, and references", "Application", 850),
            event("accepted", "Mutation valid?", "Application", 1040, "gateway"),
            event("reject", "Show error; retain prior state", "Frontend", 1230),
            event("dirty", "Apply in memory and mark dirty", "Application", 1230),
            event("more", "Make more changes?", "User", 1420, "gateway"),
            event("save", "Request Save / Save As / Export XML", "User", 1610),
            event("persist", "Snapshot, apply, validate, atomic write", "STEMMA / persistence", 1800),
            event("saved", "Persistence succeeded?", "Application", 1990, "gateway"),
            event("refresh", "Reload surface/index; clear pending and dirty", "Application", 2180),
            event("retain", "Keep dirty state and pending edits; show recovery", "Frontend", 2180),
            event("end", "Continue working", "User", 2390, "end"),
        ],
        "flows": [
            flow("start", "action"), flow("action", "editor", "Edit/add/link/create"),
            flow("editor", "stage", "Commit candidate"), flow("editor", "cancel", "Cancel"),
            flow("cancel", "end"), flow("stage", "preflight"), flow("preflight", "accepted"),
            flow("accepted", "reject", "No"), flow("reject", "editor", "Correct"),
            flow("accepted", "dirty", "Yes"), flow("action", "dirty", "Confirmed delete"),
            flow("dirty", "more"), flow("more", "action", "Yes"), flow("more", "save", "No"),
            flow("save", "persist"), flow("persist", "saved"), flow("saved", "refresh", "Yes"),
            flow("saved", "retain", "No"), flow("refresh", "end"), flow("retain", "end"),
        ],
    },
    {
        "file": "03-target-shared-document-lifecycle.bpmn",
        "name": "TARGET — Channel-neutral Document lifecycle for TUI and web",
        "status": "TARGET_SHARED_PARTIAL",
        "basis": "Plan 4 GF-01; DocumentLifecycleService; architecture direction; TUI master spec. Backend preparation exists; shared reader/release and frontend consumption remain incomplete.",
        "nodes": [
            event("start", "Open Document intent", "User", 80, "start"),
            event("request", "Send channel-neutral request", "Frontend", 260),
            event("parse", "Parse source-preserving Document", "STEMMA / persistence", 450),
            event("select", "Select Dataset by qualified identity", "Application", 640),
            event("index", "Build qualified indexes", "Application", 830),
            event("resolve", "Resolve imports/dependencies", "Application", 1020),
            event("validate", "Run selected validation layers", "Application", 1210),
            event("state", "Ready, degraded, incomplete, or recoverable failure?", "Application", 1400, "gateway"),
            event("ready", "Expose editable reader context", "Frontend", 1590),
            event("degraded", "Explain limitations; apply explicit view/edit policy", "Frontend", 1590),
            event("failure", "Preserve prior context; offer retry/recovery", "Frontend", 1590),
            event("work", "Browse, search, navigate, or author", "User", 1800),
            event("close", "Close/release context", "Frontend", 1990),
            event("release", "Release caches and dependencies", "Application", 2180),
            event("end", "Context closed", "User", 2370, "end"),
        ],
        "flows": [
            flow("start", "request"), flow("request", "parse"), flow("parse", "select"),
            flow("select", "index"), flow("index", "resolve"), flow("resolve", "validate"),
            flow("validate", "state"), flow("state", "ready", "READY"),
            flow("state", "degraded", "DEGRADED / INCOMPLETE"), flow("state", "failure", "FAILURE / CANCEL"),
            flow("ready", "work"), flow("degraded", "work", "If policy allows"),
            flow("failure", "request", "Retry"), flow("work", "close"), flow("close", "release"),
            flow("release", "end"),
        ],
    },
    {
        "file": "04-target-evidence-to-conclusion.bpmn",
        "name": "TARGET — Evidence-first research from source material to conclusions",
        "status": "TARGET_STEMMA_CORE",
        "basis": "FamilyHistoryData.pdf sections 2, 3, 6.3.1, and 6.9; current Source/Citation/Resource/Matrix editing contracts; byhand event-participant provenance target.",
        "nodes": [
            event("start", "Encounter source material", "User", 80, "start"),
            event("describe", "Describe Citation and Resource", "User", 260),
            event("source", "Create or open Source / SourceLet", "Frontend", 450),
            event("frame", "Record frame: where, when, material links, quality", "User", 640),
            event("transcribe", "Transcribe or extract source content", "User", 830),
            event("profiles", "Model proto-subjects, dates, commentary, and properties", "Frontend", 1020),
            event("evidence", "Attach documentary evidence to subject/event context", "Application", 1210),
            event("correlate", "Compare and correlate evidence", "User", 1400),
            event("infer", "Inference required?", "User", 1590, "gateway"),
            event("reason", "Record reasoning, inference, and surety in genealogical data", "User", 1780),
            event("conclude", "Create or revise conclusional entities and typed links", "Frontend", 1970),
            event("trail", "Link conclusions back through reasoning and evidence", "Application", 2160),
            event("validate", "Validate identity, reference, and provenance semantics", "STEMMA / persistence", 2350),
            event("ok", "Valid?", "Application", 2540, "gateway"),
            event("repair", "Return exact finding for correction", "Frontend", 2730),
            event("save", "Persist evidence and conclusions without collapsing them", "STEMMA / persistence", 2730),
            event("end", "Research trail available for review", "User", 2940, "end"),
        ],
        "flows": [
            flow("start", "describe"), flow("describe", "source"), flow("source", "frame"),
            flow("frame", "transcribe"), flow("transcribe", "profiles"), flow("profiles", "evidence"),
            flow("evidence", "correlate"), flow("correlate", "infer"),
            flow("infer", "reason", "Yes"), flow("infer", "conclude", "No"),
            flow("reason", "conclude"), flow("conclude", "trail"), flow("trail", "validate"),
            flow("validate", "ok"), flow("ok", "repair", "No"), flow("repair", "frame", "Correct at source/model layer"),
            flow("ok", "save", "Yes"), flow("save", "end"),
        ],
    },
    {
        "file": "05-target-entity-link-authoring.bpmn",
        "name": "TARGET — Strict entity, container, collection, and link authoring",
        "status": "TARGET_MOSTLY_IMPLEMENTED_TUI_SHARED_PARTIAL",
        "basis": "Full STEMMA editing contract; TUI demos/audits; FamilyHistoryData.pdf sections 6.4–6.12; shared mutation lifecycle.",
        "nodes": [
            event("start", "Choose Dataset and construct", "User", 80, "start"),
            event("kind", "Person, Event, Place, Group, Animal, Source, Citation, Resource, Matrix, Narrative, Contact, Text, or container?", "User", 260, "gateway"),
            event("root", "Create/open strict entity or support root", "Frontend", 470),
            event("container", "Open Document/Dataset-owned container", "Frontend", 470),
            event("edit", "Edit scalar, controlled value, date, or metadata", "Frontend", 660),
            event("collection", "Add, edit, reorder, or delete collection item", "Frontend", 850),
            event("link", "Choose typed link target in correct Dataset scope", "Frontend", 1040),
            event("stage", "Stage candidate change set", "Application", 1230),
            event("validate", "Validate shape, key, scope, references, and dates", "Application", 1420),
            event("valid", "Candidate valid?", "Application", 1610, "gateway"),
            event("correct", "Show exact field/path and preserve prior state", "Frontend", 1800),
            event("commit", "Commit in-memory transaction and mark dirty", "Application", 1800),
            event("delete", "Delete or rename affects references?", "Application", 1990, "gateway"),
            event("impact", "Show impact; retarget or reject safely", "Frontend", 2180),
            event("save", "Save through shared persistence lifecycle", "STEMMA / persistence", 2370),
            event("end", "Updated construct remains navigable", "User", 2560, "end"),
        ],
        "flows": [
            flow("start", "kind"), flow("kind", "root", "Entity/support root"),
            flow("kind", "container", "Document/Dataset container"), flow("root", "edit"),
            flow("container", "edit"), flow("edit", "collection"), flow("collection", "link"),
            flow("link", "stage"), flow("stage", "validate"), flow("validate", "valid"),
            flow("valid", "correct", "No"), flow("correct", "edit"), flow("valid", "commit", "Yes"),
            flow("commit", "delete"), flow("delete", "impact", "Yes"), flow("impact", "stage", "Approved safe change"),
            flow("delete", "save", "No"), flow("save", "end"),
        ],
    },
    {
        "file": "06-target-narrative-transcription.bpmn",
        "name": "TARGET — Rich narrative, transcription, semantic markup, and reuse",
        "status": "TARGET_PARTIAL",
        "basis": "FamilyHistoryData.pdf sections 2, 6.3, 6.3.1–6.3.4; current basic narrative editor; advanced byhand narrative target PAR-650–656.",
        "nodes": [
            event("start", "Open Narrative or hosted Text", "User", 80, "start"),
            event("purpose", "Transcription or authored narrative?", "User", 260, "gateway"),
            event("transcribe", "Enter faithful text and transcription anomalies", "Frontend", 470),
            event("author", "Compose structured narrative sections", "Frontend", 470),
            event("segment", "Create/reorder Text segments and metadata", "Frontend", 660),
            event("markup", "Insert semantic entity/date references and descriptive markup", "Frontend", 850),
            event("reuse", "Reuse named Text with FromText where appropriate", "Frontend", 1040),
            event("cite", "Insert CitationRef, ResourceRef, links, and notes", "Frontend", 1230),
            event("review", "Preview rendered meaning and source XML diff", "Frontend", 1420),
            event("accept", "Accept changes?", "User", 1610, "gateway"),
            event("cancel", "Cancel and restore prior content", "Application", 1800),
            event("validate", "Validate mixed content, references, language, and metadata", "Application", 1800),
            event("valid", "Valid?", "Application", 1990, "gateway"),
            event("fix", "Focus exact segment/markup error", "Frontend", 2180),
            event("save", "Commit and preserve unrelated/raw content", "STEMMA / persistence", 2180),
            event("end", "Narrative remains searchable and navigable", "User", 2390, "end"),
        ],
        "flows": [
            flow("start", "purpose"), flow("purpose", "transcribe", "Transcription"),
            flow("purpose", "author", "Narrative work"), flow("transcribe", "segment"),
            flow("author", "segment"), flow("segment", "markup"), flow("markup", "reuse"),
            flow("reuse", "cite"), flow("cite", "review"), flow("review", "accept"),
            flow("accept", "cancel", "No"), flow("cancel", "end"), flow("accept", "validate", "Yes"),
            flow("validate", "valid"), flow("valid", "fix", "No"), flow("fix", "segment"),
            flow("valid", "save", "Yes"), flow("save", "end"),
        ],
    },
    {
        "file": "07-target-search-evidence-resource-trail.bpmn",
        "name": "TARGET — Search, semantic navigation, evidence trail, and Resource handoff",
        "status": "TARGET_PARTIAL",
        "basis": "TUI search contracts; Plan 4 GF-01; byhand evidence/preview and search targets; STEMMA narrative/detail links and Source trail semantics.",
        "nodes": [
            event("start", "Need to find or verify something", "User", 80, "start"),
            event("mode", "Choose filter, plain search, guided query, or semantic link", "Frontend", 260, "gateway"),
            event("query", "Execute bounded query in qualified context", "Application", 470),
            event("results", "Show typed, disambiguated results", "Frontend", 660),
            event("choose", "Select result", "User", 850),
            event("origin", "Create origin token and derivation edge", "Application", 1040),
            event("open", "Open exact entity, Text segment, finding, or evidence target", "Frontend", 1230),
            event("trail", "Follow Source → Citation → Resource or reasoning trail", "User", 1420),
            event("resource", "Resource requested?", "Application", 1610, "gateway"),
            event("rights", "Resolve locator and rights/access outcome", "Application", 1800),
            event("available", "Available and permitted?", "Application", 1990, "gateway"),
            event("handoff", "Safely hand off media/URI", "Frontend", 2180),
            event("unavailable", "Explain unavailable/restricted result", "Frontend", 2180),
            event("return", "Return using exact origin and preserved view state", "Frontend", 2370),
            event("end", "Continue research", "User", 2560, "end"),
        ],
        "flows": [
            flow("start", "mode"), flow("mode", "query", "Filter/plain/guided"),
            flow("query", "results"), flow("results", "choose"), flow("choose", "origin"),
            flow("mode", "origin", "Semantic/detail link"), flow("origin", "open"),
            flow("open", "trail"), flow("trail", "resource"), flow("resource", "return", "No"),
            flow("resource", "rights", "Yes"), flow("rights", "available"),
            flow("available", "handoff", "Yes"), flow("available", "unavailable", "No"),
            flow("handoff", "return"), flow("unavailable", "return"), flow("return", "end"),
        ],
    },
    {
        "file": "08-target-validation-persistence-interchange.bpmn",
        "name": "TARGET — Validation, safe persistence, recovery, and interchange",
        "status": "TARGET_PARTIAL",
        "basis": "TUI master spec; full-editing format contract; Plan 4 operation matrix; FamilyHistoryData.pdf validation/extensibility goals.",
        "nodes": [
            event("start", "User requests save, save-as, export, import, or package", "User", 80, "start"),
            event("operation", "Select operation", "Frontend", 260, "gateway"),
            event("validate", "Run syntax, schema, semantic, and reference validation", "Application", 470),
            event("valid", "Acceptable?", "Application", 660, "gateway"),
            event("findings", "Show stable findings; navigate and recheck", "Frontend", 850),
            event("snapshot", "Snapshot baseline and stage output", "STEMMA / persistence", 850),
            event("format", "Preserve current format, Save As protobuf, or Export XML", "Application", 1040),
            event("write", "Write temp, fsync, atomic replace, fsync directory", "STEMMA / persistence", 1230),
            event("verify", "Reopen and verify persisted result", "STEMMA / persistence", 1420),
            event("success", "Verified?", "Application", 1610, "gateway"),
            event("recover", "Restore/offer backup; retain dirty state", "Frontend", 1800),
            event("refresh", "Refresh indexes and clear accepted change set", "Application", 1800),
            event("package", "Include required Resources and manifest", "STEMMA / persistence", 1990),
            event("end", "Report exact outcome and path", "User", 2180, "end"),
        ],
        "flows": [
            flow("start", "operation"), flow("operation", "validate", "Save/Save As/Export"),
            flow("operation", "validate", "Import preview/package"), flow("validate", "valid"),
            flow("valid", "findings", "No"), flow("findings", "validate", "After repair"),
            flow("valid", "snapshot", "Yes"), flow("snapshot", "format"), flow("format", "write"),
            flow("write", "verify"), flow("verify", "success"), flow("success", "recover", "No"),
            flow("success", "refresh", "Yes"), flow("refresh", "package", "If packaging"),
            flow("refresh", "end", "Otherwise"), flow("package", "end"), flow("recover", "end"),
        ],
    },
    {
        "file": "09-target-tui-experience.bpmn",
        "name": "TARGET — TUI experience orchestration",
        "status": "TARGET_TUI_MIXED",
        "basis": "TUI master spec; expanded byhand WHAT-parity PAR-410–763; demo use-case map; Bubble Tea architecture contracts.",
        "nodes": [
            event("start", "Launch with keyboard", "User", 80, "start"),
            event("workspace", "Use startup chooser or workspace file workbench", "Frontend", 260),
            event("runtime", "Enter responsive two-pane shell", "Frontend", 450),
            event("navigate", "Navigate, resize, focus, promote, and return", "User", 640),
            event("discover", "Filter or search", "User", 830),
            event("intent", "Inspect or author?", "User", 1020, "gateway"),
            event("inspect", "Inspect detail, evidence, preview, and contextual help", "Frontend", 1210),
            event("author", "Use scalar, choice, tri-state, vocabulary, relationship, list, or narrative editor", "Frontend", 1210),
            event("commit", "Commit/cancel through deterministic message transition", "Application", 1400),
            event("dirty", "Show dirty, validation, and failure state honestly", "Frontend", 1590),
            event("persist", "Save, Save As, or Export XML", "User", 1780),
            event("outcome", "Show success or actionable recovery without losing edits", "Frontend", 1970),
            event("more", "Continue?", "User", 2160, "gateway"),
            event("end", "Quit safely", "User", 2350, "end"),
        ],
        "flows": [
            flow("start", "workspace"), flow("workspace", "runtime"), flow("runtime", "navigate"),
            flow("navigate", "discover"), flow("discover", "intent"), flow("intent", "inspect", "Inspect"),
            flow("intent", "author", "Author"), flow("inspect", "more"), flow("author", "commit"),
            flow("commit", "dirty"), flow("dirty", "persist"), flow("persist", "outcome"),
            flow("outcome", "more"), flow("more", "navigate", "Yes"), flow("more", "end", "No"),
        ],
    },
    {
        "file": "10-target-web-experience.bpmn",
        "name": "TARGET — Web experience over shared application workflows",
        "status": "TARGET_WEB_NOT_IMPLEMENTED",
        "basis": "Plan 4 channel-neutral architecture and GUI assessment; current web adapter is verified absent. This is an adapter design target, not a claim of existing web behavior or a STEMMA-mandated research process.",
        "nodes": [
            event("start", "Open web application", "User", 80, "start"),
            event("session", "Establish authorized session and workspace scope", "Frontend", 260),
            event("open", "Invoke shared Document lifecycle", "Application", 450),
            event("state", "Render ready/degraded/validation/access state", "Frontend", 640),
            event("browse", "Browse responsive list/detail views", "User", 830),
            event("search", "Filter, search, and follow semantic trails", "User", 1020),
            event("action", "Inspect or author?", "User", 1210, "gateway"),
            event("inspect", "Render evidence, citation preview, Resource rights, and narrative", "Frontend", 1400),
            event("author", "Use accessible forms, pickers, and structured editors", "Frontend", 1400),
            event("shared", "Call the same validation and mutation use cases as TUI", "Application", 1590),
            event("conflict", "Baseline current and operation authorized?", "Application", 1780, "gateway"),
            event("reject", "Show conflict/authorization/validation outcome; preserve draft", "Frontend", 1970),
            event("persist", "Persist through shared safe lifecycle", "STEMMA / persistence", 1970),
            event("result", "Refresh qualified views and report exact outcome", "Frontend", 2160),
            event("end", "End or continue session", "User", 2350, "end"),
        ],
        "flows": [
            flow("start", "session"), flow("session", "open"), flow("open", "state"),
            flow("state", "browse"), flow("browse", "search"), flow("search", "action"),
            flow("action", "inspect", "Inspect"), flow("action", "author", "Author"),
            flow("inspect", "end"), flow("author", "shared"), flow("shared", "conflict"),
            flow("conflict", "reject", "No"), flow("reject", "author", "Correct/retry"),
            flow("conflict", "persist", "Yes"), flow("persist", "result"), flow("result", "end"),
        ],
    },
]


def dimensions(kind):
    if kind in ("start", "end"):
        return 36, 36
    if kind == "gateway":
        return 52, 52
    return 160, 72


def external_label_dimensions(kind):
    if kind == "gateway":
        return 120, 30
    if kind in ("start", "end"):
        return 120, 24
    return None


def footprint_height(kind):
    _, height = dimensions(kind)
    label = external_label_dimensions(kind)
    return height + (6 + label[1] if label else 0)


def layout_geometry(model):
    """Size lanes and vertically separate nodes sharing a lane/x column."""
    groups = {(lane, x): [] for lane in LANES for x in sorted({n["x"] for n in model["nodes"]})}
    for node in model["nodes"]:
        groups.setdefault((node["lane"], node["x"]), []).append(node)

    lane_heights = {}
    for lane in LANES:
        content_heights = []
        for (group_lane, _), nodes in groups.items():
            if group_lane != lane or not nodes:
                continue
            content_heights.append(
                sum(footprint_height(node["kind"]) for node in nodes) + STACK_GAP * (len(nodes) - 1)
            )
        lane_heights[lane] = max(LANE_MIN_HEIGHT, max(content_heights, default=0) + LANE_PADDING * 2)

    lane_layout = {}
    next_top = LANE_TOP
    for lane in LANES:
        lane_layout[lane] = (next_top, lane_heights[lane])
        next_top += lane_heights[lane]

    bounds = {}
    label_bounds = {}
    for (lane, _), nodes in groups.items():
        if not nodes:
            continue
        lane_top, lane_height = lane_layout[lane]
        content_height = sum(footprint_height(node["kind"]) for node in nodes) + STACK_GAP * (len(nodes) - 1)
        next_y = lane_top + (lane_height - content_height) / 2
        for node in nodes:
            width, height = dimensions(node["kind"])
            bounds[node["id"]] = (node["x"], round(next_y, 1), width, height)
            label_size = external_label_dimensions(node["kind"])
            if label_size:
                label_width, label_height = label_size
                label_bounds[node["id"]] = (
                    round(node["x"] + width / 2 - label_width / 2, 1),
                    round(next_y + height + 6, 1),
                    label_width,
                    label_height,
                )
            next_y += footprint_height(node["kind"]) + STACK_GAP
    return lane_layout, bounds, label_bounds


def boundary_point(bounds, toward):
    """Intersect a center-to-waypoint ray with a rectangular shape boundary."""
    x, y, width, height = bounds
    center_x = x + width / 2
    center_y = y + height / 2
    delta_x = toward[0] - center_x
    delta_y = toward[1] - center_y
    assert delta_x or delta_y, (bounds, toward)
    scale_x = (width / 2) / abs(delta_x) if delta_x else float("inf")
    scale_y = (height / 2) / abs(delta_y) if delta_y else float("inf")
    scale = min(scale_x, scale_y)
    return round(center_x + delta_x * scale, 1), round(center_y + delta_y * scale, 1)


def segment_is_clear(start, end, obstacles):
    """Check an orthogonal segment against open rectangle interiors."""
    if start[0] == end[0]:
        x = start[0]
        low, high = sorted((start[1], end[1]))
        return all(not (left < x < right and low < bottom and high > top)
                   for left, top, right, bottom in obstacles)
    if start[1] == end[1]:
        y = start[1]
        low, high = sorted((start[0], end[0]))
        return all(not (top < y < bottom and low < right and high > left)
                   for left, top, right, bottom in obstacles)
    return False


def gateway_port(bounds, other_center, outbound, clearance):
    """Give gateway traffic a directional port and a short external stub."""
    x, y, width, height = bounds
    center_x = x + width / 2
    center_y = y + height / 2
    delta_x = other_center[0] - center_x

    if outbound:
        if delta_x > 0:
            return (x + width, center_y), (x + width + clearance, center_y)
        return None, None
    if delta_x < 0:
        return (x, center_y), (x - clearance, center_y)
    return None, None


def route_points(source_id, target_id, centers, bounds, label_bounds, kinds):
    """Find a deterministic, low-bend Manhattan route around other nodes."""
    clearance = 12
    source = centers[source_id]
    target = centers[target_id]
    source_port = source_stub = None
    target_port = target_stub = None
    if kinds[source_id] == "gateway":
        source_port, source_stub = gateway_port(bounds[source_id], target, True, clearance)
    if kinds[target_id] == "gateway":
        target_port, target_stub = gateway_port(bounds[target_id], source, False, clearance)
    route_start = source_stub or source
    route_target = target_stub or target
    obstacles = []
    x_values = {route_start[0], route_target[0]}
    y_values = {route_start[1], route_target[1]}
    for node_id, (x, y, width, height) in bounds.items():
        left, right = x - clearance, x + width + clearance
        top, bottom = y - clearance, y + height + clearance
        x_values.update((left, right))
        y_values.update((top, bottom))
        if node_id not in (source_id, target_id):
            obstacles.append((left, top, right, bottom))
    for x, y, width, height in label_bounds.values():
        left, right = x - clearance, x + width + clearance
        top, bottom = y - clearance, y + height + clearance
        x_values.update((left, right))
        y_values.update((top, bottom))
        obstacles.append((left, top, right, bottom))

    xs = sorted(x_values)
    ys = sorted(y_values)
    start = (xs.index(route_start[0]), ys.index(route_start[1]), "")
    goal_xy = (xs.index(route_target[0]), ys.index(route_target[1]))
    queue = [(0, start)]
    costs = {start: 0}
    previous = {}

    while queue:
        cost, state = heappop(queue)
        if cost != costs.get(state):
            continue
        x_index, y_index, prior_direction = state
        if (x_index, y_index) == goal_xy:
            goal = state
            break
        for next_x, next_y, direction in (
            (x_index - 1, y_index, "H"), (x_index + 1, y_index, "H"),
            (x_index, y_index - 1, "V"), (x_index, y_index + 1, "V"),
        ):
            if not (0 <= next_x < len(xs) and 0 <= next_y < len(ys)):
                continue
            point = (xs[x_index], ys[y_index])
            next_point = (xs[next_x], ys[next_y])
            if not segment_is_clear(point, next_point, obstacles):
                continue
            bend_cost = 24 if prior_direction and prior_direction != direction else 0
            next_cost = cost + abs(next_point[0] - point[0]) + abs(next_point[1] - point[1]) + bend_cost
            next_state = (next_x, next_y, direction)
            if next_cost >= costs.get(next_state, float("inf")):
                continue
            costs[next_state] = next_cost
            previous[next_state] = state
            heappush(queue, (next_cost, next_state))
    else:
        raise AssertionError((source_id, target_id, "no clear route"))

    path = []
    state = goal
    while True:
        path.append((xs[state[0]], ys[state[1]]))
        if state == start:
            break
        state = previous[state]
    path.reverse()

    compressed = [path[0]]
    for index in range(1, len(path) - 1):
        before, current, after = path[index - 1], path[index], path[index + 1]
        if (before[0] == current[0] == after[0]) or (before[1] == current[1] == after[1]):
            continue
        compressed.append(current)
    compressed.append(path[-1])
    if source_port:
        compressed.insert(0, source_port)
    else:
        compressed[0] = boundary_point(bounds[source_id], compressed[1])
    if target_port:
        compressed.append(target_port)
    else:
        compressed[-1] = boundary_point(bounds[target_id], compressed[-2])
    return compressed


def rectangles_overlap(first, second, padding=0):
    first_x, first_y, first_width, first_height = first
    second_x, second_y, second_width, second_height = second
    return (first_x - padding < second_x + second_width and
            first_x + first_width + padding > second_x and
            first_y - padding < second_y + second_height and
            first_y + first_height + padding > second_y)


def place_flow_label(text, points, occupied, all_routes):
    """Place a named-flow label beside a long segment, clear of shapes and lines."""
    width = min(180, max(48, len(text) * 7 + 14))
    height = 24
    segments = []
    for start, end in zip(points, points[1:]):
        length = abs(end[0] - start[0]) + abs(end[1] - start[1])
        segments.append((start[1] == end[1], length, start, end))
    segments.sort(key=lambda item: (item[0], item[1]), reverse=True)

    for _, _, start, end in segments:
        for fraction in (0.5, 0.33, 0.67):
            center_x = start[0] + (end[0] - start[0]) * fraction
            center_y = start[1] + (end[1] - start[1]) * fraction
            for offset in (8, 36, 64):
                if start[1] == end[1]:
                    candidates = (
                        (center_x - width / 2, center_y - height - offset, width, height),
                        (center_x - width / 2, center_y + offset, width, height),
                    )
                else:
                    candidates = (
                        (center_x + offset, center_y - height / 2, width, height),
                        (center_x - width - offset, center_y - height / 2, width, height),
                    )
                for candidate in candidates:
                    if candidate[0] < 20 or candidate[1] < 20:
                        continue
                    if any(rectangles_overlap(candidate, rectangle, 4) for rectangle in occupied):
                        continue
                    obstacle = (candidate[0], candidate[1], candidate[0] + width, candidate[1] + height)
                    if any(not segment_is_clear(route_start, route_end, [obstacle])
                           for route in all_routes for route_start, route_end in zip(route, route[1:])):
                        continue
                    return tuple(round(value, 1) for value in candidate)
    raise AssertionError((text, "no clear label position"))


def build_model(model):
    definitions = ET.Element(q("bpmn", "definitions"), {
        "id": f"Definitions_{model['file'].replace('.', '_').replace('-', '_')}",
        "targetNamespace": "https://nicelydrapped.local/bpmn/capabilities",
        "exporter": "nicelydrapped capability audit generator",
        "exporterVersion": "1.0",
    })
    process_id = "Process_" + model["file"].split(".")[0].replace("-", "_")
    process = ET.SubElement(definitions, q("bpmn", "process"), {
        "id": process_id, "name": model["name"], "isExecutable": "false"
    })
    documentation = ET.SubElement(process, q("bpmn", "documentation"))
    documentation.text = f"Status: {model['status']}. Source basis: {model['basis']}"

    lane_set = ET.SubElement(process, q("bpmn", "laneSet"), {"id": f"LaneSet_{process_id}"})
    by_lane = {lane: [] for lane in LANES}
    for node in model["nodes"]:
        by_lane[node["lane"]].append(node["id"])
    for lane in LANES:
        lane_el = ET.SubElement(lane_set, q("bpmn", "lane"), {
            "id": f"Lane_{process_id}_{lane.replace(' ', '_').replace('/', '_')}", "name": lane
        })
        for node_id in by_lane[lane]:
            ref = ET.SubElement(lane_el, q("bpmn", "flowNodeRef"))
            ref.text = node_id

    node_elements = {}
    for node in model["nodes"]:
        tag = {
            "start": "startEvent", "end": "endEvent", "gateway": "exclusiveGateway", "task": "task"
        }[node["kind"]]
        node_el = ET.SubElement(process, q("bpmn", tag), {"id": node["id"], "name": node["label"]})
        if node["note"]:
            note = ET.SubElement(node_el, q("bpmn", "documentation"))
            note.text = node["note"]
        node_elements[node["id"]] = node_el

    for i, seq in enumerate(model["flows"], 1):
        attrs = {"id": f"Flow_{i:02d}", "sourceRef": seq["source"], "targetRef": seq["target"]}
        if seq["label"]:
            attrs["name"] = seq["label"]
        ET.SubElement(process, q("bpmn", "sequenceFlow"), attrs)

    diagram = ET.SubElement(definitions, q("bpmndi", "BPMNDiagram"), {"id": f"Diagram_{process_id}"})
    plane = ET.SubElement(diagram, q("bpmndi", "BPMNPlane"), {"id": f"Plane_{process_id}", "bpmnElement": process_id})
    lane_layout, bounds, label_bounds = layout_geometry(model)
    max_x = max(node["x"] + dimensions(node["kind"])[0] for node in model["nodes"]) + 80
    for lane in LANES:
        shape = ET.SubElement(plane, q("bpmndi", "BPMNShape"), {
            "id": f"Shape_Lane_{process_id}_{lane.replace(' ', '_').replace('/', '_')}",
            "bpmnElement": f"Lane_{process_id}_{lane.replace(' ', '_').replace('/', '_')}",
            "isHorizontal": "true",
        })
        lane_y, lane_height = lane_layout[lane]
        ET.SubElement(shape, q("dc", "Bounds"), {"x": "20", "y": str(lane_y), "width": str(max_x), "height": str(lane_height)})

    centers = {}
    for node in model["nodes"]:
        x, y, width, height = bounds[node["id"]]
        shape = ET.SubElement(plane, q("bpmndi", "BPMNShape"), {"id": f"Shape_{node['id']}", "bpmnElement": node["id"]})
        ET.SubElement(shape, q("dc", "Bounds"), {"x": str(x), "y": str(y), "width": str(width), "height": str(height)})
        if node["id"] in label_bounds:
            label_x, label_y, label_width, label_height = label_bounds[node["id"]]
            label = ET.SubElement(shape, q("bpmndi", "BPMNLabel"))
            ET.SubElement(label, q("dc", "Bounds"), {
                "x": str(label_x), "y": str(label_y), "width": str(label_width), "height": str(label_height)
            })
        centers[node["id"]] = (x + width / 2, y + height / 2)

    kinds = {node["id"]: node["kind"] for node in model["nodes"]}
    routes = []
    for i, seq in enumerate(model["flows"], 1):
        routes.append((i, seq, route_points(seq["source"], seq["target"], centers, bounds, label_bounds, kinds)))

    occupied = list(bounds.values()) + list(label_bounds.values())
    flow_labels = {}
    all_route_points = [points for _, _, points in routes]
    for i, seq, points in routes:
        if not seq["label"]:
            continue
        flow_labels[i] = place_flow_label(seq["label"], points, occupied, all_route_points)
        occupied.append(flow_labels[i])

    for i, seq, points in routes:
        edge = ET.SubElement(plane, q("bpmndi", "BPMNEdge"), {"id": f"Edge_Flow_{i:02d}", "bpmnElement": f"Flow_{i:02d}"})
        for point_x, point_y in points:
            ET.SubElement(edge, q("di", "waypoint"), {"x": str(round(point_x, 1)), "y": str(round(point_y, 1))})
        if i in flow_labels:
            label_x, label_y, label_width, label_height = flow_labels[i]
            label = ET.SubElement(edge, q("bpmndi", "BPMNLabel"))
            ET.SubElement(label, q("dc", "Bounds"), {
                "x": str(label_x), "y": str(label_y), "width": str(label_width), "height": str(label_height)
            })

    ET.indent(definitions, space="  ")
    ET.ElementTree(definitions).write(OUT / model["file"], encoding="utf-8", xml_declaration=True)


def validate_model(model):
    node_ids = {n["id"] for n in model["nodes"]}
    starts = [n for n in model["nodes"] if n["kind"] == "start"]
    ends = [n for n in model["nodes"] if n["kind"] == "end"]
    assert len(starts) == 1 and len(ends) == 1, model["file"]
    for seq in model["flows"]:
        assert seq["source"] in node_ids and seq["target"] in node_ids, (model["file"], seq)
    adjacency = {node_id: [] for node_id in node_ids}
    for seq in model["flows"]:
        adjacency[seq["source"]].append(seq["target"])
    visited = set()
    pending = [starts[0]["id"]]
    while pending:
        current = pending.pop()
        if current in visited:
            continue
        visited.add(current)
        pending.extend(adjacency[current])
    assert visited == node_ids, (model["file"], sorted(node_ids - visited))
    assert all(adjacency[n["id"]] for n in model["nodes"] if n["kind"] == "gateway"), model["file"]


for item in MODELS:
    validate_model(item)
    build_model(item)

print(f"Generated and structurally validated {len(MODELS)} BPMN models in {OUT}")
