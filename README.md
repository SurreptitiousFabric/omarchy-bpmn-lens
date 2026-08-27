# BPMN Lens

A completely local, read-only BPMN explorer for Omarchy. It pairs BPMN diagrams with structured, source-grounded explanations of what users can do now and what product contracts say they should be able to do.

The first bundled suite covers Nicelydrapped’s observed TUI behavior and target TUI/web workflows.

## Why this shape

- `bpmn-js` `NavigatedViewer` provides pan, zoom, and selection without modeling tools.
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

The production viewer makes no requests beyond its own `127.0.0.1` static origin. Opening a `.bpmn` file uses the browser File API; the file is not uploaded or persisted. The project contains no telemetry, remote fonts, CDN assets, authentication, backend, or AI API.

## Content provenance

The bundled models were generated from Nicelydrapped’s TUI observation record, executable demonstrations, canonical product/architecture specifications, and Tony Proctor’s STEMMA data specification. STEMMA defines data semantics; it does not prescribe the frontend interaction design.

Current behavior and target behavior are visually and structurally distinct. A target diagram is never presented as evidence that the feature already ships.

## License

MIT. See [LICENSE](LICENSE).
