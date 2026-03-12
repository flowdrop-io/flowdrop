<!--
  Status Icon Component
  Reusable status icon that can be used anywhere in the application
  Displays status with appropriate icon, color, and styling
-->

<script lang="ts">
  import type { NodeExecutionStatus } from "../types/index.js";
  import Icon from "@iconify/svelte";
  import { getStatusColor, getStatusIcon } from "../utils/nodeStatus.js";

  interface Props {
    status: NodeExecutionStatus;
    size?: "sm" | "md" | "lg" | "xl";
    showBackground?: boolean;
    class?: string;
  }

  let props: Props = $props();

  // Size configurations
  const sizeConfig = {
    sm: {
      iconSize: "12px",
      backgroundSize: "20px",
      backgroundRadius: "0.25rem",
    },
    md: {
      iconSize: "16px",
      backgroundSize: "24px",
      backgroundRadius: "0.375rem",
    },
    lg: {
      iconSize: "24px",
      backgroundSize: "48px",
      backgroundRadius: "0.5rem",
    },
    xl: {
      iconSize: "28px",
      backgroundSize: "56px",
      backgroundRadius: "0.75rem",
    },
  };

  const config = $derived(sizeConfig[props.size || "md"]);
  const statusColor = $derived(getStatusColor(props.status));
  const statusIcon = $derived(getStatusIcon(props.status));
</script>

{#if props.showBackground}
  <div
    class="status-icon status-icon--with-background {props.class || ''}"
    style="
			--icon-size: {config.iconSize};
			--background-size: {config.backgroundSize};
			--background-radius: {config.backgroundRadius};
			--status-color: {statusColor};
		"
    title={props.status}
  >
    <Icon icon={statusIcon} class="status-icon__icon" />
  </div>
{:else}
  <Icon
    icon={statusIcon}
    class="status-icon status-icon--icon-only {props.class || ''}"
    style="
			--icon-size: {config.iconSize};
			--status-color: {statusColor};
		"
  />
{/if}

<style>
  .status-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--status-color);
    transition: all 0.2s ease-in-out;
  }

  .status-icon--with-background {
    width: var(--background-size);
    height: var(--background-size);
    background-color: var(--status-color);
    color: #fff;
    border-radius: var(--background-radius);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
  }

  .status-icon--with-background :global(.status-icon__icon) {
    width: var(--icon-size);
    height: var(--icon-size);
    font-size: var(--icon-size);
  }

  .status-icon--icon-only {
    width: var(--icon-size);
    height: var(--icon-size);
    font-size: var(--icon-size);
  }

  /* Animation for running status */
  .status-icon--with-background[title="running"] {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
</style>
