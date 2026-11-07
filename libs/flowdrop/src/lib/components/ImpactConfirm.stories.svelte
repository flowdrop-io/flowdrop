<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ImpactConfirm from './ImpactConfirm.svelte';
  import type { ImpactReport } from '../types/impact.js';

  const report: ImpactReport = {
    confirm: true,
    interfaceLevel: 'breaking',
    interfaceBreaking: true,
    refused: false,
    refusedMessage: null,
    copyUrl: null,
    renames: [],
    items: [
      {
        kind: 'workflow',
        severity: 'breaks',
        label: 'Onboarding flow',
        message: 'calls this workflow with an input that is removed.',
        url: '#'
      },
      {
        kind: 'profile',
        severity: 'changes',
        label: 'Support form',
        message: 'is switched off because the workflow now pauses for a reply.',
        url: '#'
      },
      {
        kind: 'trigger',
        severity: 'info',
        label: 'Nightly trigger',
        message: 'keeps working unchanged.',
        url: null
      }
    ]
  };

  const refusedReport: ImpactReport = {
    ...report,
    refused: true,
    copyUrl: '/workflow/1/copy'
  };

  const renameReport: ImpactReport = {
    ...report,
    confirm: false,
    items: [],
    renames: [
      {
        direction: 'output',
        from: 'node',
        to: 'article',
        places: [
          {
            kind: 'block',
            severity: 'changes',
            label: 'Tags block',
            message: 'reads the old name.',
            url: '#'
          }
        ]
      }
    ]
  };

  const { Story } = defineMeta({
    title: 'Editor/Impact confirm',
    component: ImpactConfirm,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' }
  });
</script>

<Story
  name="Breaks, changes and info"
  args={{ report, onResolve: () => {} }}
  parameters={{
    docs: {
      description: {
        story: 'What a save breaks or changes, grouped by severity, before the person confirms.'
      }
    }
  }}
/>

<Story
  name="Check failed"
  args={{ report: null, error: 'HTTP 500', onResolve: () => {} }}
  parameters={{
    docs: {
      description: { story: 'The check itself failed: one line, and the person decides.' }
    }
  }}
/>

<Story
  name="Refused"
  args={{
    report: refusedReport,
    onResolve: () => {},
    onSaveAsCopy: async () => ({ id: '2', editorUrl: null }),
    onDiscard: async () => {}
  }}
  parameters={{
    docs: {
      description: {
        story:
          'The change cannot be saved while things use the workflow: copy it or discard the edits.'
      }
    }
  }}
/>

<Story
  name="Renames"
  args={{ report: renameReport, onResolve: () => {} }}
  parameters={{
    docs: {
      description: {
        story: "A rename lists the places it also updates; following it is the person's choice."
      }
    }
  }}
/>
