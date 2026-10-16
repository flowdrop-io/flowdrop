<script module lang="ts">
  // Stories that pass args draw the bar inside the scope frame (see the `template` snippet below).
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import Navbar from './Navbar.svelte';
  import LogoWordmark from './LogoWordmark.svelte';
  import Button from './primitives/Button.svelte';
  import InstanceDecorator from '../stories/InstanceDecorator.svelte';
  import ScopeFrame from '../stories/ScopeFrame.svelte';
  import type { NavbarAction } from '../types/navbar.js';

  const imageLogo = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="24" viewBox="0 0 120 24"><rect width="120" height="24" rx="4" fill="#0a7"/><text x="60" y="16" font-size="12" text-anchor="middle" fill="#fff" font-family="sans-serif">Acme</text></svg>'
  )}`;

  const { Story } = defineMeta({
    title: 'Editor/Canvas/Navbar',
    render: template,
    component: Navbar,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    args: { title: 'Support chat', showStatus: true, showSettings: true }
  });

  const onSave = fn();
  const onWorkflowSettings = fn();

  /** The actions the editor gives by default: Save, then Export and Import in the menu. */
  const editorActions: NavbarAction[] = [
    {
      label: 'Save',
      href: '#save',
      icon: 'mdi:file-download-outline',
      variant: 'primary',
      onclick: (e) => {
        e.preventDefault();
        onSave();
      }
    },
    { label: 'Export', href: '#export', icon: 'mdi:download', variant: 'outline' },
    { label: 'Import', href: '#import', icon: 'mdi:upload', variant: 'outline' }
  ];
</script>

{#snippet template(args: Record<string, unknown>)}
  <ScopeFrame>
    <Navbar {...args} />
  </ScopeFrame>
{/snippet}

<Story
  name="In the editor"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The bar as the editor draws it: title, a Save button with Export and Import in its menu, the Workflow button, and the settings gear. Ctrl/Cmd+S runs Save. The Problems indicator is not shown here because it needs a backend that offers a Doctor.'
      }
    }
  }}
>
  <ScopeFrame
    ><InstanceDecorator>
      <Navbar
        title="Support chat"
        primaryActions={editorActions}
        showStatus
        showSettings
        saveShortcut
        {onWorkflowSettings}
      />
    </InstanceDecorator></ScopeFrame
  >
</Story>

<Story
  name="Workflow settings open"
  asChild
  parameters={{
    docs: {
      description: {
        story: 'While the workflow settings panel is open, the Workflow button reads as pressed.'
      }
    }
  }}
>
  <ScopeFrame
    ><InstanceDecorator>
      <Navbar
        title="Support chat"
        primaryActions={editorActions}
        showStatus
        saveShortcut
        workflowSettingsOpen
        {onWorkflowSettings}
      />
    </InstanceDecorator></ScopeFrame
  >
</Story>

<Story
  name="One action"
  args={{
    primaryActions: [{ label: 'Save', href: '#save', icon: 'mdi:file-download-outline' }]
  }}
  parameters={{
    docs: {
      description: {
        story: 'With a single action there is no menu to split off, so the button is whole.'
      }
    }
  }}
/>

<Story
  name="Grouped menu"
  args={{
    primaryActions: [
      { label: 'Save', href: '#save', icon: 'mdi:file-download-outline' },
      { label: 'Duplicate', href: '#duplicate', icon: 'mdi:content-copy' },
      { label: 'Export JSON', href: '#export-json', icon: 'mdi:code-json', group: 'Export' },
      { label: 'Export image', href: '#export-image', icon: 'mdi:image-outline', group: 'Export' }
    ]
  }}
  parameters={{
    docs: {
      description: {
        story:
          'Actions after the first go in the menu. Give them a `group` to put them under a heading. Open the menu with the arrow.'
      }
    }
  }}
/>

<Story
  name="Split buttons"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'A skin can show every action as its own button instead of a button with a menu. It does so by setting `--fd-navbar-split-display: flex` and `--fd-navbar-dropdown-display: none`; this story sets them on a wrapper.'
      }
    }
  }}
>
  <ScopeFrame>
    <div style="--fd-navbar-split-display: flex; --fd-navbar-dropdown-display: none">
      <Navbar title="Support chat" primaryActions={editorActions} showStatus />
    </div>
  </ScopeFrame>
</Story>

<Story
  name="With breadcrumbs"
  args={{
    title: undefined,
    breadcrumbs: [
      { label: 'Workflows', href: '#', icon: 'mdi:folder' },
      { label: 'Support chat', href: '#' }
    ]
  }}
  parameters={{
    docs: {
      description: {
        story: 'Breadcrumbs replace the title. The last one is the current page and is not a link.'
      }
    }
  }}
/>

<Story
  name="With your own controls"
  asChild
  parameters={{
    docs: {
      description: {
        story:
          'The `end` snippet adds your own controls before the settings gear. The `status` snippet adds an indicator before the actions (the editor puts the Problems indicator there).'
      }
    }
  }}
>
  <ScopeFrame>
    <Navbar title="Support chat" primaryActions={editorActions} showStatus={false}>
      {#snippet status()}
        <span style="font-size: var(--fd-text-sm); color: var(--fd-muted-foreground)">
          Draft saved 2 minutes ago
        </span>
      {/snippet}
      {#snippet end()}
        <Button variant="ghost" size="sm">Share</Button>
      {/snippet}
    </Navbar>
  </ScopeFrame>
</Story>

<Story
  name="Minimal"
  args={{ title: undefined, showStatus: false, showSettings: false }}
  parameters={{
    docs: { description: { story: 'Only the logo. For a host that supplies its own chrome.' } }
  }}
/>

<Story
  name="Your logo as an image"
  args={{ branding: { logo: imageLogo, logoAlt: 'Acme Studio', href: '#' } }}
  parameters={{
    docs: {
      description: {
        story:
          'A white-label host swaps the FlowDrop wordmark for its own image. It is scaled to fit the bar and links to `href`.'
      }
    }
  }}
/>

<Story
  name="Your logo as a component"
  args={{ branding: { logo: LogoWordmark, logoAlt: 'Acme Studio' } }}
  parameters={{
    docs: {
      description: {
        story: 'A logo can also be a Svelte component. It must size itself to the same 24 px box.'
      }
    }
  }}
/>
