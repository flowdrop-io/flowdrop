<!--
  @component
  Wraps a story in the `flowdrop-scope` marker, the way a mounted editor part is wrapped.

  The library's `box-sizing: border-box` reset applies only inside `.flowdrop-scope`, `.flowdrop-root` and
  `.flowdrop-portal`. A full-width component such as the navbar needs it, or its padding pushes it past the
  edge of the window. In the editor `App` provides the scope; in a story this does.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="flowdrop-scope">
  {@render children()}
</div>
