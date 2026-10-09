/**
 * Link between NodeInspector (tabs, meta rows) and the ConfigForm inside it.
 * The form reports what it can show; the inspector says which tab is open.
 */
import { getContext, setContext } from 'svelte';
import type { FormSection } from './inspectorSections.js';

export interface ExternalLinkInfo {
  /** Muted lead-in ("Runs"), absent for a plain labelled link. */
  prefix?: string;
  /** Link text, e.g. "Calculator". */
  name: string;
  /** Tooltip */
  title?: string;
  href: string;
  newTab: boolean;
}

export interface InspectorContext {
  /** The form tab currently shown. */
  readonly section: FormSection;
  /** The form reports the tabs it has and its external-workflow link. */
  report: (sections: FormSection[], external: ExternalLinkInfo | null) => void;
}

const KEY = 'flowdrop:inspector';

export function provideInspectorContext(ctx: InspectorContext): void {
  setContext(KEY, ctx);
}

export function getInspectorContext(): InspectorContext | undefined {
  return getContext<InspectorContext | undefined>(KEY);
}
