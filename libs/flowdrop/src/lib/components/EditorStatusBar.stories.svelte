<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import EditorStatusBar from './EditorStatusBar.svelte';
  import { fn } from 'storybook/test';

  // The real message when the endpoint serves HTML instead of JSON.
  const htmlAnswer =
    'API Error: Unexpected token \'<\', "<!doctype "... is not valid JSON. No node types available.';

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Status bar',
    component: EditorStatusBar,
    tags: ['autodocs'],
    // The banner is full-width editor chrome: show it edge to edge.
    parameters: { layout: 'fullscreen' },
    args: {
      onRetry: fn(),
      onSetApiUrl: fn(),
      onTestApi: fn(),
      onDismiss: fn()
    }
  });
</script>

<Story
  name="In the editor"
  args={{ error: 'API Error: Failed to fetch. No node types available.' }}
  parameters={{
    docs: {
      description: {
        story:
          'The editor opened and could not reach its backend, so the node palette is empty. Retry loads the node types again.'
      }
    }
  }}
/>

<Story
  name="Backend sends a web page"
  args={{
    error: htmlAnswer
  }}
  parameters={{
    docs: {
      description: {
        story:
          'The address is wrong and the server answers with an HTML page (a 404, for example) instead of JSON. The raw message is long; the bar wraps it.'
      }
    }
  }}
/>

<Story
  name="Backend not reachable"
  args={{
    error: 'API Error: NetworkError when attempting to fetch resource. No node types available.'
  }}
  parameters={{
    docs: {
      description: {
        story:
          'The server is down or blocked. Set API URL lets the person point the editor somewhere else.'
      }
    }
  }}
/>
