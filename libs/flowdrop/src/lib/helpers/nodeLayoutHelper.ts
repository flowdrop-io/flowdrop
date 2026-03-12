/**
 * Node layout helper
 * Utilities for node dimensions and port positions aligned to a 10px grid.
 * Used so edge connection points (handle centers) land on multiples of 10.
 */

/**
 * Y position (in px) for the center of a port handle in a list-based node
 * (WorkflowNode, GatewayNode). Layout: header 60px, then section title row 20px,
 * then port rows 20px each. First port center = 90px, then 110, 130, … (multiples of 10).
 *
 * @param portIndex - Zero-based index in the combined list (section title counts as row 0; first port is index 0)
 * @returns Y coordinate in px for the handle center (use with transform: translateY(-50%))
 */
export function getPortCenterY(portIndex: number): number {
  const headerHeight = 60;
  const sectionTitleHeight = 20;
  const rowHeight = 20;
  return headerHeight + sectionTitleHeight + (portIndex + 0.5) * rowHeight;
}
