<!--
  ReadOnlyDetails Component
  Displays readonly information with an ID (with copy button), title, description, and label-value pairs
  Compact inline layout with BEM syntax
-->

<script lang="ts">
	/**
	 * A single detail item with label and value
	 */
	interface DetailItem {
		/** The label to display */
		label: string;
		/** The value to display */
		value: string;
	}

	/**
	 * Props interface for ReadOnlyDetails component
	 */
	interface Props {
		/** The unique identifier to display with a copy button */
		id: string;
		/** Optional section title */
		title?: string;
		/** Optional description text */
		description?: string;
		/** Array of label-value pairs to display */
		details: DetailItem[];
	}

	const { id, title, description, details }: Props = $props();

	/**
	 * Copy the ID to clipboard
	 */
	function copyId(): void {
		navigator.clipboard.writeText(id);
	}
</script>

<div class="readonly-details">
	{#if title}
		<h3 class="readonly-details__title">{title}</h3>
	{/if}

	<div class="readonly-details__grid">
		<!-- ID row -->
		<span class="readonly-details__label">ID</span>
		<div class="readonly-details__id-row">
			<code class="readonly-details__id">{id}</code>
			<button
				class="readonly-details__copy-btn"
				onclick={copyId}
				title="Copy ID"
				aria-label="Copy ID to clipboard"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
					/>
				</svg>
			</button>
		</div>

		<!-- Dynamic label-value pairs -->
		{#each details as detail (detail.label)}
			<span class="readonly-details__label">{detail.label}</span>
			<span class="readonly-details__value">{detail.value}</span>
		{/each}
	</div>

	<!-- Description (if provided) -->
	{#if description}
		<p class="readonly-details__description">{description}</p>
	{/if}
</div>

<style>
	.readonly-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.readonly-details__title {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.readonly-details__grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 0.75rem;
		align-items: center;
	}

	.readonly-details__label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #9ca3af;
	}

	.readonly-details__value {
		font-size: 0.8125rem;
		color: #374151;
		font-weight: 500;
	}

	.readonly-details__id-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.readonly-details__id {
		font-size: 0.75rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
		color: #6b7280;
		background-color: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		word-break: break-all;
	}

	.readonly-details__copy-btn {
		background: transparent;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		color: #9ca3af;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			color 0.15s,
			background-color 0.15s;
	}

	.readonly-details__copy-btn:hover {
		color: #374151;
		background-color: #f3f4f6;
	}

	.readonly-details__copy-btn:active {
		color: #111827;
	}

	.readonly-details__description {
		margin: 0;
		font-size: 0.8125rem;
		color: #6b7280;
		line-height: 1.5;
	}
</style>
