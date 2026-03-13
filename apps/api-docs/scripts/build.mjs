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

const FAVICON_LINK = '<link rel="icon" type="image/svg+xml" href="/favicon.svg">';
const UMAMI_SCRIPT = '<script defer src="https://umami.decasteljau.factorial.io/script.js" data-website-id="d93c0515-ea1e-497d-94ec-669b72d1ba0a"></script>';

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
    ["redocly", "build-docs", specFile, "-o", outFile, "--config", "redocly.yaml"],
    { stdio: "inherit", cwd: rootDir },
  );

  // Copy bundled spec for download
  cpSync(specFile, resolve(distDir, version.id, "openapi.yaml"));

  // Inject favicon and analytics into Redocly-generated HTML
  let html = readFileSync(outFile, "utf-8");
  html = html.replace("<head>", `<head>\n  ${FAVICON_LINK}\n  ${UMAMI_SCRIPT}`);
  writeFileSync(outFile, html);

  console.log(`  -> ${version.id}/index.html`);
}

// Copy favicon to dist
const faviconSrc = resolve(rootDir, "favicon.svg");
cpSync(faviconSrc, resolve(distDir, "favicon.svg"));

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
  const versionLinks = versions
    .map(
      (v) => `<li><a href="${v.id}/">${v.label}${v.default ? " (latest)" : ""}</a></li>`,
    )
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlowDrop API Documentation</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script defer src="https://umami.decasteljau.factorial.io/script.js" data-website-id="d93c0515-ea1e-497d-94ec-669b72d1ba0a"></script>
</head>
<body>
  <h1>FlowDrop API Documentation</h1>
  <p>Select an API version:</p>
  <ul>
        ${versionLinks}
  </ul>
</body>
</html>`;
}
