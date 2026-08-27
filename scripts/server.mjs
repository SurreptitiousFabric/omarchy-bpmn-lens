import { createReadStream } from "node:fs";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const publicDir = path.join(root, "public");
const host = "127.0.0.1";
const port = Number.parseInt(process.env.BPMN_LENS_PORT || "4175", 10);
const stateTheme = path.join(process.env.HOME || "", ".local/state/omarchy/current/theme/colors.toml");

const fallbackTheme = {
  background: "#101315",
  foreground: "#cacccc",
  accent: "#8aadf4",
  muted: "#707880",
  urgent: "#ed8796"
};

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".bpmn", "application/xml; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".map", "application/json; charset=utf-8"]
]);

function parseTheme(raw) {
  const theme = { ...fallbackTheme };
  for (const line of raw.split("\n")) {
    const match = line.match(/^\s*(background|foreground|accent|muted|urgent|red|color1)\s*=\s*["']?(#[0-9a-fA-F]{6})/);
    if (!match) continue;
    const key = match[1] === "red" || match[1] === "color1" ? "urgent" : match[1];
    theme[key] = match[2];
  }
  return theme;
}

async function themeCss() {
  let theme = fallbackTheme;
  try {
    theme = parseTheme(await readFile(stateTheme, "utf8"));
  } catch {
    // The fallback is deliberately the stock Omarchy shell palette.
  }
  return `:root{--omarchy-background:${theme.background};--omarchy-foreground:${theme.foreground};--omarchy-accent:${theme.accent};--omarchy-muted:${theme.muted};--omarchy-urgent:${theme.urgent}}\n`;
}

function headers(contentType) {
  return {
    "Content-Type": contentType,
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff"
  };
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${host}:${port}`);
  if (requestUrl.pathname === "/__health") {
    response.writeHead(200, headers("text/plain; charset=utf-8"));
    response.end("ok\n");
    return;
  }
  if (requestUrl.pathname === "/theme.css") {
    response.writeHead(200, { ...headers("text/css; charset=utf-8"), "Cache-Control": "no-store" });
    response.end(await themeCss());
    return;
  }

  const relative = requestUrl.pathname === "/" ? "index.html" : decodeURIComponent(requestUrl.pathname.slice(1));
  const contentRequest = relative === "content" || relative.startsWith(`content${path.sep}`) || relative.startsWith("content/");
  const serveRoot = contentRequest ? publicDir : dist;
  const candidate = path.resolve(serveRoot, relative);
  if (candidate !== serveRoot && !candidate.startsWith(`${serveRoot}${path.sep}`)) {
    response.writeHead(400, headers("text/plain; charset=utf-8"));
    response.end("Invalid path\n");
    return;
  }

  try {
    const [canonicalRoot, canonicalFile] = await Promise.all([realpath(serveRoot), realpath(candidate)]);
    if (!canonicalFile.startsWith(`${canonicalRoot}${path.sep}`)) throw new Error("path escape");
    const fileStat = await stat(canonicalFile);
    const fileLstat = await lstat(candidate);
    if (!fileStat.isFile() || fileLstat.isSymbolicLink()) throw new Error("not a regular file");
    response.writeHead(200, { ...headers(mime.get(path.extname(canonicalFile)) || "application/octet-stream"), "Cache-Control": "no-cache" });
    createReadStream(canonicalFile).pipe(response);
  } catch {
    response.writeHead(404, headers("text/plain; charset=utf-8"));
    response.end("Not found\n");
  }
});

server.listen(port, host, () => {
  console.log(`BPMN Lens is available at http://${host}:${port}`);
});
