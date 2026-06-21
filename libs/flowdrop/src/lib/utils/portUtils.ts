import type { NodePort, PortConfigEntry, PortsConfig } from '$lib/types/index.js';

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
 * Sort ports by their metadata `displayOrder` weight (ascending), breaking ties
 * on declaration order (stable). This is the default order before any
 * instance-level reordering — reserved injected ports (trigger/tool/error)
 * carry a high weight so they land at the bottom.
 */
export function byDefaultOrder(ports: NodePort[]): NodePort[] {
  return ports
    .map((port, index) => ({ port, index }))
    .sort((a, b) => (a.port.displayOrder ?? 0) - (b.port.displayOrder ?? 0) || a.index - b.index)
    .map(({ port }) => port);
}

/**
 * Effective render order for a direction: the metadata default order, then the
 * instance's `ports` config override (listed ports first in their stored order,
 * the rest following in default order).
 */
export function orderPortsFor(
  ports: NodePort[],
  entries: PortConfigEntry[] | undefined
): NodePort[] {
  const base = byDefaultOrder(ports);
  return applyPortOrder(
    base,
    entries?.map((entry) => entry.id)
  );
}

/**
 * Effective exposure for a port: the instance's explicit `exposed` override if
 * present, else the port's metadata `exposedByDefault` (which itself defaults to
 * exposed).
 */
export function isPortExposed(port: NodePort, entries: PortConfigEntry[] | undefined): boolean {
  const entry = entries?.find((candidate) => candidate.id === port.id);
  if (entry && entry.exposed !== undefined) return entry.exposed;
  return port.exposedByDefault ?? true;
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
 * explicit `data.config.ports` override for the port, falling back to the port's
 * metadata `exposedByDefault` (which itself defaults to exposed).
 *
 * @see .claude/plans/exposed-ports.md
 */
export function isPortVisible(
  port: NodePort,
  direction: 'input' | 'output',
  ports: PortsConfig | undefined
): boolean {
  const entries = direction === 'input' ? ports?.inputs : ports?.outputs;
  return isPortExposed(port, entries);
}
