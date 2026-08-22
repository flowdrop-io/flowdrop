<!--
  Port lane chip — the lane's human name, quietly.

  Outlined, never filled (the row's one saturated element is the shape symbol
  beside it). The chip shows the lane's served **name** and keeps the raw id in
  the tooltip.

  That way round on purpose. Badging the id is why authors read `string[]`,
  `datetime` and `messages` on the canvas, and why naming pressure lands on lane
  ids — "should it be `message[]`?" is really "the badge reads badly", and the
  badge has had a `name` field available and unused all along. With the name in
  the chip, ids go back to being machine keys and a site can ship a lane called
  "Customer Order" whose id is `order`. The id stays one hover away, because it
  is what an author needs when writing `x-data-type` or debugging a refused
  wire.
-->

<script lang="ts">
  import type { PortCompatibilityChecker } from '../../utils/connections.js';

  interface Props {
    checker: PortCompatibilityChecker;
    /** Structural, for the same reason as PortShapeSymbol's. */
    port: { dataType: string };
  }

  let { checker, port }: Props = $props();

  /** The served display name for the lane, falling back to the id itself. */
  const laneName = $derived(checker.getDataTypeConfig(port.dataType)?.name ?? port.dataType);
</script>

<span class="flowdrop-badge flowdrop-badge--sm flowdrop-badge--outline" title={port.dataType}>
  {laneName}
</span>
