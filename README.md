# BPMN Lens

A completely local, read-only BPMN explorer for Omarchy. It pairs BPMN diagrams with structured, source-grounded explanations of what users can do now and what product contracts say they should be able to do.

The first bundled suite covers Nicelydrapped’s observed TUI behavior and target TUI/web workflows.

## Why this shape

- `bpmn-js` `NavigatedViewer` provides pan, zoom, and selection without modeling tools.
- Selecting an element opens a compact notation card explaining what its BPMN shape means; bundled diagrams also show the source-grounded product explanation in the side panel.
- The process navigator and explanation panel collapse independently, remember their state locally, and automatically preserve the active view. Use <kbd>[</kbd> and <kbd>]</kbd> to toggle them.
- Select any BPMN element, then use Selection or <kbd>F</kbd> for a readable close view. <kbd>P</kbd>/<kbd>N</kbd> move through elements; <kbd>0</kbd> fits the complete diagram, <kbd>W</kbd> fits its width, and <kbd>1</kbd> shows one diagram unit per CSS pixel. A focused deep link uses `?diagram=…&element=…&view=focus`.
- The Outline tab provides a searchable HTML list of lanes, tasks, events, gateways, and named paths. Selecting a result synchronizes the SVG, URL, notation, explanation, and selection view. It is an accessible navigation companion, not a claim that the SVG itself is a complete screen-reader representation; the broader audit remains tracked in issue #4.
- A selection can trace its upstream, downstream, or complete connected path. Traced flows use both a stronger accent and a dashed line while unrelated elements remain faint; Clear removes the trace and Overview restores the complete camera view.
- Generic BPMN notation is docked at the top of Details when that panel is open. If Details is collapsed, the same content node moves to a dismissible canvas card; reopening Details restores the dock even after the fallback card was dismissed.
- On desktop, drag the separators beside Processes and Details to resize them. Focus a separator and use Left/Right (Shift for a larger step), Home, or double-click to reset. Clamped widths and collapse state are stored only in versioned local browser preferences.
- Plain TypeScript, HTML, and CSS keep the frontend small and inspectable.
- JSON sidecars keep explanation claims reviewable and separate from BPMN semantics.
- A tiny QML panel integrates with Omarchy without running the web application inside `omarchy-shell`.
- A loopback-only static server provides active Omarchy colors and avoids `file://` browser restrictions.
- `mise` is the sole project entry point.

See [Architecture](docs/ARCHITECTURE.md) and [Delivery plan](docs/PLAN.md).

## Install as an Omarchy 4 plugin

```bash
omarchy plugin add https://github.com/surreptitiousfabric/omarchy-bpmn-lens.git --yes
omarchy plugin enable surreptitiousfabric.bpmn-lens
mise -C ~/.config/omarchy/plugins/surreptitiousfabric.bpmn-lens run app:install
omarchy-shell shell summon surreptitiousfabric.bpmn-lens '{}'
```

The plugin and desktop application use the checked-in static runtime and do not require `node_modules`. For development, the optional `mise run setup` command installs the audited lockfile with lifecycle scripts disabled, regenerates the sidecars, runs tests, and verifies the build.

## Development

```bash
mise run install
mise run generate
mise run dev
mise run test
mise run validate
mise run build
mise run check
```

Do not invoke `npm` directly. The npm commands are implementation details behind mise tasks.

## Local data and privacy

The production viewer makes no requests beyond its own `127.0.0.1` static origin. Opening a `.bpmn` file uses the browser File API; the file is not uploaded or persisted. Generic BPMN notation help remains available for local files without inventing product-specific meaning. The project contains no telemetry, remote fonts, CDN assets, authentication, backend, or AI API.

## Content provenance

The bundled models were generated from Nicelydrapped’s TUI observation record, executable demonstrations, canonical product/architecture specifications, and Tony Proctor’s STEMMA data specification. STEMMA defines data semantics; it does not prescribe the frontend interaction design.

Current behavior and target behavior are visually and structurally distinct. A target diagram is never presented as evidence that the feature already ships.

## License

MIT. See [LICENSE](LICENSE).
