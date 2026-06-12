<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import EditorStatusBar from './EditorStatusBar.svelte';
  import { fn } from 'storybook/test';

  const { Story } = defineMeta({
    title: 'Editor/EditorStatusBar',
    component: EditorStatusBar,
    tags: ['autodocs'],
    parameters: {
      // The banner is full-width editor chrome — show it edge to edge.
      layout: 'fullscreen'
    },
    args: {
      onRetry: fn(),
      onSetApiUrl: fn(),
      onTestApi: fn(),
      onDismiss: fn()
    }
  });
</script>

<Story
  name="Default"
  args={{
    error: 'API Error: Failed to fetch. No node types available.'
  }}
/>

<!-- The real message when the endpoint serves HTML (e.g. a 404 page) instead of JSON. -->
<Story
  name="Long Message"
  args={{
    error:
      'API Error: Unexpected token \'<\', "<!doctype "... is not valid JSON. No node types available.'
  }}
/>

<Story
  name="Endpoint Unreachable"
  args={{
    error: 'API Error: NetworkError when attempting to fetch resource. No node types available.'
  }}
/>
