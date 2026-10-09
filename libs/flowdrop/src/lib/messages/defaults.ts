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
      // The one line an answered prompt folds to.
      resolved: {
        confirmed: ({ value }: { value: string }) => `Confirmed · ${value}`,
        declined: ({ value }: { value: string }) => `Declined · ${value}`,
        chose: ({ value }: { value: string }) => `Chose · ${value}`,
        submitted: 'Submitted',
        submittedValue: ({ value }: { value: string }) => `Submitted · ${value}`,
        by: ({ name }: { name: string }) => `by ${name}`
      },
      errorRetry: 'Error - Click to Retry',
      retry: 'Retry',
      cancel: 'Cancel',
      fromWorkflow: 'From workflow node',
      nodeIdTooltip: ({ id }: { id: string }) => `Node ID: ${id}`
    }
  },

  navigation: {
    // Product name: the navbar logo's accessible name and title, the fallback alt
    // text of a branded logo, and the page <title>.
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
    // The ghost button in the navbar that opens the workflow-settings panel.
    workflowButton: 'Workflow',
    workflowButtonTitle: 'Workflow settings',
    // Accessible name of the chevron that opens the Save menu.
    moreActions: 'More actions',
    // Right-sidebar workflow settings panel (distinct from the navbar action label above).
    workflowSettingsPanelTitle: 'Workflow Settings',
    workflowSettingsPanelSubtitle: 'Settings',
    workflowSettingsGeneralTab: 'General',
    workflowSettingsInterfaceTab: 'Interface',
    workflowSettingsPlaygroundTab: 'Playground',
    // The one muted line under the tabs: "6 nodes · 6 connections".
    workflowCounts: ({ nodes, connections }: { nodes: number; connections: number }) =>
      `${nodes} ${nodes === 1 ? 'node' : 'nodes'} · ${connections} ${connections === 1 ? 'connection' : 'connections'}`,
    nodeConfigDescription: 'Node configuration',
    closeSettings: 'Close settings',
    closeConfigModal: 'Close configuration modal',
    copyId: 'Copy ID to clipboard',
    // Bottom panel tab labels.
    bottomPanel: {
      console: 'Console',
      chat: 'AI Assistant'
    },
    // The Edit | Test switch in the canvas toolbar.
    editorMode: {
      label: 'Editor mode',
      edit: 'Edit',
      test: 'Test',
      // Tooltips: the shortcut toggles the mode.
      editTitle: 'Edit the workflow (T)',
      testTitle: 'Test the workflow (T)',
      // Accessible name of the canvas toolbar that holds the switch.
      toolbarLabel: 'Canvas',
      // Title of the dot on Test while a run is going or waiting. Unused since
      // the run pill replaced the dot; kept so existing overrides still type-check.
      runActive: 'A test run is going or waiting'
    }
  },

  // The node count (and cycle warning) beside the canvas zoom controls.
  canvasStatus: {
    nodeCount: ({ n }: { n: number }) => `${n} node${n !== 1 ? 's' : ''}`,
    // Title / accessible name of the count: the full tally.
    summary: ({ nodes, edges }: { nodes: number; edges: number }) =>
      `${nodes} node${nodes !== 1 ? 's' : ''} · ${edges} connection${edges !== 1 ? 's' : ''}`,
    cycles: 'Cycles detected',
    cyclesTitle: 'The workflow contains a cycle'
  },

  contextMenu: {
    // aria-label of the canvas context menu.
    menuLabel: 'Canvas actions',
    configure: 'Configure',
    delete: 'Delete',
    deleteNodes: ({ n }: { n: number }) => `Delete ${n} node${n !== 1 ? 's' : ''}`,
    addCaption: 'Add caption',
    editText: 'Edit text',
    duplicate: 'Duplicate',
    swap: 'Swap node',
    // A port's menu: publish it in the workflow interface, rename or unpublish it.
    exposeInput: 'Expose as workflow input…',
    exposeOutput: 'Expose as workflow output…',
    renameInterfaceEntry: 'Rename…',
    removeInterfaceEntry: 'Remove from interface',
    // Key hints shown beside an entry, as key glyphs.
    shortcutEnter: '↵',
    shortcutDelete: '⌫'
  },

  // The run bar on the Edit canvas: shown only while a run exists.
  runBar: {
    label: 'Run',
    running: 'Running',
    waiting: 'Waiting',
    failed: 'Failed',
    done: 'Done',
    stopped: 'Stopped',
    stop: 'Stop',
    stopLabel: 'Stop the run',
    open: 'Open',
    openLabel: 'Open the run in Test mode',
    askAssistant: 'Ask the Assistant',
    askAssistantLabel: 'Ask the Assistant about this run',
    // Read out politely when the status changes.
    announce: {
      running: 'Run started.',
      waiting: 'Run is waiting for you.',
      failed: 'Run failed.',
      done: 'Run finished.',
      stopped: 'Run stopped.'
    }
  },

  // The inspector tabs of a node in Test mode, and the Last run tab.
  nodeInspector: {
    tabsLabel: 'Node tabs',
    config: 'Config',
    ports: 'Ports',
    execution: 'Execution',
    lastRun: 'Last run',
    notRun: 'This node has not run in the run you are viewing.',
    running: 'Running now…',
    waiting: 'Waiting for a decision in the conversation.',
    noRunShown: 'No run to show yet. Send a message or run the workflow.',
    status: 'Status',
    duration: 'Duration',
    started: 'Started',
    finished: 'Finished',
    tokens: 'Tokens',
    input: 'Input',
    output: 'Output',
    error: 'Error',
    executions: ({ n }: { n: number }) => `Ran ${n} times in this run. Showing the last.`,
    expand: 'Show all',
    collapse: 'Show less',
    askAssistant: 'Ask the Assistant about this run',
    statuses: {
      idle: 'Idle',
      pending: 'Pending',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
      skipped: 'Skipped',
      paused: 'Paused',
      interrupted: 'Waiting'
    }
  },

  layout: {
    // Sidebar/main-region landmarks.
    componentsSidebar: 'Components sidebar',
    // Edit mode's left slot: Nodes | Assistant.
    nodesTab: 'Nodes',
    workflowCanvas: 'Workflow canvas',
    executionLogs: 'Execution logs sidebar',
    settingsCategories: 'Settings categories',
    searchComponents: 'Search components',
    commandConsole: 'Command Console (`)',
    // The slim strip along the canvas's bottom edge that opens the Console.
    consoleStrip: 'Console',
    consoleStripHint: 'Press ` to toggle the Console',
    consoleExamplesLabel: 'Try',
    backToConfiguration: 'Back to configuration',
    // Resize handle labels — keyboard users tab to these.
    resizeLeftSidebar: 'Resize left sidebar',
    resizeRightSidebar: 'Resize right sidebar',
    resizeBottomPanel: 'Resize bottom panel',
    expandSidebar: 'Expand sidebar',
    collapseSidebar: 'Collapse sidebar',
    // Test mode on a narrow screen: the Playground is a drawer over the canvas.
    showPlayground: 'Show Playground',
    hidePlayground: 'Hide Playground',
    // Test mode: the node library as a popover (N).
    nodeLibrary: 'Node library',
    closePlaygroundModal: 'Close playground modal',
    closeLogsSidebar: 'Close logs sidebar',
    closeConfigPanel: 'Close panel',
    closeConsole: 'Close console',
    swapNode: 'Swap node',
    swapNodeTitle: 'Swap node type',
    popOutConfig: 'Pop out configuration',
    popOutConfigTitle: 'Pop out to a larger window',
    dockConfig: 'Dock configuration back to sidebar',
    dockConfigTitle: 'Dock back to sidebar',
    dockConfigButton: 'Dock back to sidebar',
    configPoppedOut: 'Configuration is open in a larger window.',
    backToNodeSelection: 'Back to node selection',
    loadSession: ({ name }: { name: string }) => `Load session: ${name}`
  },

  chat: {
    // AIChatPanel labels.
    aiAssistant: 'AI Assistant',
    requiresBackend: 'AI Assistant requires backend configuration',
    loadWorkflow: 'Load a workflow to start chatting',
    helpBuild: 'Ask the AI to help build your workflow',
    // Empty-state shortcuts: the chip label is also the prompt sent.
    suggestionsLabel: 'Suggestions',
    suggestions: ['Explain this workflow', 'Add error handling', 'Summarise what this does'],
    placeholder: 'Describe a change…',
    send: 'Send message',
    // The run attached to the Assistant, above the composer.
    attach: {
      add: 'Attach a run',
      chipLabel: 'Attached run',
      detach: 'Remove the attached run',
      listLabel: 'Runs of this test session',
      empty: 'No runs yet. Run the workflow in Test mode first.',
      unavailable: 'This server does not list runs.',
      run: ({ id }: { id: string }) => `Run #${id}`,
      failed: 'failed',
      stale: 'older version',
      staleTitle: 'The workflow has changed since this run.',
      statuses: {
        pending: 'running',
        running: 'running',
        waiting: 'waiting',
        interrupted: 'waiting',
        done: 'done',
        completed: 'done',
        failed: 'failed',
        stopped: 'stopped',
        cancelled: 'stopped',
        unknown: 'unknown'
      }
    },
    autoRetry: ({ attempt, max }: { attempt: number; max: number }) =>
      `Auto-retrying (attempt ${attempt}/${max})…`,
    // Tool-calling turns (tools mode).
    tools: {
      /** Status line while a read tool runs: `Reading: describe_type http_request`. */
      reading: ({ tool, detail }: { tool: string; detail: string }) =>
        detail ? `Reading: ${tool} ${detail}` : `Reading: ${tool}`,
      awaitingApproval: ({ tool }: { tool: string }) => `Waiting for your approval: ${tool}`,
      /** Title of the approval dialog when the assistant, not a browser agent, asks. */
      confirmTitle: ({ name }: { name: string }) => `The assistant wants to change “${name}”`,
      /** A read that completed: `Read: describe_type http_request`. */
      read: ({ tool, detail }: { tool: string; detail: string }) =>
        detail ? `Read: ${tool} ${detail}` : `Read: ${tool}`,
      applied: ({ tool, detail }: { tool: string; detail: string }) =>
        detail ? `Applied: ${detail}` : `Done: ${tool}`,
      rejected: ({ tool }: { tool: string }) => `You rejected: ${tool}`,
      failed: ({ tool, error }: { tool: string; error: string }) => `${tool} failed: ${error}`,
      rounds: ({ count }: { count: number }) =>
        `${count} ${count === 1 ? 'tool round' : 'tool rounds'}`,
      legacyFallback:
        'This backend does not support tool-calling turns; using the text mode for this session.',
      aborted: ({ reason }: { reason: string }) => `Stopped: ${reason}`,
      /** Deterministic warning under the reply when one or more tool calls failed this turn. */
      failedSummary: ({ count }: { count: number }) =>
        count === 1
          ? 'One tool call failed during this turn. Check the steps above before relying on the reply.'
          : `${count} tool calls failed during this turn. Check the steps above before relying on the reply.`
    },
    // CommandPreview labels.
    commandPreview: {
      ariaLabel: 'Command preview',
      applying: 'Applying…',
      applied: 'Applied',
      dismissed: 'Dismissed',
      applyAll: 'Apply All',
      cancel: 'Cancel',
      layoutSkipped: 'Skipped — AI layout changes are disabled in Settings'
    }
  },

  playground: {
    chat: {
      placeholder: 'Type your message...',
      predefinedRun: 'Run workflow'
    },
    // Shown when the workflow's Playground settings bind no chat (and no
    // deprecated interface `turn` does): the form or Run still work.
    chatNotSetUp: 'No chat yet. Pick the input the message goes to in Playground settings.',
    // Shown when a message input is bound but no reply is: the run completes
    // and nothing prints.
    chatHalfSet:
      'Nothing will reply here. Pick the results that print as replies in Playground settings.',
    // The form a workflow's interface inputs render as (inputs without a chat
    // turn; the session fills the others).
    inputForm: {
      title: 'Inputs',
      fillFromLast: 'Fill from last run',
      fillFromLastTitle: 'Fill the inputs with what the last run was started with',
      runsTitle: 'Earlier runs',
      runsLabel: 'Earlier runs of this session',
      useRun: ({ summary }: { summary: string }) => `Fill the inputs with: ${summary}`,
      folded: 'Inputs',
      foldedCount: ({ filled, total }: { filled: number; total: number }) =>
        `${filled} of ${total} filled`,
      foldedShow: 'Show the inputs',
      foldedHide: 'Hide the inputs',
      jsonHint: 'JSON',
      missingRequired: ({ names }: { names: string }) => `Fill in the required inputs: ${names}`,
      invalidJson: ({ names }: { names: string }) => `Not valid JSON for its type: ${names}`
    },
    states: {
      newSessionTitle: 'New session',
      newSessionText: 'Test your flow with a prompt',
      processing: 'Processing...',
      viewOnlyHelp: 'View-only mode. Workflow execution is controlled externally.'
    },
    // Slash commands — the composer's out-of-band control lane. Feedback is
    // transient UI, never a session message: control traffic must not enter
    // conversation history, or it feeds back into the next turn's input.
    commands: {
      unknown: ({ name }: { name: string }) => `Unknown command: /${name}`,
      unknownWithSuggestions: ({ name, suggestions }: { name: string; suggestions: string }) =>
        `Unknown command: /${name}. Did you mean ${suggestions}?`,
      unavailable: ({ name }: { name: string }) => `/${name} is not supported by this backend`,
      needsSession: ({ name }: { name: string }) => `/${name} needs an active session`,
      helpHeading: 'Available commands',
      helpEscapeHint: 'To send a message starting with a slash, type it twice: //like this',
      // Display text for each command, shown by `/help` and by the palette.
      // Lives here rather than in the command registry so translators reach it
      // through the same channel as everything else; the registry keeps only
      // the structural facts (does it take arguments, is it available).
      catalog: {
        help: { usage: '/help', summary: 'List the commands available here' },
        run: {
          usage: '/run [--input=value ...]',
          summary: 'Start a run, optionally with named inputs'
        },
        new: { usage: '/new', summary: 'Start a new session' },
        stop: { usage: '/stop', summary: 'Stop what this session is running' },
        reset: { usage: '/reset', summary: 'Reset a stuck session to idle' },
        delete: { usage: '/delete', summary: 'Delete the current session' },
        pause: { usage: '/pause [reason]', summary: 'Ask the active run to pause' },
        resume: { usage: '/resume [reason]', summary: 'Resume the paused run' },
        cancel: { usage: '/cancel [reason]', summary: 'Cancel the active run — cannot be undone' }
      },
      dismiss: 'Dismiss',
      stopped: 'Execution stopped',
      reset: 'Session reset',
      created: 'New session created',
      deleted: 'Session deleted',
      failed: ({ name, error }: { name: string; error: string }) => `/${name} failed: ${error}`,
      // Pipeline signals. Wording matters: a backend acknowledges a signal
      // before acting on it, so these say "requested" and let the status poll
      // report the real state. Claiming "Paused" on acknowledgement would be
      // wrong exactly when the current step is slow.
      needsRun: ({ name }: { name: string }) => `/${name} needs an active run`,
      signalPending: ({ signal }: { signal: string }) =>
        `A ${signal} is already pending for this run`,
      pauseRequested: 'Pause requested — finishing the current step',
      resumeRequested: 'Resume requested',
      cancelRequested: 'Cancel requested — finishing the current step',
      refusedTerminal: ({ name }: { name: string }) => `Cannot ${name}: the run already finished`,
      refusedDuplicate: 'A signal is already pending for this run',
      refusedNotPaused: 'Nothing to resume — this run is not paused',
      refusedNotFound: 'That run no longer exists',
      refusedForbidden: ({ name }: { name: string }) =>
        `You do not have permission to ${name} this run`,
      refusedOther: ({ name, error }: { name: string; error: string }) =>
        `/${name} refused: ${error}`,
      // Launch. Bad inputs and an invalid workflow are separated on purpose —
      // one is the caller's to fix, the other is an authoring problem.
      runStarted: 'Run started',
      runInvalidInput: ({ error }: { error: string }) => `Cannot start: ${error}`,
      runInvalidWorkflow: ({ error }: { error: string }) =>
        `Cannot start — this workflow has errors: ${error}`,
      runInvalidWorkflowDetail: ({ locator, message }: { locator: string; message: string }) =>
        locator ? `  • ${locator}: ${message}` : `  • ${message}`
    },
    actions: {
      stopTitle: 'Stop execution',
      stop: 'Stop',
      sendTitle: 'Send message',
      send: 'Send',
      runTitle: 'Run workflow',
      runWaitingTitle: 'Waiting for workflow to be ready...',
      run: 'Run',
      // The editor's Playground while the workflow has unsaved edits: the
      // action saves first, then goes.
      saveAndSend: 'Save & send',
      saveAndSendTitle: 'Save the workflow, then send the message',
      // Under the composer while the workflow has unsaved edits.
      saveFirstHint: 'Unsaved edits: sending saves the workflow first.',
      saveAndRun: 'Save & run',
      saveAndRunTitle: 'Save the workflow, then run it',
      saving: 'Saving…'
    },
    // Shown in the conversation where the workflow was saved (a new version).
    versionDivider: 'Saved — new version',
    // Save & send, when the save did not happen: nothing is sent.
    saveFailed: ({ message }: { message: string }) =>
      `Not sent: the workflow was not saved. ${message}`,
    saveNotDone: 'Not sent: the workflow was not saved.',
    // A run or test session needs a saved workflow and there is none yet.
    saveFirst: 'Save the workflow first: a test session needs a saved workflow.',
    // Message author labels.
    roles: {
      you: 'You',
      assistant: 'Assistant',
      system: 'System',
      log: 'Log',
      message: 'Message'
    },
    // Badges for messages posted by a component other than the person or
    // the workflow (the message `origin`). user/workflow are never badged.
    origins: {
      user: 'User',
      workflow: 'Workflow',
      engine: 'Engine',
      playground: 'Playground',
      interrupt: 'Interrupt',
      postedBy: ({ origin }: { origin: string }) => `Posted by: ${origin}`
    },
    /** @deprecated Unused since the steps row; log lines fold into `steps`. */
    logGroup: {
      summary: ({ count }: { count: number }) => `${count} log lines`
    },
    // One row per turn that folds the node steps: "4 steps · 46 ms · 1 waiting".
    steps: {
      summary: ({ count }: { count: number }) => `${count} ${count === 1 ? 'step' : 'steps'}`,
      waiting: ({ count }: { count: number }) => `${count} waiting`,
      failed: ({ count }: { count: number }) => `${count} failed`,
      tableLabel: 'Steps of this turn',
      columnNode: 'Node',
      columnStatus: 'Status',
      columnCount: 'Runs',
      columnDuration: 'Time',
      repeated: ({ count }: { count: number }) => `Ran ${count} times`,
      pendingNode: 'Waiting for input',
      // Short names for the table's status column (the pill's own are long).
      status: {
        running: 'Running',
        completed: 'Done',
        waiting: 'Waiting',
        failed: 'Failed',
        skipped: 'Skipped'
      }
    },
    // A turn the person started without typing (Run on a form or run-only
    // workflow): what its otherwise empty bubble says instead.
    emptyTurn: {
      run: 'Started a run',
      withInputs: ({ names }: { names: string }) => `Ran with ${names}`
    },
    messageTooltips: {
      nodeId: ({ id }: { id: string }) => `Node ID: ${id}`,
      executionDuration: 'Execution duration',
      // The node link above a reply: jumps to the node on request.
      showNodeLastRun: ({ label }: { label: string }) => `Show ${label} and its last run`
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
      /** @deprecated The console no longer draws a header row. */
      header: 'Execution',
      noExecutionTitle: 'No execution yet',
      noExecutionText:
        'Create or select a session below, then run your workflow to see execution output here.',
      /** @deprecated The "Ready to run" state is gone; an empty session shows nothing. */
      readyTitle: 'Ready to run',
      /** @deprecated See `readyTitle`. */
      readyText:
        'Use the controls below to start the workflow. Output and interactive prompts will appear here.',
      newSession: 'New session'
    },
    // The docked Playground's header (Test mode): the history chip and the
    // overflow menu. One line under each action says when it is needed.
    header: {
      history: 'Conversation and run history',
      noConversation: 'New conversation',
      conversations: 'Conversations',
      runs: 'Runs',
      newConversation: 'New conversation',
      newConversationHint: 'The current one stays on the sessions page',
      noRuns: 'No runs yet',
      noRunsHint: 'Send a message or press Run to make one',
      run: ({ number }: { number: number }) => `Run ${number}`,
      staleRun: 'older version',
      currentRun: 'shown',
      moreActions: 'More actions',
      showSteps: 'Expand steps by default',
      showStepsHint: 'Each turn shows its steps open instead of one folded row',
      jsonView: 'JSON view',
      jsonViewHint: 'Edit the inputs as JSON',
      refresh: 'Refresh',
      refreshHint: 'If a run looks stuck. It also refreshes on focus.',
      reset: 'Reset stuck session',
      resetHint: "Clears the session's state when a run cannot continue",
      playgroundSettings: 'Playground settings',
      playgroundSettingsHint: 'What the chat fills and what it prints'
    },
    jsonInput: {
      label: 'Inputs as JSON',
      invalid: 'Not valid JSON: the form keeps its last good values.',
      notObject: 'The inputs must be a JSON object.'
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
      // No longer shown (the docked header's menu has `header.playgroundSettings`); kept so host overrides still type-check.
      openPlaygroundSettings: 'Playground settings',
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

    caption: {
      // Shown (dimmed) in an empty caption while it is being typed.
      placeholder: 'Caption',
      // aria-label of the text box while a caption is edited in place.
      editLabel: 'Caption text'
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
      tooltip: ({ status }: { status: string }) => status,
      ariaLabel: ({ status }: { status: string }) => `Node execution status: ${status}`,
      // Hover detail on the status pill: how many runs sit behind it.
      runs: ({ count }: { count: number }) => `${count} runs`,
      edited: 'edited',
      editedTooltip: 'Changed since this run started. The result may be out of date.'
    }
  },

  // WorkflowInterfaceEditor — the canonical panel for authoring a workflow's
  // public contract (`Workflow.interface`). See `.claude/plans/workflow-interface.md`.
  workflowInterface: {
    // The tag drawn beside a published port, on the canvas and in the Ports tab.
    tagAria: ({
      id,
      type,
      direction
    }: {
      id: string;
      type: string;
      direction: 'input' | 'output';
    }) => `Workflow ${direction} ${id}, ${type}`,
    tagTitle: ({ id, type }: { id: string; type: string }) => `${id} · ${type}`,
    tagNameLabel: 'Interface name',
    tagNameHint: 'Enter saves · Esc cancels',
    tagIdEmpty: 'Give it a name.',
    tagIdDuplicate: ({ id, direction }: { id: string; direction: 'input' | 'output' }) =>
      `A workflow ${direction} named "${id}" already exists.`,
    exposeInputPort: ({ port }: { port: string }) => `Expose ${port} as workflow input…`,
    exposeOutputPort: ({ port }: { port: string }) => `Expose ${port} as workflow output…`,
    renameTag: ({ id }: { id: string }) => `Rename interface entry "${id}"`,
    removeTag: ({ id }: { id: string }) => `Remove "${id}" from the interface`,
    portActions: ({ port }: { port: string }) => `Interface actions for ${port}`,
    inputsHeading: 'Inputs',
    outputsHeading: 'Outputs',
    addInput: 'Add input',
    addOutput: 'Add output',
    idLabel: 'ID',
    nameLabel: 'Name',
    descriptionLabel: 'Description',
    dataTypeLabel: 'Data type',
    dataTypePlaceholder: 'Select a data type…',
    namePlaceholder: 'Defaults to ID',
    typeMismatchInline: ({ portType }: { portType: string }) =>
      `Doesn't match the bound port's type (${portType}).`,
    useMatchPortType: 'Use port type',
    alreadyConnectedInline: ({ source }: { source: string }) =>
      `This port already receives a value from "${source}".`,
    requiredLabel: 'Required',
    defaultValueLabel: 'Default value',
    examplesLabel: 'Examples',
    addExample: 'Add example',
    removeExample: 'Remove example',
    bindingLabel: 'Bound port',
    bindingUnbound: 'Not bound',
    bindingChange: 'Change the bound port',
    bindingChoose: 'Choose a port to bind',
    bindingCurrent: 'Current',
    bindingUnbind: 'Unbind',
    bindingDangling: ({ nodeId, portId }: { nodeId: string; portId: string }) =>
      `${nodeId} › ${portId} (missing)`,
    moreOptions: 'More options',
    pullFromPort: 'Pull from port',
    pullFromPortTitle:
      "Fill name, data type, description, required and default from the bound port's own declaration",
    removeEntry: ({ id }: { id: string }) => `Remove interface entry "${id}"`,
    // The row's overflow menu: its accessible name and the short item labels.
    entryActions: ({ id }: { id: string }) => `Actions for "${id}"`,
    menuMoveUp: 'Move up',
    menuMoveDown: 'Move down',
    menuRemove: 'Remove',
    moveUp: ({ id }: { id: string }) => `Move "${id}" up`,
    moveDown: ({ id }: { id: string }) => `Move "${id}" down`,
    metaDisclosure: 'Server metadata (read-only)',
    // A port's chat `turn`: deprecated since 2.11.0. With Playground settings
    // (a server from FlowDrop 2.7.0 on) it is read-only and the chat is set up
    // in the Playground settings tab. Without them, the Chat turn selector
    // (`turnLabel`, `turnNone`, `turnDescriptions`, `turnUnknown`,
    // `historyLimitLabel`, `historyLimitPlaceholder`) is still offered, until 3.0.
    turnDeprecated: ({ turn, limit }: { turn: string; limit?: number }) =>
      `Chat turn "${turn}"${limit !== undefined ? ` (${limit} messages)` : ''} is deprecated: the chat is set up in the Playground settings now.`,
    turnOpenPlayground: 'Open Playground settings',
    turnLabel: 'Chat turn',
    turnNone: 'None',
    turns: {
      message: 'User message',
      history: 'History',
      session_id: 'Session ID',
      message_id: 'Message ID',
      reply: 'Reply'
    },
    turnDescriptions: {
      message: "Receives the person's chat message",
      history: 'Receives recent user and assistant messages from the session',
      session_id: "Receives the session's ID",
      message_id: "Receives the ID of the person's message",
      reply: "Text the session saves as the assistant's answer"
    },
    turnUnknown: ({ value }: { value: string }) => `${value} (not known to this editor)`,
    turnTakenInline: ({ id }: { id: string }) =>
      `Input "${id}" already has this chat turn, so this one does not count.`,
    historyLimitLabel: 'Messages to include',
    historyLimitPlaceholder: ({ limit }: { limit: number }) => `${limit} (default)`,
    // The inline composer that opens from "Add input" / "Add output".
    composerTitleInput: 'New input',
    composerTitleOutput: 'New output',
    composerStep: ({ step, total }: { step: number; total: number }) => `Step ${step} of ${total}`,
    composerClose: 'Close without adding',
    composerQuestion: 'Bind it to an existing port?',
    composerBindYes: 'Yes, bind to a port',
    composerBindYesHint:
      'Pick an exposed port. The entry takes its id, name, type and description from it.',
    composerBindNo: 'No, add a custom entry',
    composerBindNoHint: 'Start with an empty entry. Bind it later, or leave it unbound.',
    composerSearchLabel: 'Search ports',
    composerSearchPlaceholder: 'Search by node, port or type…',
    composerListLabelInput: 'Exposed input ports',
    composerListLabelOutput: 'Exposed output ports',
    composerGroupFree: 'Available',
    composerGroupTaken: 'Connected or already published',
    composerNoPorts: 'No exposed ports to bind yet. Expose a port on a node first.',
    composerNoMatches: 'No ports match your search.',
    composerConnected: 'Connected',
    composerPublishedAs: ({ id }: { id: string }) => `Published as ${id}`,
    composerRequired: 'Required',
    composerBack: 'Back',
    composerCancel: 'Cancel'
  },

  // The workflow's Playground settings tab: its chat binding (`workflow.playground`).
  playgroundSettings: {
    notSetUpTitle: 'Not set up',
    notSetUp:
      'No chat until someone sets it up. The Playground shows a form built from the interface inputs. To chat with this workflow, pick the input the message goes to and the results that print as replies.',
    turnSource:
      'This workflow chats through "Chat turn" marks on its interface, which are deprecated. The fields below show what they set up. Move them here to keep the chat as it is; changing any field moves them too.',
    moveTurns: 'Move them here',
    leftoverTurns:
      'The interface still carries deprecated "Chat turn" marks. They are ignored while these settings are set.',
    removeTurns: 'Remove them',
    noInputs: 'The workflow interface has no inputs yet. Add one on the Interface tab first.',
    messageLabel: 'Message goes to',
    messageNone: 'Nothing (form only)',
    messageHint: 'The input that receives what the person types in the chat.',
    historyLabel: 'History goes to',
    historyLimitLabel: 'Messages',
    inputNone: 'Nothing',
    inputMissing: ({ id }: { id: string }) => `${id} (not on the interface)`,
    idsDisclosure: 'Session and message IDs',
    sessionIdLabel: 'Session ID goes to',
    messageIdLabel: 'Message ID goes to',
    repliesLabel: 'Print as replies',
    repliesNone: 'No node has an exposed output port yet.',
    subWorkflowReplies: 'Also print what sub-workflows reply',
    halfSet:
      'Nothing will print. The run completes and the chat stays silent. Pick at least one reply.',
    savedWith: 'Set for this workflow and saved with it when you press Save.',
    historyLimitInvalid: 'A whole number, 1 or more.',
    /** Problems with the binding, by issue code (`playgroundChatIssues`). */
    issues: {
      inputMissing: ({ field, id }: { field: string; id: string }) =>
        `${field}: the input "${id}" is not on the workflow interface.`,
      inputDuplicate: ({ field, id, other }: { field: string; id: string; other: string }) =>
        `${field}: the input "${id}" is already picked under "${other}".`,
      replyNodeMissing: ({ reply }: { reply: string }) =>
        `The reply "${reply}" is on a node that is no longer in the workflow.`,
      replyPortMissing: ({ reply }: { reply: string }) =>
        `The reply "${reply}" is on an output the node no longer has.`
    }
  },

  // The confirm dialog the WebMCP adapter shows before a browser agent's change runs.
  webmcp: {
    confirmTitle: ({ name }: { name: string }) => `A browser agent wants to change “${name}”`,
    confirmCount: ({ count }: { count: number }) =>
      `${count === 1 ? '1 change' : `${count} changes`} — applied together, undone together.`,
    reject: 'Reject',
    apply: 'Apply',
    saveLine: ({ name }: { name: string }) => `Save “${name}” to the server`,
    saveHint: 'Writes the workflow to the server. This cannot be undone from the editor.',
    runLine: ({ name }: { name: string }) => `Run “${name}” on the server`,
    runHint: 'Starts a run of the saved workflow. Unsaved changes are not part of it.',
    /** One clause per kind of change; joined into the batch summary. */
    summaryAdds: ({ count }: { count: number }) =>
      `adds ${count} ${count === 1 ? 'node' : 'nodes'}`,
    summaryDeletes: ({ count }: { count: number }) =>
      `deletes ${count} ${count === 1 ? 'node' : 'nodes'}`,
    summaryConnects: ({ count }: { count: number }) =>
      `connects ${count} ${count === 1 ? 'edge' : 'edges'}`,
    summaryDisconnects: ({ count }: { count: number }) =>
      `removes ${count} ${count === 1 ? 'edge' : 'edges'}`,
    summaryConfigs: ({ count }: { count: number }) =>
      `sets ${count} config ${count === 1 ? 'key' : 'keys'}`,
    summaryOther: ({ count }: { count: number }) =>
      `${count} other ${count === 1 ? 'change' : 'changes'}`,
    /** `{count} changes — adds 2 nodes, connects 1 edge. Applied together, undone together.` */
    batchSummary: ({ count, parts }: { count: number; parts: string }) =>
      `${count} changes — ${parts}. Applied together, undone together.`,
    rememberEdits:
      'Apply further edits from any agent on this page without asking, until this page is closed'
  },

  // Design-system primitives (components/primitives). Defaults only; every
  // primitive also accepts the visible text as a prop.
  statusPill: {
    running: 'Running',
    completed: 'Completed',
    waiting: 'Waiting for you',
    failed: 'Failed',
    skipped: 'Skipped'
  },

  composer: {
    placeholder: 'Type a message',
    send: 'Send',
    stop: 'Stop',
    attach: 'Attach'
  },

  notice: {
    dismiss: 'Dismiss'
  },

  field: {
    required: 'required',
    examples: 'Examples'
  },

  menu: {
    moreActions: 'More actions'
  },

  // The searchable rendering of the Select primitive (long or grouped lists).
  select: {
    searchPlaceholder: 'Search…',
    noMatches: 'No matches',
    // "3 of 42" — what the filter leaves, out of everything listed.
    count: ({ shown, total }: { shown: number; total: number }) => `${shown} of ${total}`,
    hintMove: 'move',
    hintChoose: 'choose',
    hintClose: 'close'
  }
} as const;
