<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import RunStatusRoles from './RunStatusRoles.svelte';
  // The page is RunStatus.mdx; these stories are its live parts.
  const { Story } = defineMeta({
    title: 'Foundations/Run status',
    parameters: { layout: 'fullscreen' }
  });
</script>

<Story name="Status roles" exportName="StatusRoles">
  {#snippet template()}<RunStatusRoles />{/snippet}
</Story>
