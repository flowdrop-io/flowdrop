import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/**
 * Storybook's Svelte docgen documents props only; it never reads the
 * component's own description. This plugin runs after it and copies the
 * `<!-- @component ... -->` header of each .svelte file into
 * `__docgen.description`, which the docs page shows under the title.
 *
 * The header in the component file stays the single source: stories do not
 * repeat it in `parameters.docs.description.component`.
 */

const HEADER_RE = /<!--\s*@component\b([\s\S]*?)-->/;
const DOCGEN_RE = /;(\w+)\.__docgen = /;

/** The `@component` header text, dedented, or null when there is none. */
export function readComponentHeader(source: string): string | null {
  const match = HEADER_RE.exec(source);
  if (!match) return null;
  const lines = match[1]
    .replace(/^[ \t]*\n/, '')
    .replace(/\s+$/, '')
    .split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => /^[ \t]*/.exec(l)![0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  const text = lines
    .map((l) => l.slice(cut))
    .join('\n')
    .trim();
  return text || null;
}

export function componentDescriptions(): Plugin {
  return {
    name: 'flowdrop:component-descriptions',
    enforce: 'post',
    transform(code, id) {
      if (id.startsWith('\0') || !id.endsWith('.svelte') || id.includes('/node_modules/')) return;
      const docgen = DOCGEN_RE.exec(code);
      if (!docgen) return;
      let header: string | null;
      try {
        header = readComponentHeader(readFileSync(id, 'utf8'));
      } catch {
        return;
      }
      if (!header) return;
      return {
        code: `${code}\n;${docgen[1]}.__docgen.description = ${JSON.stringify(header)};`,
        map: null
      };
    }
  };
}
