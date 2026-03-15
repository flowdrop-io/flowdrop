/**
 * MSW browser initialization for documentation demos.
 * Uses a singleton promise to avoid double-initialization.
 * All imports are dynamic to prevent SSG build failures.
 */

let mswReady: Promise<void> | null = null;

export function ensureMSW(): Promise<void> {
  if (mswReady) return mswReady;

  mswReady = (async () => {
    const { setupWorker } = await import('msw/browser');
    const { handlers } = await import('./handlers');

    const worker = setupWorker(...handlers);
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js'
      },
      quiet: true
    });
  })();

  return mswReady;
}
