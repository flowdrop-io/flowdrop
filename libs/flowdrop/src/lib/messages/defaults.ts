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
  },

  form: {
    array: {
      // Item-level controls — `n` is the 1-based item position the user sees.
      itemLabel: ({ n }: { n: number }) => `Item ${n}`,
      expandItem: 'Expand item',
      collapseItem: 'Collapse item',
      moveItemUp: ({ n }: { n: number }) => `Move item ${n} up`,
      moveItemDown: ({ n }: { n: number }) => `Move item ${n} down`,
      deleteItem: ({ n }: { n: number }) => `Delete item ${n}`,
      moveUp: 'Move up',
      moveDown: 'Move down',
      delete: 'Delete item',
      // Boolean rendering inside array items.
      yes: 'Yes',
      no: 'No',
      // Empty state and limits.
      empty: 'No items yet',
      add: 'Add Item',
      count: ({ n }: { n: number }) => `${n} item${n !== 1 ? 's' : ''}`,
      min: ({ n }: { n: number }) => `Min: ${n}`,
      max: ({ n }: { n: number }) => `Max: ${n}`,
      unsupported: ({ type }: { type: string }) =>
        `Complex item type "${type}" is not fully supported.`
    },

    markdown: {
      placeholder: 'Write your markdown here...',
      // Toolbar action labels (rendered as `title` and used in `title` with
      // an optional shortcut suffix appended by the component).
      bold: 'Bold',
      italic: 'Italic',
      strikethrough: 'Strikethrough',
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      quote: 'Quote',
      unorderedList: 'Unordered List',
      orderedList: 'Ordered List',
      link: 'Link',
      image: 'Image',
      table: 'Table',
      // Region/widget aria-labels.
      editor: 'Markdown editor',
      toolbar: 'Markdown formatting',
      // Status bar metric labels (the metric value is appended after the colon).
      words: 'words',
      lines: 'lines',
      characters: 'characters'
    },

    autocomplete: {
      removeTag: ({ label }: { label: string }) => `Remove ${label}`,
      loading: 'Loading suggestions',
      loadingPending: 'Loading suggestions...',
      clearAll: 'Clear all selections',
      suggestions: 'Suggestions',
      retry: 'Retry',
      noResults: 'No results found'
    },

    field: {
      required: 'required'
    },

    toggle: {
      enabled: 'Enabled',
      disabled: 'Disabled'
    },

    schema: {
      save: 'Save',
      cancel: 'Cancel',
      empty: 'No schema properties defined.'
    }
  }
} as const;
