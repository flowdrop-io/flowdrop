<!--
  WorkflowPlaygroundSettings

  The workflow's Playground settings: its chat binding (`workflow.playground`,
  see `utils/playgroundChat.ts`). Which interface input the person's message
  goes to, which one gets recent messages (and how many), which inputs get
  the session and message ids, which node output ports print as replies, and
  whether sub-workflows print their own replies.

  Stateless, like `WorkflowInterfaceEditor`: reads `workflow` and reports the
  next `playground` value via `onChange`. The caller routes it through the
  workflow store (`fd.workflow.batchUpdate({ playground })`), so an edit marks
  the workflow dirty and is saved with it — one Save, versioned with the
  workflow. Nothing set = no chat: the Playground shows a form or Run instead.

  A workflow without settings that still marks its interface with the
  deprecated `turn` keeps chatting through those marks. The controls then
  show what the marks set up, and `onMoveTurns` moves them here: on the
  button, and on the first edit, so an edit never starts from an empty
  binding (which would switch the chat off) and clearing every field really
  means no chat (the marks are gone, nothing falls back to them).
-->

<script lang="ts">
  import Icon from '@iconify/svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import Select from '$lib/components/Select.svelte';
  import { m } from '$lib/messages/index.js';
  import type {
    PlaygroundChatBinding,
    PlaygroundReplyPort,
    Workflow,
    WorkflowPlayground
  } from '$lib/types/index.js';
  import { DEFAULT_HISTORY_TURN_LIMIT } from '$lib/types/index.js';
  import {
    emptyPlaygroundChat,
    interfaceTurnChat,
    isPlaygroundChatSet,
    normalizePlaygroundChat,
    withPlaygroundChat
  } from '$lib/utils/playgroundChat.js';
  import {
    listBindablePorts,
    playgroundChatIssues,
    type PlaygroundChatInputKey,
    type PlaygroundChatIssue
  } from '$lib/utils/workflowInterface.js';

  interface Props {
    workflow: Workflow;
    /** The next `playground` value, after an edit. */
    onChange: (next: WorkflowPlayground) => void;
    /**
     * Move the deprecated interface `turn` marks into these settings: called
     * with the binding to store (the one they declare, or it with the first
     * edit applied). The caller stores it and clears `turn` from the
     * interface in one update. Omit to hide the action; edits then go to
     * `onChange` and the marks stay, so clearing every field falls back to
     * them.
     */
    onMoveTurns?: (chat: PlaygroundChatBinding) => void;
  }

  let { workflow, onChange, onMoveTurns }: Props = $props();

  /** The stored binding, every key present; `null` = not set up. */
  const stored = $derived(
    workflow.playground?.chat ? normalizePlaygroundChat(workflow.playground.chat) : null
  );
  /** The binding the deprecated interface `turn` marks declare, when nothing is stored. */
  const turnChat = $derived(stored === null ? interfaceTurnChat(workflow.interface) : null);
  /** What the controls show: the binding in effect (stored, else the marks), or an empty one. */
  const chat = $derived(stored ?? turnChat ?? emptyPlaygroundChat());

  const inputs = $derived(workflow.interface?.inputs ?? []);
  const issues = $derived(playgroundChatIssues(workflow, stored ?? turnChat));
  const errors = $derived(issues.filter((issue) => issue.severity === 'error'));
  const halfSet = $derived(issues.some((issue) => issue.code === 'playground-half-set'));

  /** Output ports a reply can print from, plus stored replies no longer offered. */
  const replyOptions = $derived.by(() => {
    const options = listBindablePorts(workflow, 'output').map((candidate) => ({
      reply: { node_id: candidate.nodeId, port: candidate.port.id },
      label: `${candidate.nodeLabel} · ${candidate.port.name ?? candidate.port.id}`,
      missing: false
    }));
    for (const reply of chat.replies) {
      if (!options.some((option) => sameReply(option.reply, reply))) {
        options.push({ reply, label: `${reply.node_id} · ${reply.port}`, missing: true });
      }
    }
    return options;
  });

  /** Whether either id input is bound: the disclosure is then open. */
  const idsBound = $derived(chat.session_id !== null || chat.message_id !== null);
  /** Whether the person opened the disclosure themselves. */
  let idsOpened = $state(false);

  /** The label of the field a binding key fills. */
  const keyLabels = $derived<Record<PlaygroundChatInputKey, string>>({
    message: m().playgroundSettings.messageLabel,
    history: m().playgroundSettings.historyLabel,
    session_id: m().playgroundSettings.sessionIdLabel,
    message_id: m().playgroundSettings.messageIdLabel
  });

  const idFields = $derived([
    { key: 'session_id' as const, label: keyLabels.session_id },
    { key: 'message_id' as const, label: keyLabels.message_id }
  ]);

  /** Whether the limit field holds something that is not a valid limit. */
  let historyLimitInvalid = $state(false);

  function sameReply(a: PlaygroundReplyPort, b: PlaygroundReplyPort): boolean {
    return a.node_id === b.node_id && a.port === b.port;
  }

  function update(patch: Partial<PlaygroundChatBinding>): void {
    const next = { ...chat, ...patch };
    if (stored === null && turnChat !== null && onMoveTurns) onMoveTurns(next);
    else onChange(withPlaygroundChat(workflow.playground, next));
  }

  function setInput(key: Exclude<PlaygroundChatInputKey, 'history'>, value: string): void {
    update({ [key]: value === '' ? null : value });
  }

  function setHistoryInput(value: string): void {
    historyLimitInvalid = false;
    update({
      history:
        value === ''
          ? null
          : { input: value, limit: chat.history?.limit ?? DEFAULT_HISTORY_TURN_LIMIT }
    });
  }

  function setHistoryLimit(field: HTMLInputElement): void {
    if (chat.history === null) return;
    const parsed = Number(field.value);
    if (field.value.trim() === '' || !Number.isInteger(parsed) || parsed < 1) {
      // Keep what the person typed and say why it is not taken: the stored
      // limit stays, so falling back here would leave the field showing a
      // value nobody saved.
      historyLimitInvalid = true;
      return;
    }
    historyLimitInvalid = false;
    update({ history: { ...chat.history, limit: parsed } });
  }

  function toggleReply(reply: PlaygroundReplyPort, on: boolean): void {
    const others = chat.replies.filter((other) => !sameReply(other, reply));
    update({ replies: on ? [...others, reply] : others });
  }

  /** An issue in the person's language (`issue.message` is English, for logs). */
  function issueText(issue: PlaygroundChatIssue): string {
    const texts = m().playgroundSettings.issues;
    const reply = issue.reply ? replyLabel(issue.reply) : '';
    switch (issue.code) {
      case 'playground-input-missing':
        return issue.key && issue.input
          ? texts.inputMissing({ field: keyLabels[issue.key], id: issue.input })
          : issue.message;
      case 'playground-input-duplicate':
        return issue.key && issue.input && issue.otherKey
          ? texts.inputDuplicate({
              field: keyLabels[issue.key],
              id: issue.input,
              other: keyLabels[issue.otherKey]
            })
          : issue.message;
      case 'playground-reply-node-missing':
        return texts.replyNodeMissing({ reply });
      case 'playground-reply-port-missing':
        return texts.replyPortMissing({ reply });
      case 'playground-half-set':
        return m().playgroundSettings.halfSet;
      default:
        return issue.message;
    }
  }

  /** A reply as the reply list labels it, or `node · port` when it is not listed. */
  function replyLabel(reply: PlaygroundReplyPort): string {
    return (
      replyOptions.find((option) => sameReply(option.reply, reply))?.label ??
      `${reply.node_id} · ${reply.port}`
    );
  }

  /** An input key's error, for the field's invalid state. */
  function inputError(key: PlaygroundChatInputKey): string | undefined {
    const issue = errors.find((candidate) => candidate.key === key);
    return issue && issueText(issue);
  }

  function replyError(reply: PlaygroundReplyPort): string | undefined {
    const issue = errors.find((candidate) => candidate.reply && sameReply(candidate.reply, reply));
    return issue && issueText(issue);
  }

  /**
   * The options for an input select: every interface input, plus the stored
   * value when the interface no longer has it, so the select never rewrites
   * a stored name it cannot list.
   */
  function inputOptions(current: string | null): Array<{ id: string; label: string }> {
    const options = inputs.map((entry) => ({
      id: entry.id,
      label: entry.name && entry.name !== entry.id ? `${entry.name} (${entry.id})` : entry.id
    }));
    if (current !== null && !options.some((option) => option.id === current)) {
      options.push({ id: current, label: m().playgroundSettings.inputMissing({ id: current }) });
    }
    return options;
  }
