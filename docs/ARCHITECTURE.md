# Architecture

## Decision

BPMN Lens is two deliberately unequal parts:

1. A thin Omarchy panel, loaded by `omarchy-shell`, that explains the tool and launches it through `mise`.
2. A static browser application that owns BPMN rendering and explanation navigation.

The split prevents DOM-heavy BPMN rendering and Node package code from entering the long-running Quickshell process. A viewer failure therefore cannot take down the Omarchy bar, notifications, or other shell plugins.

## Runtime boundaries

```text
Omarchy panel (QML)
  └─ mise run open
       ├─ local static server (Node core only, 127.0.0.1)
       └─ omarchy-launch-webapp
            └─ static Vite build
                 ├─ bpmn-js NavigatedViewer
                 ├─ bundled BPMN XML
                 └─ bundled JSON explanation sidecars
```

- The server has no application API, database, accounts, telemetry, or remote fetches.
- It binds only to loopback and applies a restrictive Content Security Policy.
- Arbitrary local BPMN files are read with the browser File API and are never uploaded.
- The viewer has no modeling modules and cannot mutate or export BPMN.

## Dependency policy

Production dependencies are limited to:

- `bpmn-js`: standards-oriented BPMN rendering and navigation.
- `bpmn-moddle`: direct BPMN parsing for generation and validation.

There is no component framework, router, state library, CSS framework, server framework, schema package, icon package, analytics client, or AI client. Exact versions and the complete graph are locked. Package lifecycle scripts are disabled during installation.

## Content contract

`public/content/catalog.json` discovers diagrams. Every entry points to:

- one BPMN 2.0 XML document with Diagram Interchange coordinates;
- one schema-versioned JSON sidecar keyed by stable BPMN element ID.

The standard-library-only `scripts/generate-diagrams.py` owns node placement and boundary-aware sequence-flow routing. The reviewed `content-blueprints.json` owns diagram-level claims. `mise run generate` first regenerates BPMN, then parses it and deterministically expands those claims into selectable element explanations. Generated prose never changes the BPMN document.

The classification vocabulary protects product reasoning:

- `observed-current`: supported by direct observation or executable evidence;
- `target`: required target behavior, not an implementation claim;
- `target-partial`: target behavior with known partial implementation;
- `target-unimplemented`: a design contract with no current adapter.

## Static distribution

`dist/` is intentionally versioned. Omarchy 4 plugin installation clones a repository but runs no installation hooks, so a reviewed static application bundle must be available immediately. The server serves canonical content from `public/content` instead of committing Vite's duplicate copy under `dist/content`. Production source maps and unused BPMN icon fonts are also omitted. `mise run setup` reproduces and verifies the build.

## Constraints enforced by tests

- Plugin manifest identity and entry point.
- Runtime dependency allow-list and exact pins.
- One-to-one BPMN/catalog/sidecar correspondence.
- Current-versus-target classification.
- Required TUI, web, implementation, and source fields.
- BPMN parse warnings are gate failures.
- Every sequence flow begins and ends on its source/target shape perimeter, never at the text-bearing centre.
- Static build budget: 2.5 MB uncompressed.
