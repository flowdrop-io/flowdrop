/**
 * Utility functions for calculating handle positions on nodes
 */

export interface HandlePosition {
  left: number;
  top: number;
}

/**
 * Calculate handle position along a circle arc using cos/sin
 *
 * Distributes handles evenly along an arc on the left or right side of a circle.
 * For N handles, they are positioned at angles calculated as:
 * angle = centerAngle - arcSpan/2 + arcSpan * (index + 1) / (count + 1)
 *
 * @param index - The index of the handle (0-based)
 * @param count - Total number of handles on this side
 * @param side - 'left' for inputs, 'right' for outputs
 * @param radius - The radius of the circle (default: 40px for 80px diameter)
 * @param arcSpan - The arc span in radians (default: 5π/6 = 150°)
 * @returns Object with left and top pixel values relative to the circle's bounding box
 *
 * @example
 * // Single handle on left side - positioned at center (180°)
 * getCircleHandlePosition(0, 1, 'left') // { left: 0, top: 36 }
 *
 * @example
 * // Two handles on left side - positioned at 150° and 210°
 * getCircleHandlePosition(0, 2, 'left') // { left: ~4.8, top: ~18 }
 * getCircleHandlePosition(1, 2, 'left') // { left: ~4.8, top: ~54 }
 */
export function getCircleHandlePosition(
  index: number,
  count: number,
  side: "left" | "right",
  radius: number = 40,
  arcSpan: number = (Math.PI * 5) / 6,
): HandlePosition {
  const centerAngle = side === "left" ? Math.PI : 0; // 180° for left, 0° for right
  const angle =
    centerAngle - arcSpan / 2 + (arcSpan * (index + 1)) / (count + 1);
  const centerOffset = radius; // center of the circle (assuming square bounding box)

  return {
    left: centerOffset + radius * Math.cos(angle),
    top: centerOffset + radius * Math.sin(angle),
  };
}
