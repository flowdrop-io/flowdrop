<!--
  WebMCPBridgeMenu — the desktop bridge's button and popover, drawn inside the
  canvas zoom controls (it renders as one more button of that group).

  A browser without WebMCP of its own reaches the editor's tools through a
  bridge to an AI app on the same computer. The vendored widget's own UI is
  hidden (see webmcp/bridgeController.svelte.ts); this is the replacement: a
  button whose icon carries a status dot (neutral, accent while connecting,
  green connected, red on error) and a popover with the explanation, the
  status, a paste-token field and Connect, or, when connected, Disconnect and
  the tools offered.

  Drawn only while a bridge is installed, its widget is recognised and the
  editor offered tools through it. Must render inside the zoom controls
  (xyflow's `Controls`): the trigger is a `ControlButton`, so it takes the same
  tokens as zoom, fit and lock.
-->

<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { on } from 'svelte/events';
  import Icon from '@iconify/svelte';
  import { ControlButton } from '@xyflow/svelte';
  import { getMessages } from '../messages/context.js';
  import { portal } from '../utils/portal.js';
  import { getBridgeController } from '../webmcp/bridgeController.svelte.js';
  import Button from './primitives/Button.svelte';
  import Field from './primitives/Field.svelte';

  const getMsgs = getMessages();
  const msgs = $derived(getMsgs().webmcp.bridge);

  const bridge = $derived(getBridgeController());
  const tools = $derived(bridge?.registeredTools ?? []);
  const visible = $derived(!!bridge && bridge.managed && tools.length > 0);
  const status = $derived(bridge?.status ?? 'disconnected');
  const statusText = $derived(msgs.status[status]);

  let open = $state(false);
  let token = $state('');
  let popoverEl = $state<HTMLElement | null>(null);
  let position = $state({ left: 0, bottom: 0 });
  const uid = Math.random().toString(36).slice(2, 8);
  const triggerId = `fd-bridge-trigger-${uid}`;
  const popoverId = `fd-bridge-${uid}`;

  const triggerEl = (): HTMLElement | null => document.getElementById(triggerId);

  function place(): void {
    const rect = triggerEl()?.getBoundingClientRect();
    if (!rect) return;
    position = { left: rect.left, bottom: window.innerHeight - rect.top };
  }

  async function show(): Promise<void> {
    place();
    open = true;
    await tick();
    popoverEl?.querySelector<HTMLElement>('input, button:not(:disabled)')?.focus();
  }

  function close(returnFocus = true): void {
    if (!open) return;
    open = false;
    if (returnFocus) triggerEl()?.focus();
  }

  // The last tool went away, or the widget stopped being recognised: nothing to show.
  $effect(() => {
    if (!visible && untrack(() => open)) close(false);
  });

  // Outside pointer closes; so does a resize (the popover is anchored to the button).
  $effect(() => {
    if (!open) return;
    const offPointer = on(
      document,
      'pointerdown',
      (event) => {
        const target = event.target as Node;
        if (popoverEl?.contains(target) || triggerEl()?.contains(target)) return;
        close(false);
      },
      { capture: true }
    );
    const offResize = on(window, 'resize', () => close(false));
    return () => {
      offPointer();
      offResize();
    };
  });

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  const connecting = $derived(status === 'connecting');
  const canConnect = $derived(token.trim().length > 0 && !connecting);

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    if (!canConnect || !bridge) return;
    bridge.connect(token.trim());
  }

  // A connected token is spent: do not keep it in the field.
  $effect(() => {
    if (status === 'connected') token = '';
  });
</script>

