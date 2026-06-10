/** A single API endpoint, used for both the startup log and the landing page. */
export interface EndpointInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
}

/**
 * Method badge palettes. Light tint + dark same-hue text so every chip clears
 * WCAG AA contrast (≥ 4.5:1) on the white card — the all-white-text-on-saturated
 * version did not.
 */
const METHOD_STYLES: Record<EndpointInfo['method'], { bg: string; fg: string }> = {
  GET: { bg: '#d1fae5', fg: '#065f46' },
  POST: { bg: '#dbeafe', fg: '#1e40af' },
  PUT: { bg: '#fde9c8', fg: '#92400e' },
  DELETE: { bg: '#fee2e2', fg: '#991b1b' }
};

/**
 * Render a small, self-contained landing page so a developer who opens the
 * server root in a browser sees what's available instead of "Cannot GET /".
 * GET endpoints are clickable; the rest are listed for reference.
 */
export function renderLandingPage(opts: {
  port: number;
  apiBase: string;
  endpoints: EndpointInfo[];
}): string {
  const { apiBase, endpoints } = opts;

  const rows = endpoints
    .map((e) => {
      const s = METHOD_STYLES[e.method];
      const isClickable = e.method === 'GET' && !e.path.includes(':');
      // Clickable GETs are real links (emerald + underline + ↗). The rest are
      // rendered as plain code so "link vs not a link" is clear without relying
      // on colour alone — and the title explains why.
      const pathCell = isClickable
        ? `<a href="${e.path}">${e.path}<span class="ext" aria-hidden="true"> ↗</span></a>`
        : `<code class="static" title="${e.method} — try this with a FlowDrop client or curl">${e.path}</code>`;
      return `        <tr>
          <td><span class="method" style="background:${s.bg};color:${s.fg}">${e.method}</span></td>
          <td class="path">${pathCell}</td>
          <td class="desc">${e.description}</td>
        </tr>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FlowDrop Example Server</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(180deg, #f3fdf9 0%, #ffffff 18%, #ffffff 100%);
      color: #0f2a22;
      line-height: 1.5;
      min-height: 100vh;
    }
    .wrap { max-width: 820px; margin: 0 auto; padding: 48px 24px 64px; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    h1 { font-size: 28px; margin: 0 0 8px; color: #064e3b; }
    .lead { color: #2f6b5b; margin: 0 0 8px; }
    .base {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #f6fefb; border: 1px solid #d1fae5; border-radius: 8px;
      padding: 10px 14px; display: inline-block; margin: 12px 0 32px; color: #036046;
    }
    table {
      width: 100%; border-collapse: collapse; font-size: 14px;
      background: #ffffff; border: 1px solid #e3f7ee; border-radius: 12px; overflow: hidden;
      box-shadow: 0 1px 2px rgba(6, 78, 59, .03), 0 8px 24px rgba(6, 78, 59, .04);
    }
    th { text-align: left; color: #2f6b5b; font-weight: 600; padding: 12px; background: #f9fefc; border-bottom: 1px solid #e3f7ee; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0faf6; vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    .method {
      font-weight: 700; font-size: 11px; letter-spacing: .04em;
      border-radius: 4px; padding: 2px 7px; display: inline-block; min-width: 52px; text-align: center;
    }
    td.path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    /* Clickable: emerald, underlined, with a ↗ — distinguishable without colour. */
    td.path a { color: #036046; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }
    td.path a:hover { color: #064e3b; }
    td.path a:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 3px; }
    td.path a .ext { text-decoration: none; }
    /* Static: neutral slate, no underline — clearly "not a link". */
    td.path code.static { color: #475569; font-weight: 400; }
    td.desc { color: #2f6b5b; }
    footer { margin-top: 36px; color: #51766a; font-size: 13px; }
    footer a { color: #036046; }
    footer a:focus-visible { outline: 2px solid #059669; outline-offset: 2px; border-radius: 3px; }
    footer code { color: #036046; background: #f3fdf9; border-radius: 4px; padding: 1px 5px; }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>FlowDrop Example Server</h1>
    <p class="lead">A minimal Express implementation of the FlowDrop API — develop your client against this.</p>
    <p class="base">API base: <strong>${apiBase}</strong></p>
    <table>
      <caption class="sr-only">Available FlowDrop API endpoints</caption>
      <thead>
        <tr><th scope="col">Method</th><th scope="col">Endpoint</th><th scope="col">Description</th></tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
    <footer>
      Click any <strong>GET</strong> endpoint above to try it. POST / PUT / DELETE need a client such as the
      FlowDrop editor or <code>curl</code>. &middot; <a href="https://flowdrop.io">flowdrop.io</a>
    </footer>
  </main>
</body>
</html>`;
}
