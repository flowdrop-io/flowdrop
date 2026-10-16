/**
 * WebMCP desktop bridge — a typed controller over the vendored widget.
 *
 * The bridge's page-side script (`@jason.today/webmcp`, vendored by the Drupal
 * module, written against **0.1.13**) draws its own unstyled floating widget and
 * keeps its connection state inside it. This controller lets the editor draw
 * the bridge UI with its own components instead: it hides the widget's DOM and
 * mirrors its state into a small reactive surface (`status`, `registeredTools`,
 * `connect`, `disconnect`, `subscribe`).
 *
 * What it relies on in the widget (0.1.13):
 * - public: `connect(token)`, `disconnect()`, `registerTool(...)`,
 *   `isConnected`, `availableTools` (a `Map`), `elementId`;
 * - private, hooked on the *instance* (never the prototype): `_updateStatus(status,
 *   message)` and `_updateConnectionUI(isConnected)`.
 *
 * The private methods are feature-detected. When any is missing (an upgrade
 * renamed them) the controller is **unmanaged**: the widget's own UI stays
 * visible, nothing is wrapped, a warning is logged once, and the editor draws
 * no bridge button — connecting keeps working through the widget.
 *
 * @module webmcp/bridgeController
 */

/** Where the bridge connection stands. */
export type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** A tool the editor offered through the bridge. */
export interface BridgeTool {
  name: string;
  description: string;
}

/** The immutable view `subscribe` listeners receive. */
export interface BridgeSnapshot {
  status: BridgeStatus;
  /** The widget's own words for the last status (shown for errors). */
  detail: string;
  tools: readonly BridgeTool[];
}

export interface WebMCPBridgeController {
  /** Connection state. Reactive in a Svelte `$derived` / template. */
  readonly status: BridgeStatus;
  /** The widget's last status message; the reason when `status` is `error`. */
  readonly detail: string;
  /** Tools offered through the bridge. Reactive. */
  readonly registeredTools: readonly BridgeTool[];
  /** False when the widget's private surface was not recognised (its own UI is left visible). */
  readonly managed: boolean;
  /** Connect with a token pasted from the desktop bridge. */
  connect(token: string): void;
  /** Drop the connection and forget the token. */
  disconnect(): void;
  /** Call `listener` on every change of status or tools. Returns the unsubscribe function. */
  subscribe(listener: (snapshot: BridgeSnapshot) => void): () => void;
  /** Restore the widget's methods and its own UI. */
  dispose(): void;
}

/**
 * The widget surface the controller reads. Everything is optional: what is
 * missing decides whether the controller can manage the widget.
 */
export interface BridgeWidgetInternals {
  connect?(token: string): unknown;
  disconnect?(): unknown;
  registerTool?(...args: unknown[]): unknown;
  _updateStatus?(status: string, message?: string): unknown;
  _updateConnectionUI?(isConnected: boolean): unknown;
  isConnected?: boolean;
  availableTools?: Map<string, { name?: string; description?: string }>;
  elementId?: string;
  SESSION_STORAGE_KEY?: string;
}

const PRIVATE_METHODS = ['_updateStatus', '_updateConnectionUI'] as const;

let warned = false;

function warnOnce(missing: string[]): void {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    `[flowdrop] WebMCP bridge widget changed (missing ${missing.join(', ')}); ` +
      "leaving the widget's own UI visible. The editor's bridge button is off."
  );
}

/** Test hook: forget that the unmanaged warning was already logged. */
export function resetBridgeWarning(): void {
  warned = false;
}

function missingSurface(widget: BridgeWidgetInternals): string[] {
  const missing: string[] = PRIVATE_METHODS.filter((m) => typeof widget[m] !== 'function');
  if (typeof widget.connect !== 'function') missing.push('connect');
  if (typeof widget.disconnect !== 'function') missing.push('disconnect');
  if (!(widget.availableTools instanceof Map)) missing.push('availableTools');
  return missing;
}

function widgetElement(widget: BridgeWidgetInternals): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const byId = widget.elementId ? document.getElementById(widget.elementId) : null;
  return byId ?? document.querySelector<HTMLElement>('[data-webmcp-widget]');
}

/** Map the widget's (status, message) to ours. A disconnect that carries a reason is an error. */
function classify(status: string, message: string): BridgeStatus {
  switch (status) {
    case 'connected':
      return 'connected';
    case 'connecting':
    case 'pending-auth':
      return 'connecting';
    case 'disconnected':
      return message && message !== 'Disconnected' ? 'error' : 'disconnected';
    default:
      return 'disconnected';
  }
}

