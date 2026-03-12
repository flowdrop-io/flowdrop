<!--
  FlowDropEdge Component
  Custom bezier edge that draws its own arrowhead so the line stroke ends
  at the arrow base instead of poking through to the tip.

  Approach:
  1. Compute the full bezier path (xyflow's getBezierPath)
  2. Parse the SVG path to extract the cubic bezier control points
  3. Evaluate the curve near the end to get the true visual tangent
  4. Shorten the path along that tangent and draw the arrowhead at the target
-->

<script lang="ts">
  import { getBezierPath } from "@xyflow/svelte";
  import { BaseEdge } from "@xyflow/svelte";
  import type { BezierEdgeProps } from "@xyflow/svelte";
  import { ARROW_LENGTH_PX, ARROW_HALF_WIDTH_PX } from "../config/constants.js";

  let {
    id,
    interactionWidth,
    label,
    labelStyle,
    markerEnd: _markerEnd,
    markerStart,
    pathOptions,
    sourcePosition,
    sourceX,
    sourceY,
    style,
    targetPosition,
    targetX,
    targetY,
  }: BezierEdgeProps = $props();

  /**
   * Extract stroke color from the edge's inline style for the arrowhead fill.
   */
  let strokeColor = $derived.by(() => {
    if (!style) return "var(--fd-edge-data, #64748b)";
    const match = style.match(/stroke:\s*([^;]+)/);
    return match ? match[1].trim() : "var(--fd-edge-data, #64748b)";
  });

  /**
   * Evaluate a cubic bezier at parameter t.
   * P(t) = (1-t)^3 * P0 + 3(1-t)^2 * t * P1 + 3(1-t) * t^2 * P2 + t^3 * P3
   */
  function bezierAt(
    p0x: number,
    p0y: number,
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number,
    t: number,
  ): { x: number; y: number } {
    const u = 1 - t;
    const uu = u * u;
    const uuu = uu * u;
    const tt = t * t;
    const ttt = tt * t;
    return {
      x: uuu * p0x + 3 * uu * t * p1x + 3 * u * tt * p2x + ttt * p3x,
      y: uuu * p0y + 3 * uu * t * p1y + 3 * u * tt * p2y + ttt * p3y,
    };
  }

  /**
   * Parse the SVG cubic bezier path "M x0,y0 C x1,y1 x2,y2 x3,y3"
   * into the four control points.
   */
  function parseCubicBezier(d: string) {
    const nums = d.match(/-?[\d.]+/g)?.map(Number);
    if (!nums || nums.length < 8) return null;
    return {
      p0x: nums[0],
      p0y: nums[1],
      p1x: nums[2],
      p1y: nums[3],
      p2x: nums[4],
      p2y: nums[5],
      p3x: nums[6],
      p3y: nums[7],
    };
  }

  // Parameter near the end of the curve for tangent sampling
  const T_SAMPLE = 0.9;

  let computed = $derived.by(() => {
    // 1. Get the full bezier path from xyflow
    const [fullPath, lx, ly] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      curvature: pathOptions?.curvature,
    });

    // 2. Parse control points from SVG path
    const cp = parseCubicBezier(fullPath);
    if (!cp) {
      return { path: fullPath, labelX: lx, labelY: ly, angleDeg: 0 };
    }

    // 3. Evaluate the curve at T_SAMPLE to get a reference point
    const ref = bezierAt(
      cp.p0x,
      cp.p0y,
      cp.p1x,
      cp.p1y,
      cp.p2x,
      cp.p2y,
      cp.p3x,
      cp.p3y,
      T_SAMPLE,
    );

    // 4. Tangent direction: from reference point to the target
    const dx = targetX - ref.x;
    const dy = targetY - ref.y;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const angleRad = Math.atan2(dy, dx);

    // 5. Shorten: move the endpoint back along the tangent
    const adjX = targetX - Math.cos(angleRad) * ARROW_LENGTH_PX;
    const adjY = targetY - Math.sin(angleRad) * ARROW_LENGTH_PX;

    // 6. Recompute the bezier path with the shortened target
    const [shortenedPath] = getBezierPath({
      sourceX,
      sourceY,
      targetX: adjX,
      targetY: adjY,
      sourcePosition,
      targetPosition,
      curvature: pathOptions?.curvature,
    });

    return { path: shortenedPath, labelX: lx, labelY: ly, angleDeg };
  });
</script>

<BaseEdge
  {id}
  path={computed.path}
  labelX={computed.labelX}
  labelY={computed.labelY}
  {label}
  {labelStyle}
  {markerStart}
  {interactionWidth}
  {style}
/>

<!-- Manual arrowhead: tip at origin pointing right, rotated to the bezier tangent -->
<polygon
  points="0,0 {-ARROW_LENGTH_PX},{-ARROW_HALF_WIDTH_PX} {-ARROW_LENGTH_PX},{ARROW_HALF_WIDTH_PX}"
  fill={strokeColor}
  stroke="none"
  transform="translate({targetX},{targetY}) rotate({computed.angleDeg})"
  class="flowdrop-edge-arrow"
/>
