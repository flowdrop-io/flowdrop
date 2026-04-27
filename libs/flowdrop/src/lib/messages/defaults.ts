/**
 * Default English strings for every user-facing label, message, and tooltip
 * rendered by FlowDrop.
 *
 * Consumers override any subset by passing `messages={() => partial}` to the
 * root `<FlowDrop>` component (see `./context.ts`).
 *
 * Conventions:
 *   - Group by **domain** (form, interrupt, chat, navigation, status, nodes,
 *     common), not by component file path. Component paths churn; domains
 *     don't.
 *   - Parameterised strings are **functions**, not template strings with
 *     placeholders. The compiler then enforces the param shape at every call
 *     site.
 *   - Leaves are either `string` or `(params) => string`. Nothing else.
 *
 * The `as const` assertion is load-bearing: without it, every string widens
 * to `string` and the `Messages` type loses its precision.
 */

export const defaultMessages = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    delete: 'Delete',
    yes: 'Yes',
    no: 'No'
  }
} as const;
