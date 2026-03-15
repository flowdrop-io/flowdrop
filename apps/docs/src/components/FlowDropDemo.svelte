<script lang="ts">
  interface Props {
    readOnly?: boolean;
    showNavbar?: boolean;
    height?: string;
    title?: string;
  }

  let {
    readOnly = false,
    showNavbar = false,
    height = '70vh',
    title = 'FlowDrop Editor'
  }: Props = $props();

  const demoUrl = $derived(`/demo/?readOnly=${readOnly}&showNavbar=${showNavbar}`);
</script>

<div class="fd-demo-chrome">
  <div class="fd-chrome-bar">
    <div class="fd-chrome-dots"><span></span><span></span><span></span></div>
    <div class="fd-chrome-title">{title}</div>
    <div class="fd-chrome-spacer"></div>
  </div>
  <div class="fd-demo-inline" style:height>
    <iframe
      src={demoUrl}
      class="fd-demo-iframe"
      title="FlowDrop Interactive Demo"
      allow="clipboard-write"
    ></iframe>
  </div>
</div>
