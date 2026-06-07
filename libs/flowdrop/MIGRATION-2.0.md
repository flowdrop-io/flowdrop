# Migrating to FlowDrop 2.0

2.0's theme is **the explicit-instance era**: every compatibility shim the 1.x
multi-instance refactor and the 1.8 message migration carried is gone. If your
1.x code ran without deprecation warnings in the console, most of this guide
does not apply to you.

## 1. Module-level store APIs are removed (the big one)

All ~95 module-level functions that operated on "the" editor are gone:
`getWorkflowStore()`, `workflowActions`, `historyService`, `getMessages()`,
`playgroundActions`, `getCategories()`, `getHistoryState()`, and the rest of
the get*/set*/actions surface from `@flowdrop/flowdrop/editor` and
`@flowdrop/flowdrop/playground`.

**Replacement:** every mount handle exposes its state container.

```js
// 1.x
import { workflowActions, historyService, getMessages } from '@flowdrop/flowdrop/editor';
const app = await mountFlowDropApp(el, options);
workflowActions.addNode(node);
historyService.undo();
const messages = getMessages();

// 2.0
const app = await mountFlowDropApp(el, options);
app.instance.workflow.actions.addNode(node);
app.instance.history.undo();
const messages = app.instance.playground.messages;
```

Inside Svelte components rendered under `<App>`/`<WorkflowEditor>`, resolve the
owning instance with `getInstance()` (unchanged — including the browser
fallback to the page-default instance for single-editor embeds):

```svelte
<script>
  import { getInstance } from '@flowdrop/flowdrop/editor';
  const fd = getInstance();
  // fd.workflow, fd.history, fd.playground, fd.interrupts, fd.categories, …
</script>
```

For hosts that construct state manually, the store classes are now exported:
`WorkflowStore`, `HistoryStore`, `HistoryService`, `PlaygroundStore`,
`InterruptStore`, `PortCoordinateStore`, plus `createFlowDropInstance()`.

Settings remain page-global by design — `getSettings()` etc. are unchanged.

## 2. localStorage keys are instance-scoped

The page-default instance no longer writes bare keys:

| 1.x                           | 2.0                                   |
| ----------------------------- | ------------------------------------- |
| `flowdrop:draft:<workflowId>` | `flowdrop:draft:default:<workflowId>` |
| `fd-pipeline-panel-open`      | `fd-pipeline-panel-open:default`      |

Existing user data migrates automatically on first read (copy to the scoped
key, remove the legacy key). Only hosts reading these keys directly need to
update. `clearAllDrafts()` still removes everything under `flowdrop:draft:`.

## 3. Removed component props

| Component        | Removed                                                                                          | Use instead                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `SchemaForm`     | `saveLabel`, `cancelLabel`                                                                       | `messages.form.schema.save` / `.cancel`                                                                                            |
| `AIChatPanel`    | `placeholder`                                                                                    | `messages.chat.placeholder`                                                                                                        |
| `ChatPanel`      | `showChatInput`, `showRunButton`                                                                 | `MessageStream` directly, or `ControlPanel` (keeps both flags)                                                                     |
| `ChatPanel`      | `showLogs`                                                                                       | `fd.playground.setShowLogs(...)`                                                                                                   |
| `WorkflowEditor` | `nodes`, `height`, `width`, `isConfigSidebarOpen`, `selectedNodeForConfig`, `closeConfigSidebar` | These never did anything in 1.x. Size via `App`'s `height`/`width` (working since 1.16); node metadata flows through the instance. |

`FormToggle.onLabel`/`offLabel` and `FormArray.addLabel` were _un_-deprecated:
they express per-instance labels the global messages system cannot, and are
now documented overrides.

Removed message keys (only the removed ChatPanel branches read them):
`playground.states.viewOnlyTitle`, `.viewOnlyText`, `.readyTitle`, `.readyText`.

## 4. mountWorkflowEditor option changes

- `workflow` now actually loads the workflow (1.x accepted and ignored it).
- `nodes` is removed (it fed a prop the editor never read). Use
  `mountFlowDropApp` if you need to pre-seed node metadata.

## 5. Behavioral notes

- `fieldRegistry.register()` warns in dev when overwriting an existing field
  type. Overwriting still works; the warning flags accidents.
- Internal `DEV` gates use `esm-env` instead of `import.meta.env`, so the
  package no longer assumes a Vite host.
