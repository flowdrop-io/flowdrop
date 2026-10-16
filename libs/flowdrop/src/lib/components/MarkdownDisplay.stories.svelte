<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import MarkdownDisplay from './MarkdownDisplay.svelte';

  const { Story } = defineMeta({
    title: 'Components/MarkdownDisplay',
    component: MarkdownDisplay,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
    argTypes: { content: { control: 'text' } }
  });
</script>

<Story
  name="Chat reply"
  args={{
    content:
      'Done. I added a **Chat Input** node and connected it to the model.\n\n1. Open the node and pick a model.\n2. Run the workflow in Test mode.\n\nUse `chat_reply` as the output port.'
  }}
  parameters={{
    docs: {
      description: { story: 'The kind of text the AI assistant sends back in the chat panel.' }
    }
  }}
/>

<Story
  name="Code block"
  args={{
    content:
      'Here is a code example:\n\n```javascript\nconst greeting = "Hello";\nconsole.log(greeting);\n```\n\nAnd some text after.'
  }}
/>

<Story
  name="Full document"
  args={{
    content:
      '# Workflow Guide\n\n## Getting Started\n\nFollow these steps:\n\n1. Create a new workflow\n2. Add nodes from the sidebar\n3. Connect nodes with edges\n\n> **Tip:** Use keyboard shortcuts for faster editing.\n\n### Supported Node Types\n\n| Type | Description |\n|------|-------------|\n| Start | Entry point |\n| End | Exit point |\n| Tool | Processing step |\n\nFor more info, visit [the docs](https://example.com).'
  }}
  parameters={{
    docs: {
      description: {
        story: 'Headings, lists, a quote, a table and a link, as a note node shows them.'
      }
    }
  }}
/>
