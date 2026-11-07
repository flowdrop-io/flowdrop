/**
 * Read-only context for forms.
 *
 * A parent (for example the lock fence) calls `provideFormReadOnly` with a getter.
 * Form fields call `useFormReadOnly` and treat a `true` answer like a read-only
 * schema: the value cannot be changed, but the field can still be looked at.
 * The getter is read each time, so it may be reactive.
 */

import { getContext, setContext } from 'svelte';

export const FORM_READ_ONLY_KEY = 'flowdrop:formReadOnly';

/** Tell every form field below this component whether it is read-only. */
export function provideFormReadOnly(isReadOnly: () => boolean): void {
  setContext(FORM_READ_ONLY_KEY, isReadOnly);
}

/** Whether the form around this component is read-only. Call during component setup. */
export function useFormReadOnly(): () => boolean {
  return getContext<(() => boolean) | undefined>(FORM_READ_ONLY_KEY) ?? (() => false);
}
