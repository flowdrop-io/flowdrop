<!--
  InterfaceInputForm Component

  The inputs card a workflow's interface inputs render as in the Playground:
  one field per input entry without a chat turn (the session fills turn
  ports, so they never appear here). Values are keyed by entry id, the name
  the server matches `inputs` on. The fields are InputFields'; this component
  frames them and adds what a form-first panel needs:

   - a blue Run (⌘↵ / Ctrl+↵ from anywhere in the card), turned into Stop while
     a run is in flight, with a refusal named under it;
   - "Fill from last run", and the session's earlier runs below the card (pick
     one to refill, never to run).

  Without `onRun` (the folded Inputs row above a chat composer) the card has
  no Run: the composer's Send takes the turn.
-->

<script lang="ts">
  import Card from '../primitives/Card.svelte';
  import Button from '../primitives/Button.svelte';
  import InputFields from './InputFields.svelte';
  import InterfaceJsonInput from './InterfaceJsonInput.svelte';
  import type { WorkflowInterfaceEntry } from '../../types/index.js';
  import { interfaceFormSchema } from '../../utils/workflowInterface.js';
  import { playgroundInputRuns, summarizeRunInputs } from '../../utils/playgroundInputRuns.js';
  import { getInstance } from '../../stores/getInstance.svelte.js';
  import { m } from '$lib/messages/index.js';

  const fd = getInstance();

  interface Props {
    /** The interface input entries to render (inputs without a `turn`). */
    entries: WorkflowInterfaceEntry[];
    /** Current values, keyed by entry id. */
    values: Record<string, unknown>;
    /** Called with the complete values on every change. */
    onChange: (values: Record<string, unknown>) => void;
    /** Disable every field (e.g. while a turn runs). */
    disabled?: boolean;
    /** Show the values as JSON instead of the typed fields. */
    json?: boolean;
    /** Start a run. Absent: the card has no Run (and no earlier-runs list). */
    onRun?: () => void;
    /** Stop the run in flight; shown in place of Run while `running`. */
    onStop?: () => void;
    /** A run is in flight: Run reads Stop. */
    running?: boolean;
    /** Run is held back (it is waiting on the workflow, or a save is running). */
    runDisabled?: boolean;
    /** Something runs before the run goes out (a save): Run shows a spinner. */
    runBusy?: boolean;
    /** The Run label, e.g. "Save & run". */
    runLabel?: string;
    /** The Run tooltip. */
    runTitle?: string;
    /** Why the last Run did not start, named under the button. */
    error?: string | null;
    /** Extra feedback from the launch (a refused launch), named under the button. */
    notice?: string | null;
  }

  let {
    entries,
    values,
    onChange,
    disabled = false,
    json = false,
    onRun,
    onStop,
    running = false,
    runDisabled = false,
    runBusy = false,
    runLabel,
    runTitle,
    error = null,
    notice = null
  }: Props = $props();

  const schema = $derived(interfaceFormSchema(entries));
  const labels = $derived(m().playground.inputForm);
  const actions = $derived(m().playground.actions);

  // What an entry offers as examples: its own `examples` (the interface
  // definition); InputFields adds the default.
  const examples = $derived(
    Object.fromEntries(
      entries
        .filter((entry) => Array.isArray(entry.examples) && entry.examples.length > 0)
        .map((entry) => [entry.id, entry.examples as unknown[]])
    )
  );

  const runs = $derived(playgroundInputRuns(fd.playground.messages, entries));

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const shortcut = $derived(isMac ? '⌘↵' : 'Ctrl+↵');

  function fill(inputs: Record<string, unknown>): void {
    onChange({ ...inputs });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!onRun || event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    if (running || runDisabled || runBusy || disabled) return;
    onRun();
  }

  function timeOf(timestamp: string): string {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="interface-input-form">
  <!-- ⌘↵ is a shortcut over the whole card; every control inside is focusable. -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="interface-input-form__card"
    role="group"
    aria-label={labels.title}
    onkeydown={handleKeydown}
  >
    <Card padding="md">
      {#snippet header()}
        <span>{labels.title}</span>
        {#if runs.length > 0}
          <Button
            size="sm"
            variant="ghost"
            title={labels.fillFromLastTitle}
            {disabled}
            onclick={() => fill(runs[0].inputs)}
          >
            {labels.fillFromLast}
          </Button>
        {/if}
      {/snippet}

      <div class="interface-input-form__body">
        {#if json}
          <InterfaceJsonInput {values} {onChange} {disabled} />
        {:else}
          <InputFields {schema} {values} {onChange} {examples} {disabled} />
        {/if}

        {#if onRun}
          <div class="interface-input-form__actions">
            {#if running}
              <Button variant="danger" title={actions.stopTitle} onclick={() => onStop?.()}>
                {actions.stop}
              </Button>
            {:else}
              <Button
                variant="primary"
                title={runTitle ?? actions.runTitle}
                disabled={runDisabled || disabled}
                loading={runBusy}
                onclick={() => onRun()}
              >
                {runLabel ?? actions.run}
              </Button>
              <kbd class="interface-input-form__shortcut">{shortcut}</kbd>
            {/if}
          </div>
          {#if error}
            <p class="interface-input-form__error" role="alert">{error}</p>
          {/if}
          {#if notice}
            <p class="interface-input-form__notice" role="status">{notice}</p>
          {/if}
        {/if}
      </div>
    </Card>
  </div>

  {#if onRun && runs.length > 0}
    <section class="interface-input-form__runs" aria-label={labels.runsLabel}>
      <h3 class="interface-input-form__runs-title">{labels.runsTitle}</h3>
      <ul class="interface-input-form__runs-list">
        {#each runs as run (run.id)}
          {@const summary = summarizeRunInputs(run.inputs, entries)}
          <li>
            <Button
              size="sm"
              variant="ghost"
              class="interface-input-form__run"
              title={labels.useRun({ summary })}
              {disabled}
              onclick={() => fill(run.inputs)}
            >
              <span class="interface-input-form__run-summary">{summary}</span>
              <time class="interface-input-form__run-time" datetime={run.timestamp}>
                {timeOf(run.timestamp)}
              </time>
            </Button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .interface-input-form {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    box-sizing: border-box;
    padding: var(--fd-space-md) var(--fd-space-xl);
  }

  .interface-input-form__body {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-md);
  }

  .interface-input-form__actions {
    display: flex;
    align-items: center;
    gap: var(--fd-space-sm);
  }

  .interface-input-form__shortcut {
    color: var(--fd-muted-foreground);
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-2xs);
  }

  .interface-input-form__error,
  .interface-input-form__notice {
    margin: 0;
    padding: var(--fd-space-sm) var(--fd-space-md);
    border-radius: var(--fd-radius-md);
    font-size: var(--fd-text-xs);
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .interface-input-form__error {
    background-color: var(--fd-error-muted);
    color: var(--fd-error);
  }

  .interface-input-form__notice {
    background-color: var(--fd-muted);
    color: var(--fd-muted-foreground);
  }

  .interface-input-form__runs-title {
    margin: 0 0 var(--fd-space-2xs);
    color: var(--fd-muted-foreground);
    font-size: var(--fd-text-xs);
    font-weight: 600;
  }

  .interface-input-form__runs-list {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-3xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .interface-input-form__runs :global(.interface-input-form__run) {
    width: 100%;
    min-width: 0;
    justify-content: space-between;
    font-weight: 400;
  }

  .interface-input-form__runs :global(.flowdrop-ui-button__label) {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--fd-space-md);
    min-width: 0;
    width: 100%;
  }

  .interface-input-form__run-summary {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .interface-input-form__run-time {
    flex: none;
    color: var(--fd-muted-foreground);
  }
</style>
