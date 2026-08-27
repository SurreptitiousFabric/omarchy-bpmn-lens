import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const url = `http://127.0.0.1:${process.env.BPMN_LENS_PORT || "4175"}`;

async function healthy() {
  try {
    const response = await fetch(`${url}/__health`, { signal: AbortSignal.timeout(500) });
    return response.ok;
  } catch {
    return false;
  }
}

await access(path.join(root, "dist/index.html")).catch(() => {
  throw new Error("The static build is missing. Run `mise run setup` in the plugin directory once.");
});

if (!(await healthy())) {
  const child = spawn(process.execPath, [path.join(root, "scripts/server.mjs")], {
    cwd: root,
    detached: true,
    stdio: "ignore"
  });
  child.unref();
  for (let attempt = 0; attempt < 20 && !(await healthy()); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

if (!(await healthy())) throw new Error("The local BPMN Lens server did not start.");

const launcher = spawn("omarchy-launch-webapp", [url], { detached: true, stdio: "ignore" });
launcher.unref();
