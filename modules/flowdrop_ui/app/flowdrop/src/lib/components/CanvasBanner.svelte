<script lang="ts">
	import Icon from '@iconify/svelte';
	export let title: string;
	export let description: string;
	export let iconName: string | undefined;
</script>

<div class="flowdrop-canvas-banner">
	<div class="flowdrop-card">
		<div class="flowdrop-card__body flowdrop-text--center">
			<div class="flowdrop-canvas-banner__icon">
				{#if iconName}
					<Icon icon={iconName} class="flowdrop-canvas-banner__icon-svg" />
				{/if}
			</div>
			<h3 class="flowdrop-canvas-banner__title">{title}</h3>
			<p class="flowdrop-canvas-banner__description">{description}</p>
		</div>
	</div>
</div>

<style>
	.flowdrop-canvas-banner {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.flowdrop-canvas-banner__icon {
		font-size: 3.75rem;
		margin-bottom: 1rem;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.flowdrop-canvas-banner__title {
		font-size: 1.125rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		color: #111827;
	}

	.flowdrop-canvas-banner__description {
		font-size: 0.875rem;
		color: #6b7280;
	}
</style>
