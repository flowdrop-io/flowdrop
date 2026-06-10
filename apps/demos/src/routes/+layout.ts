// FlowDrop is browser-only (its multi-instance state container throws on SSR),
// so the whole demo site renders client-side. We still prerender each route to
// a static HTML shell that boots the client app — that's what makes the output
// CDN-hostable on Netlify with no server.
export const prerender = true;
export const ssr = false;
