/**
 * Multi-version API docs build script.
 *
 * Reads libs/flowdrop/api/versions.json and builds each version's
 * OpenAPI spec into dist/<version>/index.html using Redocly CLI.
 * Also generates a landing page at dist/index.html with a version picker.
 */

import { execFileSync } from "child_process";
import { readFileSync, mkdirSync, writeFileSync, cpSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const apiDir = resolve(rootDir, "../../libs/flowdrop/api");
const distDir = resolve(rootDir, "dist");

// Load version config
const versions = JSON.parse(
  readFileSync(resolve(apiDir, "versions.json"), "utf-8"),
).versions;

if (versions.length === 0) {
  console.error("No versions defined in versions.json");
  process.exit(1);
}

const defaultVersion = versions.find((v) => v.default) || versions[0];

// Build each version
for (const version of versions) {
  const versionDir = resolve(apiDir, version.path);
  const specFile = resolve(versionDir, "bundled.yaml");
  const outFile = resolve(distDir, version.id, "index.html");

  console.log(`\nBuilding ${version.label}...`);

  mkdirSync(resolve(distDir, version.id), { recursive: true });

  execFileSync(
    "npx",
    ["redocly", "build-docs", specFile, "-o", outFile],
    { stdio: "inherit", cwd: rootDir },
  );

  // Copy bundled spec for download
  cpSync(specFile, resolve(distDir, version.id, "openapi.yaml"));

  console.log(`  -> ${version.id}/index.html`);
}

// Generate landing page
const landingHtml = generateLandingPage(versions, defaultVersion);
writeFileSync(resolve(distDir, "index.html"), landingHtml);
console.log("\n-> dist/index.html (version picker)");

// Generate 404 redirect
const redirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=/flowdrop/${defaultVersion.id}/">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="/flowdrop/${defaultVersion.id}/">API Documentation</a>...</p>
</body>
</html>`;
writeFileSync(resolve(distDir, "404.html"), redirectHtml);

console.log("\nBuild complete!");

function generateLandingPage(versions, defaultVersion) {
  const versionCards = versions
    .map(
      (v) => `
        <a href="${v.id}/" class="version-card${v.default ? " default" : ""}">
          <h2>${v.label}</h2>
          ${v.default ? '<span class="badge">Latest</span>' : ""}
          <span class="link">View Documentation →</span>
        </a>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlowDrop API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f1117;
      color: #ebeef2;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #828890;
      margin-bottom: 2rem;
    }
    .versions {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
      max-width: 600px;
    }
    .version-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem 2rem;
      background: #1a1d27;
      border: 1px solid #303640;
      border-radius: 8px;
      text-decoration: none;
      color: #ebeef2;
      transition: border-color 0.2s, background 0.2s;
      min-width: 180px;
    }
    .version-card:hover {
      border-color: #dd693c;
      background: #1f2230;
    }
    .version-card.default {
      border-color: #dd693c;
    }
    .badge {
      background: #dd693c;
      color: #0f1117;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .link {
      color: #dd693c;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <h1>FlowDrop API</h1>
  <p class="subtitle">Select an API version</p>
  <div class="versions">
    ${versionCards}
  </div>
</body>
</html>`;
}
