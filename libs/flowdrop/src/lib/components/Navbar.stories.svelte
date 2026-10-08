<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Navbar from './Navbar.svelte';
  import LogoWordmark from './LogoWordmark.svelte';

  const imageLogo = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="24" viewBox="0 0 120 24"><rect width="120" height="24" rx="4" fill="#0a7"/><text x="60" y="16" font-size="12" text-anchor="middle" fill="#fff" font-family="sans-serif">Acme</text></svg>'
  )}`;

  const { Story } = defineMeta({
    title: 'Patterns/Editor/Navbar',
    component: Navbar,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen'
    }
  });
</script>

<Story
  name="Default"
  args={{
    title: 'My Workflow',
    showStatus: true,
    showSettings: true
  }}
/>

<Story
  name="With Actions"
  args={{
    title: 'Workflow Editor',
    primaryActions: [
      {
        label: 'Save',
        href: '#',
        icon: 'mdi:content-save',
        variant: 'primary'
      },
      { label: 'Export', href: '#', icon: 'mdi:download', variant: 'outline' }
    ],
    showStatus: true
  }}
/>

<Story
  name="With Breadcrumbs"
  args={{
    breadcrumbs: [
      { label: 'Workflows', href: '#', icon: 'mdi:folder' },
      { label: 'My Workflow', href: '#' }
    ],
    showSettings: true
  }}
/>

<Story
  name="Minimal"
  args={{
    showStatus: false,
    showSettings: false
  }}
/>

<Story
  name="Default Wordmark"
  args={{
    title: 'My Workflow',
    showStatus: true
  }}
/>

<Story
  name="Image Logo"
  args={{
    title: 'My Workflow',
    branding: { logo: imageLogo, logoAlt: 'Acme Studio', href: '#' }
  }}
/>

<Story
  name="Component Logo"
  args={{
    title: 'My Workflow',
    branding: { logo: LogoWordmark, logoAlt: 'Acme Studio' }
  }}
/>
