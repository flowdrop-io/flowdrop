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
  /** The save is refused while things use the workflow. Absent from an older backend: `false`. */
  refused?: boolean;
  /** The backend's own words for the refusal, when it gives them. */
  refusedMessage?: string | null;
  /** Where to POST the draft to save it as a new workflow instead (`Save as a copy`). */
  copyUrl?: string | null;
  /** Renamed inputs and outputs, with the places that follow when the person agrees. */
  renames?: ImpactRename[];
}

/** An interface input or output the draft renames. */
export interface ImpactRename {
  direction: 'input' | 'output';
  from: string;
  to: string;
  /** What uses the old name and is updated when the rename is followed. */
  places: ImpactItem[];
}

/** The new workflow a `Save as a copy` made. */
export interface SavedCopy {
  /** The new workflow id, when the backend names it. */
  id: string | null;
  /** The editor URL of the copy, when the backend names it. */
  editorUrl: string | null;
}

/** What the person decided in the impact dialog. Internal: nothing public takes or returns it. */
export type ImpactAnswer =
  /** Save. `followRenames` is set only when the dialog listed renames. */
  | { action: 'save'; followRenames?: boolean }
  | { action: 'cancel' }
  /** The draft was saved as a new workflow. */
  | { action: 'copied'; copy: SavedCopy }
  /** The draft was reverted to the last saved version. */
  | { action: 'undone' };
