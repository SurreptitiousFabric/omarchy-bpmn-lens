import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const applicationsDir = path.join(process.env.HOME || "", ".local/share/applications");
const desktopFile = path.join(applicationsDir, "bpmn-lens.desktop");
const icon = path.join(root, "omarchy/bpmn-lens.svg");

function desktopQuote(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=BPMN Lens
GenericName=BPMN Viewer
Comment=Explore local BPMN diagrams with structured explanations
Exec=mise -C ${desktopQuote(root)} run open
Icon=${icon}
Terminal=false
Categories=Development;Office;
Keywords=BPMN;Process;Workflow;Diagram;
StartupNotify=true
`;

await mkdir(applicationsDir, { recursive: true });
await writeFile(desktopFile, desktopEntry, { mode: 0o644 });

const refresh = spawnSync("update-desktop-database", [applicationsDir], { stdio: "inherit" });
if (refresh.error && refresh.error.code !== "ENOENT") throw refresh.error;
if (refresh.status !== null && refresh.status !== 0) process.exitCode = refresh.status;

console.log(`Installed ${desktopFile}`);
