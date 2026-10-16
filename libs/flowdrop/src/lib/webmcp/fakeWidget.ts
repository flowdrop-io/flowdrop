/**
 * WebMCP bridge — a fake of the vendored widget, for tests and the test route.
 *
 * Has the same surface the bridge controller relies on in
 * `@jason.today/webmcp` **0.1.13**: public `connect` / `disconnect` /
 * `registerTool` / `isConnected` / `availableTools` / `elementId`, the private
 * `_updateStatus(status, message)` and `_updateConnectionUI(isConnected)`, and a
 * `[data-webmcp-widget]` container with a `.webmcp-status` line (so a test can
 * see the controller hide it). No network: `connect` settles by token.
 *
 * Tokens: `hold` stays "connecting" until `settle()`, `fail` ends in a
 * registration error, anything else connects.
 *
 * @module webmcp/fakeWidget
 */

export interface FakeBridgeWidget {
  isConnected: boolean;
  elementId: string;
  availableTools: Map<string, { name: string; description: string }>;
  SESSION_STORAGE_KEY: string;
  connect(token: string): Promise<void>;
  disconnect(): void;
  registerTool(
    name: string,
    description: string,
    inputSchema: object,
    execute: (args: unknown) => unknown
  ): void;
  _updateStatus(status: string, message?: string): void;
  _updateConnectionUI(isConnected: boolean): void;
  /** Finish a `hold` connect as connected. */
  settle(): void;
  /** Remove the widget's DOM. */
  destroy(): void;
}

let counter = 0;

export function createFakeBridgeWidget(): FakeBridgeWidget {
  const elementId = `webmcp-widget-fake${counter++}`;
  const container = document.createElement('div');
  container.id = elementId;
  container.dataset.webmcpWidget = 'true';
  container.textContent = 'WebMCP';
  const statusLine = document.createElement('div');
  statusLine.className = 'webmcp-status';
  statusLine.textContent = 'Disconnected';
  container.appendChild(statusLine);
  document.body.appendChild(container);

  let release: (() => void) | null = null;

  const widget: FakeBridgeWidget = {
    isConnected: false,
    elementId,
    availableTools: new Map(),
    SESSION_STORAGE_KEY: 'webmcp_token',
    async connect(token) {
      if (!token) {
        widget._updateStatus('disconnected', 'Error: No token provided');
        return;
      }
      widget._updateStatus('connecting', 'Connecting...');
      if (token === 'hold') {
        await new Promise<void>((resolve) => (release = resolve));
      } else {
        await Promise.resolve();
      }
      if (token === 'fail') {
        widget._updateStatus('disconnected', 'Registration failed');
        return;
      }
      widget.isConnected = true;
      widget._updateStatus('connected', 'Connected to /fake');
      widget._updateConnectionUI(true);
    },
    disconnect() {
      widget.isConnected = false;
      widget._updateStatus('disconnected', 'Disconnected');
      widget._updateConnectionUI(false);
    },
    registerTool(name, description) {
      widget.availableTools.set(name, { name, description });
    },
    _updateStatus(_status, message) {
      statusLine.textContent = message ?? _status;
    },
    _updateConnectionUI() {},
    settle() {
      release?.();
      release = null;
    },
    destroy() {
      container.remove();
    }
  };
  return widget;
}
