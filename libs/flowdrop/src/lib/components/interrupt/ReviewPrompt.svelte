<!--
  ReviewPrompt Component

  Renders a review prompt for review-type interrupts.
  Displays proposed field changes with accept/reject toggles per field.
  Supports bulk "Accept All" / "Reject All" actions.
  Shows the review decisions when resolved.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { diffWords, diffArrays, diffJson } from 'diff';
	import type { Change } from 'diff';
	import type {
		ReviewConfig,
		ReviewResolution,
		ReviewFieldDecision
	} from '../../types/interrupt.js';

	/**
	 * Component props
	 */
	interface Props {
		/** Review configuration from the interrupt */
		config: ReviewConfig;
		/** Whether this interrupt has been resolved */
		isResolved: boolean;
		/** The resolved value if resolved */
		resolvedValue?: ReviewResolution;
		/** Whether the form is currently submitting */
		isSubmitting: boolean;
		/** Error message if submission failed */
		error?: string;
		/** Username of the person who resolved the interrupt */
		resolvedByUserName?: string;
		/** Callback when user submits review */
		onSubmit: (value: ReviewResolution) => void;
	}

	let {
		config,
		isResolved,
		resolvedValue,
		isSubmitting,
		error,
		resolvedByUserName,
		onSubmit
	}: Props = $props();

	/** Local state: map of field -> accepted boolean. Default all to true (accept). */
	let decisions = $state<Record<string, boolean>>(
		Object.fromEntries(config.changes.map((c) => [c.field, true]))
	);

	/** Count of accepted fields */
	const acceptedCount = $derived(Object.values(decisions).filter((v) => v).length);

	/** Count of rejected fields */
	const rejectedCount = $derived(Object.values(decisions).filter((v) => !v).length);

	/** Total number of changes */
	const totalCount = $derived(config.changes.length);

	/** Button labels with defaults */
	const acceptAllLabel = $derived(config.acceptAllLabel ?? 'Accept All');
	const rejectAllLabel = $derived(config.rejectAllLabel ?? 'Reject All');
	const submitLabel = $derived(config.submitLabel ?? 'Submit Review');

	/**
	 * Set a specific field's decision
	 */
	function setFieldDecision(field: string, accepted: boolean): void {
		if (isResolved || isSubmitting) return;
		decisions = { ...decisions, [field]: accepted };
	}

	/**
	 * Accept all changes
	 */
	function handleAcceptAll(): void {
		if (isResolved || isSubmitting) return;
		decisions = Object.fromEntries(config.changes.map((c) => [c.field, true]));
	}

	/**
	 * Reject all changes
	 */
	function handleRejectAll(): void {
		if (isResolved || isSubmitting) return;
		decisions = Object.fromEntries(config.changes.map((c) => [c.field, false]));
	}

	/**
	 * Submit the review
	 */
	function handleSubmit(): void {
		if (isResolved || isSubmitting) return;

		const fieldDecisions: Record<string, ReviewFieldDecision> = {};
		for (const change of config.changes) {
			const accepted = decisions[change.field] ?? true;
			fieldDecisions[change.field] = {
				accepted,
				value: accepted ? change.proposed : change.original
			};
		}

		const resolution: ReviewResolution = {
			decisions: fieldDecisions,
			summary: {
				accepted: acceptedCount,
				rejected: rejectedCount,
				total: totalCount
			}
		};

		onSubmit(resolution);
	}

	/**
	 * Check if a string contains HTML tags.
	 */
	function containsHtml(value: unknown): boolean {
		return typeof value === 'string' && /<[a-z][\s\S]*?>/i.test(value);
	}

	/**
	 * Strip HTML tags from a string, preserving text content.
	 * Collapses whitespace and trims the result.
	 */
	function stripHtmlTags(html: string): string {
		return html
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, ' ')
			.replace(/\n{3,}/g, '\n\n')
			.trim();
	}

	/**
	 * Format a value for display
	 */
	function formatValue(value: unknown): string {
		if (value === null || value === undefined) return '(empty)';
		if (typeof value === 'string') return value;
		if (typeof value === 'boolean') return value ? 'Yes' : 'No';
		if (typeof value === 'object') return JSON.stringify(value, null, 2);
		return String(value);
	}

	/**
	 * Compute a diff between two values.
	 * Supports strings (word-level), arrays (element-level), and objects (JSON line-level).
	 * For HTML strings, strips tags and diffs the plain text content.
	 */
	function computeDiff(original: unknown, proposed: unknown): Change[] | null {
		if (typeof original === 'string' && typeof proposed === 'string') {
			const origText = containsHtml(original) ? stripHtmlTags(original) : original;
			const propText = containsHtml(proposed) ? stripHtmlTags(proposed) : proposed;
			return diffWords(origText, propText);
		}
		if (Array.isArray(original) && Array.isArray(proposed)) {
			const arrayChanges = diffArrays(original, proposed);
			return arrayChanges.map((part) => ({
				value: part.value.map((v: unknown) => JSON.stringify(v)).join(', '),
				added: part.added,
				removed: part.removed,
				count: part.count
			}));
		}
		if (
			typeof original === 'object' &&
			original !== null &&
			!Array.isArray(original) &&
			typeof proposed === 'object' &&
			proposed !== null &&
			!Array.isArray(proposed)
		) {
			return diffJson(original, proposed);
		}
		return null;
	}

	/**
	 * Check if a diff result contains multi-line content (e.g. JSON diffs).
	 */
	function isMultiLineDiff(changes: Change[]): boolean {
		return changes.some((part) => part.value.includes('\n'));
	}