{#if visible && bridge}
  <ControlButton
    id={triggerId}
    class="fd-bridge__trigger"
    title={msgs.triggerTitle({ status: statusText })}
    aria-label={msgs.trigger}
    aria-expanded={open}
    aria-controls={open ? popoverId : undefined}
    aria-haspopup="true"
    data-testid="webmcp-bridge-trigger"
    data-status={status}
    onclick={() => (open ? close(false) : void show())}
    onkeydown={onKeydown}
  >
    <Icon icon="mdi:power-plug" />
    <span class="fd-bridge__badge fd-bridge__dot fd-bridge__dot--{status}" aria-hidden="true"
    ></span>
  </ControlButton>

  {#if open}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="fd-bridge__popover"
      id={popoverId}
      role="region"
      aria-label={msgs.title}
      data-testid="webmcp-bridge-popover"
      style:left="{position.left}px"
      style:bottom="{position.bottom}px"
      bind:this={popoverEl}
      onkeydown={onKeydown}
      use:portal
    >
      <p class="fd-bridge__explainer">{msgs.explainer}</p>

      <p class="fd-bridge__status" aria-live="polite" data-testid="webmcp-bridge-status">
        <span class="fd-bridge__dot fd-bridge__dot--{status}" aria-hidden="true"></span>
        <span class="fd-bridge__status-text">{statusText}</span>
        {#if status === 'error' && bridge.detail}
          <span class="fd-bridge__detail">{bridge.detail}</span>
        {/if}
      </p>

      {#if status === 'connected'}
        <details class="fd-bridge__tools">
          <summary>{msgs.toolsOffered({ count: tools.length })}</summary>
          <ul aria-label={msgs.toolsLabel}>
            {#each tools as tool (tool.name)}
              <li title={tool.description}>{tool.name}</li>
            {/each}
          </ul>
        </details>
        <div class="fd-bridge__actions">
          <Button
            variant="secondary"
            size="sm"
            data-testid="webmcp-bridge-disconnect"
            onclick={() => bridge.disconnect()}
          >
            {msgs.disconnect}
          </Button>
        </div>
      {:else}
        <form class="fd-bridge__form" onsubmit={submit}>
          <Field label={msgs.tokenLabel}>
            {#snippet children({ id, describedBy })}
              <input
                {id}
                class="flowdrop-input flowdrop-input--sm"
                type="password"
                autocomplete="off"
                spellcheck="false"
                placeholder={msgs.tokenPlaceholder}
                aria-describedby={describedBy}
                data-testid="webmcp-bridge-token"
                disabled={connecting}
                bind:value={token}
              />
            {/snippet}
          </Field>
          <div class="fd-bridge__actions">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!canConnect}
              loading={connecting}
              data-testid="webmcp-bridge-connect"
            >
              {msgs.connect}
            </Button>
          </div>
        </form>
      {/if}
    </div>
  {/if}
{/if}

<style>
  /* The trigger is xyflow's own control button; only the dot is added. */
  :global(.svelte-flow__controls-button.fd-bridge__trigger) {
    position: relative;
  }

  .fd-bridge__dot {
    display: inline-block;
    flex: none;
    box-sizing: border-box;
    width: var(--fd-space-xs);
    height: var(--fd-space-xs);
    border-radius: var(--fd-radius-full);
    background-color: var(--fd-muted-foreground);
  }
  .fd-bridge__dot--connecting {
    background-color: var(--fd-primary);
  }
  .fd-bridge__dot--connected {
    background-color: var(--fd-success);
  }
  .fd-bridge__dot--error {
    background-color: var(--fd-error);
  }

  /* On the button: a corner dot with a ring in the button's own colour, so it reads on any theme. */
  .fd-bridge__badge {
    position: absolute;
    top: var(--fd-space-3xs);
    right: var(--fd-space-3xs);
    border: 1px solid var(--xy-controls-button-background-color, var(--fd-card));
  }

  .fd-bridge__popover {
    position: fixed;
    z-index: 60;
    box-sizing: border-box;
    width: 18.5rem;
    max-width: calc(100vw - 2 * var(--fd-space-xl));
    max-height: min(60vh, 440px);
    margin-bottom: var(--fd-space-xs);
    overflow-y: auto;
    padding: var(--fd-space-md);
    background-color: var(--fd-background);
    border: 1px solid var(--fd-border);
    border-radius: var(--fd-menu-radius);
    box-shadow: var(--fd-menu-shadow);
    font-family: var(--fd-font-sans);
    font-size: var(--fd-text-sm);
    color: var(--fd-foreground);
  }

  .fd-bridge__explainer {
    margin: 0 0 var(--fd-space-md);
    color: var(--fd-muted-foreground);
  }

  .fd-bridge__status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--fd-space-xs);
    margin: 0 0 var(--fd-space-md);
    font-weight: 500;
  }
  .fd-bridge__detail {
    flex-basis: 100%;
    font-weight: 400;
    color: var(--fd-muted-foreground);
    overflow-wrap: anywhere;
  }

  .fd-bridge__form {
    display: flex;
    flex-direction: column;
    gap: var(--fd-space-sm);
  }

  .fd-bridge__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--fd-space-xs);
  }

  .fd-bridge__tools {
    margin: 0 0 var(--fd-space-md);
    color: var(--fd-muted-foreground);
  }
  .fd-bridge__tools summary {
    cursor: pointer;
  }
  .fd-bridge__tools ul {
    margin: var(--fd-space-xs) 0 0;
    padding: 0;
    max-height: 9rem;
    overflow-y: auto;
    list-style: none;
    font-family: var(--fd-font-mono);
    font-size: var(--fd-text-xs);
  }
  .fd-bridge__tools li {
    padding: var(--fd-space-3xs) 0;
    overflow-wrap: anywhere;
  }
</style>
