<script module>
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import MarkdownDisplay from "./MarkdownDisplay.svelte";

	const { Story } = defineMeta({
		title: "Display/MarkdownDisplay",
		component: MarkdownDisplay,
		tags: ["autodocs"],
		argTypes: {
			content: { control: "text" },
		},
	});
</script>

<Story name="Simple" args={{ content: "Hello **world**! This is *italic* and `inline code`." }} />

<Story name="Headings" args={{ content: "# Heading 1\n## Heading 2\n### Heading 3\n\nParagraph text below headings." }} />

<Story name="Code Block" args={{ content: "Here is a code example:\n\n```javascript\nconst greeting = \"Hello\";\nconsole.log(greeting);\n```\n\nAnd some text after." }} />

<Story name="Full Document" args={{ content: "# Workflow Guide\n\n## Getting Started\n\nFollow these steps:\n\n1. Create a new workflow\n2. Add nodes from the sidebar\n3. Connect nodes with edges\n\n> **Tip:** Use keyboard shortcuts for faster editing.\n\n### Supported Node Types\n\n| Type | Description |\n|------|-------------|\n| Start | Entry point |\n| End | Exit point |\n| Tool | Processing step |\n\nFor more info, visit [the docs](https://example.com)." }} />