</script>

<div class="wf-playground" data-testid="workflow-playground-settings">
  {#if stored === null}
    {#if turnChat}
      <div class="wf-playground__note" role="note">
        <p>{m().playgroundSettings.turnSource}</p>
        {#if onMoveTurns && isPlaygroundChatSet(turnChat)}
          <Button variant="secondary" size="sm" onclick={() => turnChat && onMoveTurns?.(turnChat)}>
            {m().playgroundSettings.moveTurns}
          </Button>
        {/if}
      </div>
    {:else}
      <div class="wf-playground__note" role="note">
        <p class="wf-playground__note-title">{m().playgroundSettings.notSetUpTitle}</p>
        <p>{m().playgroundSettings.notSetUp}</p>
      </div>
    {/if}
  {/if}

  {#if inputs.length === 0}
    <p class="wf-playground__hint">{m().playgroundSettings.noInputs}</p>
  {/if}

  <label class="wf-playground__field">
    <span class="wf-playground__label">{m().playgroundSettings.messageLabel}</span>
    <Select
      size="sm"
      invalid={inputError('message') !== undefined}
      value={chat.message ?? ''}
      onchange={(e) => setInput('message', e.currentTarget.value)}
    >
      <option value="">{m().playgroundSettings.messageNone}</option>
      {#each inputOptions(chat.message) as option (option.id)}
        <option value={option.id}>{option.label}</option>
      {/each}
    </Select>
    <span class="wf-playground__hint">{m().playgroundSettings.messageHint}</span>
  </label>

  <div class="wf-playground__row">
    <label class="wf-playground__field wf-playground__field--grow">
      <span class="wf-playground__label">{m().playgroundSettings.historyLabel}</span>
      <Select
        size="sm"
        invalid={inputError('history') !== undefined}
        value={chat.history?.input ?? ''}
        onchange={(e) => setHistoryInput(e.currentTarget.value)}
      >
        <option value="">{m().playgroundSettings.inputNone}</option>
        {#each inputOptions(chat.history?.input ?? null) as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </Select>
    </label>
    {#if chat.history !== null}
      <label class="wf-playground__field wf-playground__field--limit">
        <span class="wf-playground__label">{m().playgroundSettings.historyLimitLabel}</span>
        <Input
          size="sm"
          type="number"
          min="1"
          step="1"
          invalid={historyLimitInvalid}
          value={chat.history.limit}
          onchange={(e) => setHistoryLimit(e.currentTarget)}
        />
        {#if historyLimitInvalid}
          <span class="wf-playground__inline wf-playground__inline--error">
            {m().playgroundSettings.historyLimitInvalid}
          </span>
        {/if}
      </label>
    {/if}
  </div>

  <details
    class="wf-playground__more"
    open={idsBound || idsOpened}
    ontoggle={(e) => (idsOpened = e.currentTarget.open)}
  >
    <summary>
      <Icon icon="heroicons:chevron-right" />
      {m().playgroundSettings.idsDisclosure}
    </summary>
    <div class="wf-playground__more-body">
      {#each idFields as { key, label } (key)}
        <label class="wf-playground__field">
          <span class="wf-playground__label">{label}</span>
          <Select
            size="sm"
            invalid={inputError(key) !== undefined}
            value={chat[key] ?? ''}
            onchange={(e) => setInput(key, e.currentTarget.value)}
          >
            <option value="">{m().playgroundSettings.inputNone}</option>
            {#each inputOptions(chat[key]) as option (option.id)}
              <option value={option.id}>{option.label}</option>
            {/each}
          </Select>
        </label>
      {/each}
    </div>
  </details>

  <fieldset class="wf-playground__replies">
    <legend class="wf-playground__label">{m().playgroundSettings.repliesLabel}</legend>
    {#if replyOptions.length === 0}
      <p class="wf-playground__hint">{m().playgroundSettings.repliesNone}</p>
    {/if}
    {#each replyOptions as option (`${option.reply.node_id}::${option.reply.port}`)}
      {@const checked = chat.replies.some((reply) => sameReply(reply, option.reply))}
      {@const error = replyError(option.reply)}
      <label class="wf-playground__check" class:wf-playground__check--missing={option.missing}>
        <input
          type="checkbox"
          {checked}
          onchange={(e) => toggleReply(option.reply, e.currentTarget.checked)}
        />
        <span>{option.label}</span>
      </label>
      {#if error}
        <span class="wf-playground__inline wf-playground__inline--error">{error}</span>
      {/if}
    {/each}
  </fieldset>

  <label class="wf-playground__check">
    <input
      type="checkbox"
      checked={chat.sub_workflow_replies}
      onchange={(e) => update({ sub_workflow_replies: e.currentTarget.checked })}
    />
    <span>{m().playgroundSettings.subWorkflowReplies}</span>
  </label>

  {#if halfSet}
    <p class="wf-playground__inline wf-playground__inline--error" role="alert">
      {m().playgroundSettings.halfSet}
    </p>
  {/if}
  {#each errors.filter((issue) => issue.key !== undefined) as issue (issue.code + issue.key)}
    <p class="wf-playground__inline wf-playground__inline--error">{issueText(issue)}</p>
  {/each}

  <p class="wf-playground__meta">{m().playgroundSettings.savedWith}</p>
</div>

<style>
  .wf-playground {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
    padding: var(--fd-space-md);
  }

  .wf-playground__note {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--fd-space-xs);
    padding: var(--fd-space-sm) var(--fd-space-md);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-radius-md);
    background-color: var(--fd-muted);
    font-size: var(--fd-text-sm);
    line-height: 1.5;
  }

  .wf-playground__note p {
    margin: 0;
  }

  .wf-playground__note-title {
    font-weight: 600;
  }

  .wf-playground__row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--fd-space-sm);
  }

  .wf-playground__field {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-2xs);
    min-width: 0;
  }

  .wf-playground__field--grow {
    flex: 1 1 10rem;
  }

  .wf-playground__field--limit {
    flex: 0 1 7rem;
  }

  /* Same voice as the interface editor's `.wf-interface__label`. */
  .wf-playground__label {
    padding: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: -0.01em;
    color: var(--fd-foreground);
  }

  .wf-playground__hint,
  .wf-playground__meta {
    margin: 0;
    font-size: var(--fd-text-xs);
    line-height: 1.4;
    color: var(--fd-muted-foreground);
  }

  .wf-playground__more summary {
    display: inline-flex;
    align-items: center;
    gap: var(--fd-space-2xs);
    cursor: pointer;
    font-size: var(--fd-text-sm);
    font-weight: 500;
    color: var(--fd-muted-foreground);
    list-style: none;
  }

  .wf-playground__more summary::-webkit-details-marker {
    display: none;
  }

  .wf-playground__more summary :global(svg) {
    transition: transform var(--fd-transition-fast, 150ms);
  }

  .wf-playground__more[open] summary :global(svg) {
    transform: rotate(90deg);
  }

  .wf-playground__more-body {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
    padding-top: var(--fd-space-sm);
  }

  .wf-playground__replies {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-xs);
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }

  .wf-playground__replies legend {
    margin-bottom: var(--fd-space-xs);
  }

  .wf-playground__check {
    display: flex;
    align-items: center;
    gap: var(--fd-space-xs);
    font-size: var(--fd-text-sm);
    cursor: pointer;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .wf-playground__check input[type='checkbox'] {
    flex: none;
    width: 1rem;
    height: 1rem;
    margin: 0;
    accent-color: var(--fd-primary);
    cursor: pointer;
  }

  .wf-playground__check--missing span {
    color: var(--fd-error);
    font-family: var(--fd-font-mono);
  }

  .wf-playground__inline {
    margin: 0;
    font-size: var(--fd-text-xs);
    line-height: 1.4;
  }

  .wf-playground__inline--error {
    color: var(--fd-error);
  }
</style>
