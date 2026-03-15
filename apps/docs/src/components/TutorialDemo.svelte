<script lang="ts">
  interface Props {
    step: string;
    readOnly?: boolean;
    showNavbar?: boolean;
    height?: string;
    zoom?: number;
  }

  let {
    step,
    readOnly = false,
    showNavbar = false,
    height = '60vh',
    zoom = 0.65
  }: Props = $props();

  const demoUrl = $derived(
    `/demo/?step=${step}&readOnly=${readOnly}&showNavbar=${showNavbar}&zoom=${zoom}`
  );
</script>

<div class="fd-demo-chrome">
  <div class="fd-chrome-bar">
    <div class="fd-chrome-dots"><span></span><span></span><span></span></div>
    <div class="fd-chrome-title">FlowDrop Editor</div>
    <div class="fd-chrome-spacer"></div>
  </div>
  <div class="fd-demo-inline" style:height>
    <iframe
      src={demoUrl}
      class="fd-demo-iframe"
      title="FlowDrop Tutorial - Step {step}"
      allow="clipboard-write"
    ></iframe>
  </div>
</div>
