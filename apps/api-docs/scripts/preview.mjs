/**
 * Multi-version API docs preview script.
 *
 * Usage:
 *   pnpm preview         # Preview default version
 *   pnpm preview v1      # Preview specific version
 */

import { createServer } from "net";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const apiDir = resolve(rootDir, "../../libs/flowdrop/api");

const PREFERRED_PORT = 8080;

// Load version config
const versions = JSON.parse(
  readFileSync(resolve(apiDir, "versions.json"), "utf-8"),
).versions;

// Determine which version to preview
const requestedVersion = process.argv[2];
let version;

if (requestedVersion) {
  version = versions.find((v) => v.id === requestedVersion);
  if (!version) {
    console.error(
      `Unknown version "${requestedVersion}". Available: ${versions.map((v) => v.id).join(", ")}`,
    );
    process.exit(1);
  }
} else {
  version = versions.find((v) => v.default) || versions[0];
}

const specFile = resolve(apiDir, version.path, "openapi.yaml");
const configFile = resolve(apiDir, version.path, "redocly.yaml");

function tryPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await tryPort(startPort + i)) return startPort + i;
  }
  throw new Error(
    `No available port found (tried ${startPort}–${startPort + maxAttempts - 1})`,
  );
}

const port = await findAvailablePort(PREFERRED_PORT);

if (port !== PREFERRED_PORT) {
  console.log(`Port ${PREFERRED_PORT} is in use, using port ${port} instead.`);
}

console.log(`Previewing ${version.label} (${specFile})`);

execFileSync(
  "npx",
  [
    "redocly",
    "preview-docs",
    specFile,
    "--config",
    configFile,
    "--port",
    String(port),
  ],
  { stdio: "inherit" },
);
