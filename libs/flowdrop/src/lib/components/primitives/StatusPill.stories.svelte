<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import StatusPill from './StatusPill.svelte';

  const { Story } = defineMeta({
    title: 'Primitives/StatusPill',
    component: StatusPill,
    tags: ['autodocs'],
    parameters: { layout: 'centered' },
    argTypes: {
      status: {
        control: { type: 'select' },
        options: ['running', 'completed', 'waiting', 'failed', 'skipped']
      },
      size: { control: { type: 'select' }, options: ['sm', 'md'] },
      zoom: { control: { type: 'range', min: 0.2, max: 2, step: 0.05 } },
      screenSize: { control: 'boolean' }
    },
    args: { status: 'running', size: 'md', zoom: 1, screenSize: false }
  });

  const statuses = ['running', 'completed', 'waiting', 'failed', 'skipped'] as const;
  const sizes = ['sm', 'md'] as const;
</script>

<Story name="Running" args={{ status: 'running' }} />
<Story name="Completed" args={{ status: 'completed' }} />
<Story name="Waiting" args={{ status: 'waiting' }} />
<Story name="Failed" args={{ status: 'failed' }} />
<Story name="Skipped" args={{ status: 'skipped' }} />
<Story name="With count" args={{ status: 'failed', count: 3 }} />
<Story name="Custom label" args={{ status: 'waiting', label: 'Approve draft' }} />

<Story name="Screen size (zoom 0.4)" args={{ status: 'running', zoom: 0.4, screenSize: true }} />

<Story name="Screen size on a zoomed-out node" asChild>
  <div style="display:flex; gap:3rem; align-items:flex-end;">
    {#each [1, 0.6, 0.4, 0.2] as z (z)}
      <div style="display:flex; flex-direction:column; align-items:center; gap:0.5rem;">
        <div
          style="position:relative; width:{160 * z}px; height:{70 *
            z}px; margin-top:3rem; border:1px solid var(--fd-border); background:var(--fd-card); border-radius:var(--fd-radius-lg);"
        >
          <div
            style="position:absolute; left:50%; top:0; transform:translate(-50%, -50%); transform-origin:center;"
          >
            <StatusPill status="failed" zoom={z} screenSize transformOrigin="center center" />
          </div>
        </div>
        <span style="font-size:var(--fd-text-xs); color:var(--fd-muted-foreground);">zoom {z}</span>
      </div>
    {/each}
  </div>
</Story>

<Story name="Matrix" asChild>
  <div
    style="display:grid; grid-template-columns:auto auto auto auto; gap:0.75rem 1rem; align-items:center;"
  >
    <span></span><span>plain</span><span>count 3</span><span>long label</span>
    {#each sizes as size (size)}
      {#each statuses as status (status)}
        <span style="font-size:var(--fd-text-xs); color:var(--fd-muted-foreground);"
          >{status} / {size}</span
        >
        <StatusPill {status} {size} />
        <StatusPill {status} {size} count={3} />
        <StatusPill {status} {size} label="A much longer label" />
      {/each}
    {/each}
  </div>
</Story>

<Story name="Matrix (dark)" globals={{ theme: 'dark' }} asChild>
  <div
    style="display:grid; grid-template-columns:auto auto auto; gap:0.75rem 1rem; align-items:center;"
  >
    {#each statuses as status (status)}
      <StatusPill {status} size="sm" />
      <StatusPill {status} />
      <StatusPill {status} count={12} />
    {/each}
  </div>
</Story>
