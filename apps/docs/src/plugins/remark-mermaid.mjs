/**
 * Remark plugin that converts ```mermaid code blocks into
 * <pre class="mermaid"> elements for client-side rendering.
 */
import { visit } from 'unist-util-visit';

export function remarkMermaid() {
	return (tree) => {
		visit(tree, 'code', (node, index, parent) => {
			if (node.lang !== 'mermaid') return;

			parent.children[index] = {
				type: 'html',
				value: `<pre class="mermaid">${node.value}</pre>`,
			};
		});
	};
}
