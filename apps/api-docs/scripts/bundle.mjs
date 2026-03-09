/**
 * Multi-version API spec bundling script.
 *
 * Usage:
 *   pnpm bundle         # Bundle all versions
 *   pnpm bundle v1      # Bundle specific version
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
  const outFile = resolve(apiDir, version.path, "bundled.yaml");
  const configFile = resolve(apiDir, version.path, "redocly.yaml");

  console.log(`\nBundling ${version.label}...`);

  try {
    execFileSync(
      "npx",
      ["redocly", "bundle", specFile, "-o", outFile, "--config", configFile],
      { stdio: "inherit", cwd: rootDir },
    );
    console.log(`  -> ${version.path}/bundled.yaml`);
  } catch {
    failed = true;
  }
}

if (failed) process.exit(1);
