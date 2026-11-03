/**
 * Impact types: what saving a draft would change for the things that use the
 * workflow, as a backend reports it before the save.
 *
 * @module types/impact
 */

export type ImpactSeverity = 'breaks' | 'changes' | 'info';

/** One thing the save touches. */
export interface ImpactItem {
  kind: string;
  severity: ImpactSeverity;
  label: string;
  message: string;
  /** Where to look at the affected thing, when the backend knows. */
  url: string | null;
}

/** The answer of the impact check. */
export interface ImpactReport {
  /** The editor asks before saving when this is set. */
  confirm: boolean;
  /** The level of the interface change, as the backend names it. */
  interfaceLevel: string;
  interfaceBreaking: boolean;
  items: ImpactItem[];
}
