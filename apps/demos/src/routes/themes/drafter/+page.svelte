<script lang="ts">
  import ThemeDemo from '$lib/ThemeDemo.svelte';
</script>

<svelte:head>
  <title>FlowDrop · Drafter theme</title>
</svelte:head>

<!--
  `drafter` ships in the library source but is NOT in the published
  @flowdrop/flowdrop@2.0.0-beta.2 (its FlowDropThemeName is 'default' | 'minimal').
  Against the published package it gracefully falls back to the default theme;
  against current local source — and once a release including drafter is
  published — it renders as the real drafter theme. The cast keeps `svelte-check`
  green until then.
-->
<ThemeDemo theme={'drafter' as 'default' | 'minimal'} instanceId="demo-drafter" />
