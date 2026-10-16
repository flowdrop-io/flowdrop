/**
 * Splits a node's form into the inspector's tabs.
 *
 * fddo delivers a uiSchema whose top level is a VerticalLayout of loose controls
 * (the node's own fields) followed by General / Execution / Ports groups. The
 * inspector shows them as tabs: Ports -> Ports, Execution -> Execution, everything
 * else (node fields first, then General) -> Config. A schema without those groups
 * simply has one tab.
 */
import type { UISchemaElement, UISchemaGroup } from '../types/uischema.js';
import { resolveScopeToKey } from './uischema.js';
import { PORTS_CONFIG_KEY } from './nodeFormSchema.js';

export type FormSection = 'config' | 'ports' | 'execution';

export const FORM_SECTION_ORDER: FormSection[] = ['config', 'ports', 'execution'];

export type SectionElements = Record<FormSection, UISchemaElement[]>;

function sectionOf(element: UISchemaElement): FormSection {
  if (element.type === 'Group') {
    const label = (element as UISchemaGroup).label?.trim().toLowerCase();
    if (label === 'ports') return 'ports';
    if (label === 'execution') return 'execution';
  }
  if (element.type === 'Control' && resolveScopeToKey(element.scope) === PORTS_CONFIG_KEY) {
    return 'ports';
  }
  return 'config';
}

/** Nested vertical layouts (the ports control wraps the authored tree in one) read as one list. */
function flatten(elements: UISchemaElement[]): UISchemaElement[] {
  return elements.flatMap((e) => (e.type === 'VerticalLayout' ? flatten(e.elements) : [e]));
}

/**
 * Partition a uiSchema into per-tab element lists. The Ports and Execution
 * groups are unwrapped (the tab is their heading); Config keeps its own groups.
 */
export function splitInspectorSections(uiSchema: UISchemaElement | undefined): SectionElements {
  const out: SectionElements = { config: [], ports: [], execution: [] };
  if (!uiSchema) return out;
  const top = flatten([uiSchema]);
  for (const element of top) {
    const section = sectionOf(element);
    if (section !== 'config' && element.type === 'Group') {
      out[section].push(...element.elements);
    } else {
      out[section].push(element);
    }
  }
  return out;
}

/** The tabs with something in them, in display order. */
export function nonEmptySections(sections: SectionElements): FormSection[] {
  return FORM_SECTION_ORDER.filter((s) => sections[s].length > 0);
}
