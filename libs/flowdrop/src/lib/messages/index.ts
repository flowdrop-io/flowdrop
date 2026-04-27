/**
 * Messages module — typed, overridable, translation-ready user-facing strings.
 *
 * See `./defaults.ts` for the canonical shape, `./context.ts` for the runtime
 * plumbing, and the i18n guide in `apps/docs` for consumer recipes.
 */

export { defaultMessages } from './defaults.js';
export { mergeMessages } from './merge.js';
export { setMessages, getMessages, m } from './context.js';
export { warnDeprecatedProp } from './deprecation.js';
export type { Messages, MessagesOverride, DeepPartial } from './types.js';