</script>

<div
	class="review-prompt"
	class:review-prompt--resolved={isResolved}
	class:review-prompt--submitting={isSubmitting}
>
	<!-- Message -->
	<p class="review-prompt__message">{config.message}</p>

	<!-- Error message -->
	{#if error}
		<div class="review-prompt__error">
			<Icon icon="mdi:alert-circle" />
			<span>{error}</span>
		</div>
	{/if}

	<!-- Bulk actions & counter (pending state only) -->
	{#if !isResolved}
		<div class="review-prompt__toolbar">
			<div class="review-prompt__bulk-actions">
				<button
					type="button"
					class="review-prompt__bulk-btn review-prompt__bulk-btn--accept"
					onclick={handleAcceptAll}
					disabled={isSubmitting}
				>
					<Icon icon="mdi:check-all" />
					<span>{acceptAllLabel}</span>
				</button>
				<button
					type="button"
					class="review-prompt__bulk-btn review-prompt__bulk-btn--reject"
					onclick={handleRejectAll}
					disabled={isSubmitting}
				>
					<Icon icon="mdi:close-circle-multiple-outline" />
					<span>{rejectAllLabel}</span>
				</button>
			</div>
			<span class="review-prompt__counter">
				{acceptedCount} of {totalCount} accepted
			</span>
		</div>
	{/if}

	<!-- Changes list -->
	<div class="review-prompt__changes">
		{#each config.changes as change (change.field)}
			{@const isAccepted = isResolved
				? (resolvedValue?.decisions[change.field]?.accepted ?? true)
				: (decisions[change.field] ?? true)}
			{@const diff = computeDiff(change.original, change.proposed)}
			{@const isHtml = containsHtml(change.original) || containsHtml(change.proposed)}
			<div
				class="review-prompt__change"
				class:review-prompt__change--accepted={isAccepted}
				class:review-prompt__change--rejected={!isAccepted}
			>
				<!-- Change header: label + toggle -->
				<div class="review-prompt__change-header">
					<span class="review-prompt__change-label">{change.label}</span>
					{#if !isResolved}
						<div class="review-prompt__toggle-group">
							<button
								type="button"
								class="review-prompt__toggle-btn review-prompt__toggle-btn--accept"
								class:review-prompt__toggle-btn--active={isAccepted}
								onclick={() => setFieldDecision(change.field, true)}
								disabled={isSubmitting}
								aria-label="Accept {change.label}"
								title="Accept"
							>
								<Icon icon="mdi:check" />
								<span>Accept</span>
							</button>
							<button
								type="button"
								class="review-prompt__toggle-btn review-prompt__toggle-btn--reject"
								class:review-prompt__toggle-btn--active={!isAccepted}
								onclick={() => setFieldDecision(change.field, false)}
								disabled={isSubmitting}
								aria-label="Reject {change.label}"
								title="Reject"
							>
								<Icon icon="mdi:close" />
								<span>Reject</span>
							</button>
						</div>
					{:else}
						<span
							class="review-prompt__decision-badge"
							class:review-prompt__decision-badge--accepted={isAccepted}
							class:review-prompt__decision-badge--rejected={!isAccepted}
						>
							{#if isAccepted}
								<Icon icon="mdi:check-circle" />
								<span>Accepted</span>
							{:else}
								<Icon icon="mdi:close-circle" />
								<span>Rejected</span>
							{/if}
						</span>
					{/if}
				</div>

				<!-- Change diff content -->
				<div class="review-prompt__change-body">
					<div class="review-prompt__diff-row">
						<span class="review-prompt__diff-label">Original:</span>
						{#if isHtml}
							<span class="review-prompt__diff-value review-prompt__html-content">{@html change.original}</span>
						{:else}
							<span class="review-prompt__diff-value">
								{formatValue(change.original)}
							</span>
						{/if}
					</div>
					<div class="review-prompt__diff-row">
						<span class="review-prompt__diff-label">Proposed:</span>
						{#if isHtml}
							<span class="review-prompt__diff-value review-prompt__diff-value--proposed review-prompt__html-content">{@html change.proposed}</span>
						{:else}
							<span class="review-prompt__diff-value review-prompt__diff-value--proposed">
								{formatValue(change.proposed)}
							</span>
						{/if}
					</div>
					{#if diff}
						<div class="review-prompt__diff-row">
							<span class="review-prompt__diff-label">Diff:</span>
						{#if isMultiLineDiff(diff)}
							<pre class="review-prompt__diff-value review-prompt__diff-block">{#each diff as part}{#if part.added}<span class="review-prompt__diff-token--added">{part.value}</span>{:else if part.removed}<span class="review-prompt__diff-token--removed">{part.value}</span>{:else}<span>{part.value}</span>{/if}{/each}</pre>
						{:else}
							<span class="review-prompt__diff-value review-prompt__diff-inline">
								{#each diff as part}
									{#if part.added}
										<span class="review-prompt__diff-token--added">{part.value}</span>
									{:else if part.removed}
										<span class="review-prompt__diff-token--removed">{part.value}</span>
									{:else}
										<span>{part.value}</span>
									{/if}
								{/each}
							</span>
						{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Submit button (pending state only) -->
	{#if !isResolved}
		<div class="review-prompt__actions">
			<button
				type="button"
				class="review-prompt__submit"
				onclick={handleSubmit}
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<span class="review-prompt__spinner"></span>
				{:else}
					<Icon icon="mdi:check" />
				{/if}
				<span>{submitLabel}</span>
			</button>
		</div>
	{/if}

	<!-- Resolved summary -->
	{#if isResolved && resolvedValue}
		<div class="review-prompt__summary">
			<span class="review-prompt__summary-text">
				{resolvedValue.summary.accepted} accepted, {resolvedValue.summary.rejected} rejected
				out of {resolvedValue.summary.total} changes
			</span>
		</div>
	{/if}

	<!-- Resolved indicator -->
	{#if isResolved}
		<div class="review-prompt__resolved-badge">
			<Icon icon="mdi:check-circle" />
			<span>
				{resolvedByUserName
					? `Response submitted by ${resolvedByUserName}`
					: 'Response submitted'}
			</span>
		</div>
	{/if}
</div>

<style>
	/* Uses design tokens from base.css/tokens.css */
	.review-prompt {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.review-prompt--resolved {
		opacity: 0.85;
	}

	.review-prompt--submitting {
		pointer-events: none;
	}

	.review-prompt__message {
		margin: 0;
		font-size: 0.9375rem;
		line-height: 1.5;
		color: var(--fd-foreground);
	}

	.review-prompt__error {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-error-muted);
		border-radius: var(--fd-radius-md);
		color: var(--fd-error);
		font-size: 0.8125rem;
	}

	/* Toolbar: bulk actions + counter */
	.review-prompt__toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.review-prompt__bulk-actions {
		display: flex;
		gap: 0.5rem;
	}

	.review-prompt__bulk-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		font-family: inherit;
		border-radius: var(--fd-radius-md);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
		border: 1px solid var(--fd-border);
		background-color: var(--fd-muted);
		color: var(--fd-foreground);
	}

	.review-prompt__bulk-btn:hover:not(:disabled) {
		border-color: var(--fd-border-strong);
	}

	.review-prompt__bulk-btn--accept:hover:not(:disabled) {
		background-color: var(--fd-success-muted);
		border-color: var(--fd-success);
		color: var(--fd-success);
	}

	.review-prompt__bulk-btn--reject:hover:not(:disabled) {
		background-color: var(--fd-error-muted);
		border-color: var(--fd-error);
		color: var(--fd-error);
	}

	.review-prompt__bulk-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.review-prompt__counter {
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
	}

	/* Change cards */
	.review-prompt__changes {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.review-prompt__change {
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-lg);
		border-left: 3px solid var(--fd-border);
		background-color: var(--fd-muted);
		overflow: hidden;
		transition: all var(--fd-transition-fast);
	}

	.review-prompt__change--accepted {
		border-left-color: var(--fd-success);
	}

	.review-prompt__change--rejected {
		border-left-color: var(--fd-error);
	}

	.review-prompt__change-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 0.875rem;
		border-bottom: 1px solid var(--fd-border);
	}

	.review-prompt__change-label {
		font-size: var(--fd-text-sm);
		font-weight: 600;
		color: var(--fd-foreground);
	}

	/* Accept/Reject toggle buttons */
	.review-prompt__toggle-group {
		display: flex;
		gap: 0.25rem;
	}

	.review-prompt__toggle-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		height: 1.75rem;
		padding: 0 0.5rem;
		border-radius: var(--fd-radius-md);
		border: 1px solid var(--fd-border);
		background-color: var(--fd-background);
		color: var(--fd-muted-foreground);
		cursor: pointer;
		transition: all var(--fd-transition-fast);
		font-size: 0.75rem;
		font-weight: 500;
		font-family: inherit;
	}

	.review-prompt__toggle-btn:hover:not(:disabled) {
		border-color: var(--fd-border-strong);
	}

	.review-prompt__toggle-btn--accept.review-prompt__toggle-btn--active {
		background-color: var(--fd-success);
		border-color: var(--fd-success);
		color: #ffffff;
	}

	.review-prompt__toggle-btn--reject.review-prompt__toggle-btn--active {
		background-color: var(--fd-error);
		border-color: var(--fd-error);
		color: #ffffff;
	}

	.review-prompt__toggle-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Decision badge (resolved state) */
	.review-prompt__decision-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.review-prompt__decision-badge--accepted {
		color: var(--fd-success);
	}

	.review-prompt__decision-badge--rejected {
		color: var(--fd-error);
	}

	/* Diff content */
	.review-prompt__change-body {
		padding: 0.625rem 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.review-prompt__diff-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.review-prompt__diff-label {
		font-size: var(--fd-text-xs);
		font-weight: 500;
		color: var(--fd-muted-foreground);
		min-width: 5rem;
		flex-shrink: 0;
	}

	.review-prompt__diff-value {
		font-size: var(--fd-text-sm);
		color: var(--fd-foreground);
		word-break: break-word;
		white-space: pre-wrap;
	}

	.review-prompt__diff-value--proposed {
		font-weight: 500;
	}

	/* Inline diff display */
	.review-prompt__diff-inline {
		line-height: 1.6;
	}

	/* Rendered HTML content */
	.review-prompt__html-content {
		font-size: var(--fd-text-sm);
		line-height: 1.6;
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
	}

	.review-prompt__html-content :global(p) {
		margin: 0 0 0.5em 0;
	}

	.review-prompt__html-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.review-prompt__html-content :global(ul),
	.review-prompt__html-content :global(ol) {
		margin: 0 0 0.5em 0;
		padding-left: 1.25em;
	}

	.review-prompt__html-content :global(h1),
	.review-prompt__html-content :global(h2),
	.review-prompt__html-content :global(h3),
	.review-prompt__html-content :global(h4),
	.review-prompt__html-content :global(h5),
	.review-prompt__html-content :global(h6) {
		margin: 0 0 0.25em 0;
		font-size: 1em;
		font-weight: 600;
	}

	/* Block diff display (for JSON/multi-line diffs) */
	.review-prompt__diff-block {
		margin: 0;
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-muted);
		border: 1px solid var(--fd-border);
		border-radius: var(--fd-radius-md);
		font-family: monospace;
		font-size: var(--fd-text-xs);
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
		overflow-x: auto;
	}

	.review-prompt__diff-token--added {
		background-color: var(--fd-success-muted);
		color: var(--fd-success);
		padding: 0.0625rem 0.125rem;
		border-radius: 0.125rem;
	}

	.review-prompt__diff-token--removed {
		background-color: var(--fd-error-muted);
		color: var(--fd-error);
		text-decoration: line-through;
		padding: 0.0625rem 0.125rem;
		border-radius: 0.125rem;
	}

	/* Actions */
	.review-prompt__actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.25rem;
	}

	.review-prompt__submit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		border-radius: var(--fd-radius-lg);
		font-size: var(--fd-text-sm);
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		border: none;
		min-height: 2.5rem;
		background: var(--fd-interrupt-btn-primary-bg);
		color: var(--fd-primary-foreground);
		box-shadow: 0 1px 3px var(--fd-interrupt-btn-primary-shadow);
	}

	.review-prompt__submit:hover:not(:disabled) {
		background: var(--fd-interrupt-btn-primary-bg-hover);
		box-shadow: 0 4px 12px var(--fd-interrupt-btn-primary-shadow);
		transform: translateY(-1px);
	}

	.review-prompt__submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.review-prompt__spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid var(--fd-border);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: review-spin 0.6s linear infinite;
	}

	@keyframes review-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Summary */
	.review-prompt__summary {
		padding: 0.5rem 0.75rem;
		background-color: var(--fd-primary-muted);
		border: 1px solid var(--fd-interrupt-completed-border);
		border-radius: var(--fd-radius-md);
	}

	.review-prompt__summary-text {
		font-size: var(--fd-text-sm);
		color: var(--fd-interrupt-completed-text);
	}

	/* Resolved badge - neutral blue theme */
	.review-prompt__resolved-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background-color: var(--fd-interrupt-badge-completed-bg);
		border-radius: 9999px;
		color: var(--fd-interrupt-badge-completed-text);
		font-size: 0.75rem;
		font-weight: 500;
		align-self: flex-start;
	}
</style>