/** What the widget's status line already says, for a widget that auto-reconnected before we hooked it. */
function seed(widget: BridgeWidgetInternals): { status: BridgeStatus; detail: string } {
  if (widget.isConnected) return { status: 'connected', detail: '' };
  const text = widgetElement(widget)?.querySelector('.webmcp-status')?.textContent?.trim() ?? '';
  if (/^(connecting|registering)/i.test(text)) return { status: 'connecting', detail: text };
  if (/^connected/i.test(text)) return { status: 'connected', detail: text };
  if (text && !/^disconnected$/i.test(text)) return { status: 'error', detail: text };
  // The widget reconnects from sessionStorage inside its constructor, before we can hook it.
  try {
    const key = widget.SESSION_STORAGE_KEY ?? 'webmcp_token';
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) {
      return { status: 'connecting', detail: '' };
    }
  } catch {
    /* storage blocked: start disconnected */
  }
  return { status: 'disconnected', detail: '' };
}

/**
 * Wrap a bridge widget in a controller. Hooks the instance's own methods, so
 * other widgets and the prototype are untouched.
 */
export function createBridgeController(widget: BridgeWidgetInternals): WebMCPBridgeController {
  const missing = missingSurface(widget);
  const managed = missing.length === 0;
  if (!managed) warnOnce(missing);

  let status = $state<BridgeStatus>('disconnected');
  let detail = $state('');
  // Bumped when a tool registers: the widget's Map is not reactive.
  let toolsVersion = $state(0);
  const listeners = new Set<(snapshot: BridgeSnapshot) => void>();

  const readTools = (): BridgeTool[] =>
    Array.from(widget.availableTools?.entries() ?? [], ([name, tool]) => ({
      name,
      description: tool.description ?? ''
    }));

  const emit = (): void => {
    if (listeners.size === 0) return;
    const snapshot: BridgeSnapshot = { status, detail, tools: readTools() };
    listeners.forEach((listener) => listener(snapshot));
  };

  /** True from the user's disconnect until the next connect: its "Disconnected" is not an error. */
  let userClosed = false;

  const restore: Array<() => void> = [];

  if (managed) {
    const initial = seed(widget);
    status = initial.status;
    detail = initial.detail;

    const hook = <K extends keyof BridgeWidgetInternals>(
      key: K,
      after: (...args: never[]) => void
    ): void => {
      const original = widget[key] as unknown as (...args: unknown[]) => unknown;
      const had = Object.prototype.hasOwnProperty.call(widget, key);
      (widget as Record<string, unknown>)[key] = function (this: unknown, ...args: unknown[]) {
        try {
          return original.apply(widget, args);
        } finally {
          (after as (...a: unknown[]) => void)(...args);
        }
      };
      restore.push(() => {
        if (had) (widget as Record<string, unknown>)[key] = original;
        else delete (widget as Record<string, unknown>)[key];
      });
    };

    hook('_updateStatus', (widgetStatus: string, message?: string) => {
      const text = message ?? '';
      let next = classify(widgetStatus, text);
      // After a failed connect the socket's close event reports a bare "Disconnected":
      // keep the error visible until the person tries again.
      if (next === 'disconnected' && status === 'error' && !userClosed) next = 'error';
      // The bare "Disconnected" that follows a failure must not replace its reason.
      const keepReason = next === 'error' && status === 'error' && text === 'Disconnected';
      if (!keepReason) detail = next === 'error' || next === 'connecting' ? text : '';
      status = next;
      if (next === 'connecting' || next === 'connected') userClosed = false;
      emit();
    });
    hook('_updateConnectionUI', () => {
      // Keep the widget's own UI hidden even if a vendored upgrade re-shows it.
      hide();
    });
    hook('registerTool', () => {
      toolsVersion += 1;
      emit();
    });

    const hide = (): void => {
      const el = widgetElement(widget);
      if (el) el.style.setProperty('display', 'none', 'important');
    };
    hide();
    restore.push(() => {
      const el = widgetElement(widget);
      if (el) el.style.removeProperty('display');
    });
  }

  return {
    get status() {
      return status;
    },
    get detail() {
      return detail;
    },
    get registeredTools() {
      void toolsVersion;
      return readTools();
    },
    managed,
    connect(token: string) {
      userClosed = false;
      const result = widget.connect?.(token);
      // The widget reports failures through its status; a rejection is a bug there.
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch(() => {});
      }
    },
    disconnect() {
      userClosed = true;
      widget.disconnect?.();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      restore
        .splice(0)
        .reverse()
        .forEach((fn) => fn());
      listeners.clear();
    }
  };
}

/** The controller of the installed bridge, if any. A holder object so reads are reactive. */
const current = $state<{ controller: WebMCPBridgeController | null }>({ controller: null });

/** The controller of the bridge `installBridgedModelContext` installed, or null. */
export function getBridgeController(): WebMCPBridgeController | null {
  return current.controller;
}

/** Make `controller` the editor's bridge (null clears it). Replaces and disposes a previous one. */
export function setBridgeController(controller: WebMCPBridgeController | null): void {
  if (current.controller && current.controller !== controller) current.controller.dispose();
  current.controller = controller;
}
