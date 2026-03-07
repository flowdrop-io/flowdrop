<script lang="ts">
	interface Props {
		readOnly?: boolean;
		showNavbar?: boolean;
		buttonLabel?: string;
		buttonDescription?: string;
	}

	let {
		readOnly = false,
		showNavbar = false,
		buttonLabel = 'Launch Interactive Demo',
		buttonDescription = ''
	}: Props = $props();

	let isOpen = $state(false);
	let portalTarget: HTMLElement | null = $state(null);

	function open() {
		isOpen = true;
		document.body.style.overflow = 'hidden';
	}

	function close() {
		isOpen = false;
		document.body.style.overflow = '';
	}

	// Append modal to body to escape Starlight's isolation stacking context
	$effect(() => {
		if (!isOpen) return;

		const container = document.createElement('div');
		document.body.appendChild(container);
		portalTarget = container;

		const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
		window.addEventListener('keydown', handler);

		return () => {
			window.removeEventListener('keydown', handler);
			container.remove();
			portalTarget = null;
		};
	});

	const demoUrl = $derived(
		`/demo/?readOnly=${readOnly}&showNavbar=${showNavbar}`
	);
</script>

<div class="fd-demo-trigger">
	<button class="fd-demo-button" onclick={open}>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polygon points="5 3 19 12 5 21 5 3" />
		</svg>
		{buttonLabel}
	</button>
	{#if buttonDescription}
		<p class="fd-demo-description">{buttonDescription}</p>
	{/if}
</div>

{#if portalTarget}
	{@const _target = portalTarget}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fd-modal-backdrop" onclick={close} use:portal={_target}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fd-modal" onclick={(e) => e.stopPropagation()}>
			<button class="fd-modal-close" onclick={close} aria-label="Close demo">
				Back to Docs
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
			<iframe
				src={demoUrl}
				class="fd-modal-iframe"
				title="FlowDrop Interactive Demo"
				allow="clipboard-write"
			></iframe>
		</div>
	</div>
{/if}

<script lang="ts" module>
	function portal(node: HTMLElement, target: HTMLElement) {
		target.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}
</script>
