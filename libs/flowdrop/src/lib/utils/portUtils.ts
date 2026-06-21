import type { ExposedPortsConfig, NodePort } from '$lib/types/index.js';

/**
 * Sort ports by an ordered array of port IDs.
 * Ports not listed appear at the end in their original order.
 */
export function applyPortOrder(ports: NodePort[], orderedIds: string[] | undefined): NodePort[] {
  if (!orderedIds || orderedIds.length === 0) return ports;
  const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
  return [...ports].sort((a, b) => {
    const aIdx = orderMap.get(a.id) ?? Infinity;
    const bIdx = orderMap.get(b.id) ?? Infinity;
    // Guard: Infinity - Infinity = NaN, which corrupts sort for two unlisted ports
    return aIdx === bIdx ? 0 : aIdx - bIdx;
  });
}

/**
 * Compute the CSS `top` offset (px) for a port handle.
 * - 1 port: centered at 40px
 * - N ports: 20px start, 40px gap between each
 */
export function getPortTop(index: number, count: number): number {
  if (count === 1) return 40;
  return 20 + index * 40;
}

/**
 * Whether a port is exposed, and so rendered on the canvas.
 *
 * In v2 exposure is semantic, not cosmetic: a not-exposed port is hidden, not
 * wireable, and not runtime-overridable. Effective exposure is the instance's
 * explicit `data.config.exposedPorts` override for the port, falling back to
 * the port's metadata `exposedByDefault` (which itself defaults to exposed).
 *
 * @see .claude/plans/exposed-ports.md
 */
export function isPortVisible(
  port: NodePort,
  direction: 'input' | 'output',
  exposedPorts: ExposedPortsConfig | undefined
): boolean {
  const overrides = direction === 'input' ? exposedPorts?.inputs : exposedPorts?.outputs;
  const override = overrides?.[port.id];
  if (override !== undefined) return override;
  return port.exposedByDefault ?? true;
}
