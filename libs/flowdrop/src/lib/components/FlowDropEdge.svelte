<!--
  FlowDropEdge Component
  Custom bezier edge that draws its own arrowhead so the line stroke ends
  at the arrow base instead of poking through to the tip.

  Approach:
  1. Compute the full bezier path (xyflow's getBezierPath)
  2. Parse the SVG path to extract the cubic bezier control points
  3. Compute exact tangent at endpoint via bezier derivative P'(1) = 3(P3-P2)
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

    // 3. Compute exact tangent at curve endpoint using bezier derivative:
    //    P'(1) = 3 * (P3 - P2), giving the true arrival direction
    const dx = cp.p3x - cp.p2x;
    const dy = cp.p3y - cp.p2y;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const angleRad = Math.atan2(dy, dx);

    // 4. Shorten: move the endpoint back along the tangent
    const adjX = targetX - Math.cos(angleRad) * ARROW_LENGTH_PX;
    const adjY = targetY - Math.sin(angleRad) * ARROW_LENGTH_PX;

    // 5. Build shortened path from existing control points — no second getBezierPath() call
    const shortenedPath = `M ${cp.p0x},${cp.p0y} C ${cp.p1x},${cp.p1y} ${cp.p2x},${cp.p2y} ${adjX},${adjY}`;

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
