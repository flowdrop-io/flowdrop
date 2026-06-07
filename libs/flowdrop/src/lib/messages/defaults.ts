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
    },

    code: {
      // FormCodeEditor — JSON editor aria-label.
      editor: 'JSON editor'
    },

    template: {
      // FormTemplateEditor — Mustache/template editor aria-label.
      editor: 'Template editor'
    }
  },

  interrupt: {
    // Shared resolution notice rendered after any interrupt prompt is answered.
    responseSubmitted: 'Response submitted',
    responseSubmittedBy: ({ name }: { name: string }) => `Response submitted by ${name}`,

    confirmation: {
      yes: 'Yes',
      no: 'No'
    },

    choice: {
      submit: 'Submit',
      // Selection counter rendered inside the picker, e.g. "2 of 5 selected".
      selectedCount: ({ n, total }: { n: number; total: number }) => `${n} of ${total} selected`,
      min: ({ n }: { n: number }) => `(min: ${n})`,
      max: ({ n }: { n: number }) => `(max: ${n})`
    },

    review: {
      acceptAll: 'Accept All',
      rejectAll: 'Reject All',
      submit: 'Submit Review',
      empty: '(empty)',
      yes: 'Yes',
      no: 'No',
      // Per-row controls.
      acceptItem: ({ label }: { label: string }) => `Accept ${label}`,
      rejectItem: ({ label }: { label: string }) => `Reject ${label}`,
      accept: 'Accept',
      reject: 'Reject',
      accepted: 'Accepted',
      rejected: 'Rejected',
      // Diff/preview controls.
      rendered: 'Rendered',
      rawHtml: 'Raw HTML',
      original: 'Original:',
      proposed: 'Proposed:',
      diff: 'Diff:',
      // Header counter — accepted decisions out of total.
      counter: ({ accepted, total }: { accepted: number; total: number }) =>
        `${accepted} of ${total} accepted`,
      // Footer summary — accepted/rejected breakdown.
      summary: ({
        accepted,
        rejected,
        total
      }: {
        accepted: number;
        rejected: number;
        total: number;
      }) => `${accepted} accepted, ${rejected} rejected out of ${total} changes`
    },

    form: {
      submit: 'Submit',
      // Boolean and empty-cell rendering in the submitted-values readout.
      yes: 'Yes',
      no: 'No',
      empty: '—',
      submittedValuesTitle: 'Submitted Values'
    },

    text: {
      placeholder: 'Enter your response...',
      min: ({ n }: { n: number }) => `(min: ${n})`,
      submit: 'Submit'
    },

    bubble: {
      // Pre-resolution status — keyed by interrupt kind.
      required: {
        confirmation: 'Confirmation Required',
        selection: 'Selection Required',
        input: 'Input Required',
        form: 'Form Required',
        review: 'Review Required',
        default: 'Action Required'
      },
      // Post-resolution status.
      submitted: {
        confirmation: 'Confirmation Submitted',
        selection: 'Selection Made',
        input: 'Input Submitted',
        form: 'Form Submitted',
        review: 'Review Submitted',
        default: 'Response Submitted'
      },
      cancelled: 'Cancelled',
      errorRetry: 'Error - Click to Retry',
      retry: 'Retry',
      cancel: 'Cancel',
      fromWorkflow: 'From workflow node',
      nodeIdTooltip: ({ id }: { id: string }) => `Node ID: ${id}`
    }
  },

  navigation: {
    // Navbar branding (rendered when no consumer overrides via title prop).
    appName: 'FlowDrop',
    tagline: 'Visual Workflow Manager',
    breadcrumbAriaLabel: 'Breadcrumb',
    connected: 'Connected',
    settingsTitle: 'Settings',
    settingsAriaLabel: 'Open settings',
    // Default primary action labels rendered when no `navbarActions` prop is supplied.
    save: 'Save',
    export: 'Export',
    import: 'Import',
    workflowSettings: 'Workflow Settings',
    // Right-sidebar workflow settings panel (distinct from the navbar action label above).
    workflowSettingsPanelTitle: 'Workflow Settings',
    workflowSettingsPanelSubtitle: 'Settings',
    nodeConfigDescription: 'Node configuration',
    closeSettings: 'Close settings',
    closeConfigModal: 'Close configuration modal',
    copyId: 'Copy ID to clipboard',
    // Bottom panel tab labels.
    bottomPanel: {
      console: 'Console',
      chat: 'AI Assistant'
    }
  },

  layout: {
    // Sidebar/main-region landmarks.
    componentsSidebar: 'Components sidebar',
    workflowCanvas: 'Workflow canvas',
    executionLogs: 'Execution logs sidebar',
    settingsCategories: 'Settings categories',
    searchComponents: 'Search components',
    commandConsole: 'Command Console (`)',
    backToConfiguration: 'Back to configuration',
    // Resize handle labels — keyboard users tab to these.
    resizeLeftSidebar: 'Resize left sidebar',
    resizeRightSidebar: 'Resize right sidebar',
    resizeBottomPanel: 'Resize bottom panel',
    expandSidebar: 'Expand sidebar',
    collapseSidebar: 'Collapse sidebar',
    closePlaygroundModal: 'Close playground modal',
    closeLogsSidebar: 'Close logs sidebar',
    closeConfigPanel: 'Close panel',
    closeConsole: 'Close console',
    swapNode: 'Swap node',
    backToNodeSelection: 'Back to node selection',
    loadSession: ({ name }: { name: string }) => `Load session: ${name}`
  },

  chat: {
    // AIChatPanel labels.
    aiAssistant: 'AI Assistant',
    requiresBackend: 'AI Assistant requires backend configuration',
    loadWorkflow: 'Load a workflow to start chatting',
    helpBuild: 'Ask the AI to help build your workflow',
    placeholder: 'Describe what you want to build...',
    send: 'Send message',
    autoRetry: ({ attempt, max }: { attempt: number; max: number }) =>
      `Auto-retrying (attempt ${attempt}/${max})…`,
    // CommandPreview labels.
    commandPreview: {
      ariaLabel: 'Command preview',
      applying: 'Applying…',
      applied: 'Applied',
      dismissed: 'Dismissed',
      applyAll: 'Apply All',
      cancel: 'Cancel'
    }
  },

  playground: {
    chat: {
      placeholder: 'Type your message...',
      predefinedRun: 'Run workflow'
    },
    states: {
      newSessionTitle: 'New session',
      newSessionText: 'Test your flow with a prompt',
      processing: 'Processing...',
      viewOnlyHelp: 'View-only mode. Workflow execution is controlled externally.'
    },
    actions: {
      stopTitle: 'Stop execution',
      stop: 'Stop',
      sendTitle: 'Send message',
      send: 'Send',
      runTitle: 'Run workflow',
      runWaitingTitle: 'Waiting for workflow to be ready...',
      run: 'Run'
    },
    // Message author labels.
    roles: {
      you: 'You',
      assistant: 'Assistant',
      system: 'System',
      log: 'Log',
      message: 'Message'
    },
    messageTooltips: {
      nodeId: ({ id }: { id: string }) => `Node ID: ${id}`,
      executionDuration: 'Execution duration'
    },
    // ARIA labels for message annotations. The hierarchy trail names the
    // actual path so AT users hear "From: ForEach Loop / Greeter" rather
    // than a generic "hierarchy".
    messageAnnotations: {
      hierarchyOf: ({ path }: { path: string }) => `From: ${path}`
    },
    sessions: {
      header: 'Sessions',
      newSession: 'New Session',
      empty: 'No sessions yet',
      clickAgainToConfirm: 'Click again to confirm',
      cancel: 'Cancel',
      deleteSession: 'Delete session',
      // Relative timestamp formatting.
      justNow: 'Just now',
      minutesAgo: ({ n }: { n: number }) => `${n}m ago`,
      hoursAgo: ({ n }: { n: number }) => `${n}h ago`,
      daysAgo: ({ n }: { n: number }) => `${n}d ago`
    },
    executionConsole: {
      header: 'Execution',
      noExecutionTitle: 'No execution yet',
      noExecutionText:
        'Create or select a session below, then run your workflow to see execution output here.',
      readyTitle: 'Ready to run',
      readyText:
        'Use the controls below to start the workflow. Output and interactive prompts will appear here.',
      newSession: 'New session'
    },
    controlPanel: {
      sessionsLabel: 'Session',
      noSession: 'No session',
      switchSession: 'Switch session',
      newSession: 'New session',
      pipeline: 'Pipeline',
      showPipeline: 'Show pipeline',
      hidePipeline: 'Hide pipeline',
      refresh: 'Refresh',
      refreshTitle: 'Refresh status',
      logs: 'Logs',
      showLogs: 'Show log messages',
      hideLogs: 'Hide log messages',
      deleteSession: 'Delete session',
      messageStreamLabel: 'Execution output'
    }
  },

  nodes: {
    notes: {
      placeholder: 'Add your notes here...',
      types: {
        info: 'Info',
        warning: 'Warning',
        success: 'Success',
        error: 'Error',
        default: 'Note'
      },
      processing: 'Processing...',
      errorOccurred: 'Error occurred',
      configure: 'Configure note'
    },

    // SvelteFlow node aria-labels — every visible node and port needs a
    // landmark. The `name`/`title` parameter is the rendered display
    // string (already localised by the workflow author or fallback).
    graph: {
      workflowNode: ({ name }: { name: string }) => `Workflow node: ${name}`,
      gatewayNode: ({ title }: { title: string }) => `Gateway node: ${title}`,
      ideaNode: ({ title }: { title: string }) => `Idea node: ${title}`,
      connectInputPort: ({ name }: { name: string }) => `Connect to ${name} input port`,
      connectOutputPort: ({ name }: { name: string }) => `Connect from ${name} output port`,
      connectBranch: ({ name }: { name: string }) => `Connect from ${name} branch`
    }
  },

  status: {
    // Pipeline status panel.
    pipeline: {
      refresh: 'Refresh Status',
      refreshing: 'Refreshing...',
      viewLogs: 'View Logs',
      home: 'Home',
      workflows: 'Workflows',
      workflow: 'Workflow',
      pipelines: 'Pipelines',
      pipelineCrumb: ({ id, status }: { id: string; status: string }) =>
        `Pipeline ${id} - ${status}`
    },
    // NodeStatusOverlay tooltip content. The `status` parameter is the
    // resolved status label (typically from `getStatusLabel()` so it stays
    // consistent with status icons elsewhere); the wrapper text is localized.
    overlay: {
      tooltip: ({ status, count }: { status: string; count: number }) =>
        `${status} - Executed ${count} times`,
      ariaLabel: ({ status }: { status: string }) => `Node execution status: ${status}`,
      statusLabel: 'Status:',
      executionsLabel: 'Executions:',
      lastRunLabel: 'Last Run:',
      durationLabel: 'Duration:',
      errorLabel: 'Error:',
      historyLabel: 'Runs:'
    }
  }
} as const;
