<!--
  Port shape symbol — the one saturated mark on a port row.

  A glyph in a small chip saying what SHAPE the port carries (`S` text, `[]`
  list, `{}` object, …), tinted with the port's lane colour. The lane's own id
  rides beside it in an outlined chip (PortLaneChip), so shape and lane stop
  competing for the single colour channel. See utils/portShape.ts for where the
  shape comes from.

  Only the lane colour is set inline, as one custom property; the chip's tints
  are computed from it in the stylesheet (styles/base.css), so a consumer can
  restyle `.flowdrop-port-symbol` without fighting an inline declaration. The
  `--fd-port-skin-color` override wins there too, exactly as it does on handles.

  The glyph is `aria-hidden`: it is derived from the lane id in the chip beside
  it, which screen readers already announce. Saying "list" before every port
  name adds an utterance per port and no information.
-->

<script lang="ts">
  import type { PortCompatibilityChecker } from '../../utils/connections.js';
  import { getPortColorToken } from '../../utils/colors.js';
  import { portGlyph, portShapeLabel } from '../../utils/portShape.js';

  interface Props {
    /** The instance's port-compatibility checker — the source of lane colour. */
    checker: PortCompatibilityChecker;
    /**
     * The port to draw. Structural rather than a `NodePort`, because a gateway
     * branch is not a port and should not have to pretend it has an id to be
     * rendered — see GatewayNode. An absent id simply never matches the
     * reserved `error` output.
     */
    port: { id?: string; type?: string; dataType: string };
  }

  let { checker, port }: Props = $props();

  /** Lane colour, or the reserved error output's red. */
  const color = $derived(getPortColorToken(checker, port));
  const glyph = $derived(portGlyph(checker, port));
  const label = $derived(portShapeLabel(checker, port));
</script>

<span
  class="flowdrop-port-symbol"
  aria-hidden="true"
  title={label}
  style="--fd-port-symbol-color: {color}"
>
  {glyph}
</span>
