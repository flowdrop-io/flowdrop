/**
 * Multi-version API spec linting script.
 *
 * Usage:
 *   pnpm lint         # Lint all versions
 *   pnpm lint v1      # Lint specific version
 */

import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const apiDir = resolve(rootDir, "../../libs/flowdrop/api");

const versions = JSON.parse(
  readFileSync(resolve(apiDir, "versions.json"), "utf-8"),
).versions;

const requestedVersion = process.argv[2];
const targets = requestedVersion
  ? [versions.find((v) => v.id === requestedVersion)].filter(Boolean)
  : versions;

if (targets.length === 0) {
  console.error(
    `Unknown version "${requestedVersion}". Available: ${versions.map((v) => v.id).join(", ")}`,
  );
  process.exit(1);
}

let failed = false;

for (const version of targets) {
  const specFile = resolve(apiDir, version.path, "openapi.yaml");
  const configFile = resolve(apiDir, version.path, "redocly.yaml");

  console.log(`\nLinting ${version.label}...`);

  try {
    execFileSync(
      "npx",
      ["redocly", "lint", specFile, "--config", configFile],
      { stdio: "inherit", cwd: rootDir },
    );
  } catch {
    failed = true;
  }
}

if (failed) process.exit(1);
