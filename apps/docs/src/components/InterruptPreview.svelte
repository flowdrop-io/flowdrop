<script lang="ts">
  interface Props {
    type: string;
    height?: string;
  }

  let { type, height = '280px' }: Props = $props();

  // Detect the current Starlight theme and pass it to the preview iframe
  let theme = $state('dark');

  $effect(() => {
    const updateTheme = () => {
      theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  });

  const previewUrl = $derived(`/interrupt-preview/?type=${type}&theme=${theme}`);
</script>

<div class="fd-demo-inline fd-interrupt-preview" style:height>
  <iframe
    src={previewUrl}
    class="fd-demo-iframe"
    title="FlowDrop {type} interrupt preview"
    loading="lazy"
  ></iframe>
</div>
