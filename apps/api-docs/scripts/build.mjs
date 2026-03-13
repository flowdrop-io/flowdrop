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
const DARK_STYLE = '<style>body,#redoc-container{background:#0a0a0f!important}</style>';
const UMAMI_SCRIPT = '<script defer src="https://umami.decasteljau.factorial.io/script.js" data-website-id="d93c0515-ea1e-497d-94ec-669b72d1ba0a"></script>';

const NAV_HEIGHT = 56;

const NAV_STYLE = `<style>
  #fd-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 9999;
    background: rgba(10, 10, 15, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid #3e3e54;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  #fd-nav-inner {
    display: flex;
    align-items: center;
    height: ${NAV_HEIGHT}px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 clamp(16px, 4vw, 48px);
    gap: 32px;
  }
  .fd-logo {
    font-size: 1.0625rem;
    font-weight: 700;
    color: #e8e8f0;
    text-decoration: none;
    letter-spacing: -0.01em;
    flex-shrink: 0;
  }
  .fd-logo:hover { color: #fff; }
  .fd-links {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
  }
  .fd-nav-link {
    padding: 6px 12px;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #9a9ab8;
    border-radius: 6px;
    text-decoration: none;
    transition: color 200ms, background 200ms;
  }
  .fd-nav-link:hover, .fd-nav-link-active {
    color: #e8e8f0;
    background: #17171f;
  }
  .fd-nav-actions { flex-shrink: 0; }
  .fd-btn {
    display: inline-block;
    padding: 7px 16px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #fff;
    background: #6c63ff;
    border-radius: 6px;
    text-decoration: none;
    transition: background 200ms;
  }
  .fd-btn:hover { background: #7c74ff; }
  .fd-menu-toggle {
    display: none;
    flex-direction: column;
    gap: 5px;
    padding: 8px;
    cursor: pointer;
    background: none;
    border: none;
    margin-left: auto;
  }
  .fd-menu-toggle span {
    display: block;
    width: 22px;
    height: 2px;
    background: #e8e8f0;
    border-radius: 2px;
  }
  #fd-mobile-menu {
    display: none;
    flex-direction: column;
    gap: 8px;
    padding: 16px clamp(16px, 4vw, 48px) 24px;
    background: rgba(10, 10, 15, 0.97);
    border-top: 1px solid #3e3e54;
  }
  #fd-mobile-menu.open { display: flex; }
  .fd-mobile-link {
    padding: 10px 12px;
    font-size: 1rem;
    font-weight: 500;
    color: #9a9ab8;
    border-radius: 6px;
    text-decoration: none;
  }
  .fd-mobile-link:hover { color: #e8e8f0; }
  /* Push Redocly sidebar below the nav */
  .menu-content {
    top: ${NAV_HEIGHT}px !important;
    height: calc(100vh - ${NAV_HEIGHT}px) !important;
  }
  /* Push Redocly main content area below nav */
  .redoc-wrap { padding-top: ${NAV_HEIGHT}px; }
  @media (max-width: 768px) {
    .fd-links, .fd-nav-actions { display: none; }
    .fd-menu-toggle { display: flex; }
  }
</style>`;

const NAV_HTML = `<nav id="fd-nav">
  <div id="fd-nav-inner">
    <a href="https://flowdrop.io" class="fd-logo">FlowDrop&#8482;</a>
    <div class="fd-links">
      <a href="https://flowdrop.io/blog" class="fd-nav-link">Blog</a>
      <a href="https://docs.flowdrop.io" class="fd-nav-link">Docs</a>
      <a href="https://api.flowdrop.io/v1/" class="fd-nav-link fd-nav-link-active">API</a>
      <a href="https://github.com/d34dman/flowdrop" class="fd-nav-link" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>
    <div class="fd-nav-actions">
      <a href="https://docs.flowdrop.io/getting-started/quick-start" class="fd-btn" target="_blank" rel="noopener noreferrer">Get started</a>
    </div>
    <button class="fd-menu-toggle" aria-label="Toggle menu" onclick="var m=document.getElementById('fd-mobile-menu');m.classList.toggle('open')">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div id="fd-mobile-menu">
    <a href="https://flowdrop.io/blog" class="fd-mobile-link">Blog</a>
    <a href="https://docs.flowdrop.io" class="fd-mobile-link">Docs</a>
    <a href="https://api.flowdrop.io/v1/" class="fd-mobile-link">API</a>
    <a href="https://github.com/d34dman/flowdrop" class="fd-mobile-link" target="_blank" rel="noopener noreferrer">GitHub</a>
    <a href="https://docs.flowdrop.io/getting-started/quick-start" class="fd-btn" target="_blank" rel="noopener noreferrer" style="margin-top:8px">Get started</a>
  </div>
</nav>`;

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

  // Inject favicon, dark theme, nav and analytics into Redocly-generated HTML
  // Also strip Google Fonts link injected by Redocly by default
  let html = readFileSync(outFile, "utf-8");
  html = html.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/g, "");
  html = html.replace("<head>", `<head>\n  ${FAVICON_LINK}\n  ${DARK_STYLE}\n  ${NAV_STYLE}\n  ${UMAMI_SCRIPT}`);
  html = html.replace("<body>", `<body>\n  ${NAV_HTML}`);
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
  <title>FlowDrop™ API Documentation</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script defer src="https://umami.decasteljau.factorial.io/script.js" data-website-id="d93c0515-ea1e-497d-94ec-669b72d1ba0a"></script>
  ${NAV_STYLE}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #e8e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      padding-top: calc(2rem + ${NAV_HEIGHT}px);
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #7a7a9a;
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
      background: #13131a;
      border: 1px solid #2a2a3a;
      border-radius: 8px;
      text-decoration: none;
      color: #e8e8f0;
      transition: border-color 0.2s, background 0.2s;
      min-width: 180px;
    }
    .version-card:hover {
      border-color: #6c63ff;
      background: #1a1a25;
    }
    .version-card.default {
      border-color: #6c63ff;
    }
    .badge {
      background: #6c63ff;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .link {
      color: #6c63ff;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  ${NAV_HTML}
  <h1>FlowDrop&#8482; API</h1>
  <p class="subtitle">Select an API version</p>
  <div class="versions">
    ${versionCards}
  </div>
</body>
</html>`;
}
