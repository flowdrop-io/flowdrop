/**
 * Decides whether a stored draft is worth offering back to the user.
 *
 * Pure: the mount reads the draft and the loaded workflow, asks here, and
 * shows the Restore / Discard toast only when this returns an offer.
 *
 * @module utils/draftRestore
 */

import { draftFingerprint, type loadDraft } from '../services/draftStorage.js';
import type { Workflow } from '../types/index.js';

type StoredDraft = NonNullable<ReturnType<typeof loadDraft>>;

/** What the Restore / Discard toast needs to know about a draft. */
export interface DraftOffer {
  /** ISO time the draft was written */
  savedAt: string;
  /** The workflow was saved after this draft started, so restoring overwrites that save */
  savedSince: boolean;
}

/**
 * The offer for a draft, or null when there is nothing to offer: no draft, no
 * loaded workflow, a draft of another workflow, or a draft that matches what
 * is loaded.
 */
export function draftOffer(draft: StoredDraft | null, loaded: Workflow | null): DraftOffer | null {
  if (!draft || !loaded) return null;
  if (draft.workflow.id !== loaded.id) return null;
  if (draftFingerprint(draft.workflow) === draftFingerprint(loaded)) return null;
  const base = draft.metadata.baseRevision;
  return {
    savedAt: draft.metadata.savedAt,
    savedSince: base !== undefined && base !== String(loaded.revision)
  };
}

/** Time of day for a draft written today, otherwise the date and time. */
export function draftTimeLabel(savedAt: string, now: Date = new Date()): string {
  const when = new Date(savedAt);
  if (Number.isNaN(when.getTime())) return savedAt;
  return when.toDateString() === now.toDateString()
    ? when.toLocaleTimeString()
    : when.toLocaleString();
}
