<!--
  SessionManager Component
  
  Manages playground sessions: list, create, switch, and delete.
  Displayed as a sidebar or dropdown.
  Styled with BEM syntax.
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';
	import type { PlaygroundSession } from '../../types/playground.js';
	import {
		sessions,
		currentSession,
		isLoading,
		sessionCount
	} from '../../stores/playgroundStore.js';

	/**
	 * Component props
	 */
	interface Props {
		/** Whether the session list is expanded */
		isExpanded?: boolean;
		/** Callback when expansion state changes */
		onToggle?: (expanded: boolean) => void;
		/** Callback when user wants to create a new session */
		onCreateSession?: () => void;
		/** Callback when user selects a session */
		onSelectSession?: (sessionId: string) => void;
		/** Callback when user wants to delete a session */
		onDeleteSession?: (sessionId: string) => void;
		/** Display mode: sidebar or dropdown */
		mode?: 'sidebar' | 'dropdown';
	}

	let {
		isExpanded = $bindable(false),
		onToggle,
		onCreateSession,
		onSelectSession,
		onDeleteSession,
		mode = 'sidebar'
	}: Props = $props();

	/** Session pending deletion (for confirmation) */
	let pendingDeleteId = $state<string | null>(null);

	/**
	 * Toggle expansion
	 */
	function toggleExpanded(): void {
		isExpanded = !isExpanded;
		onToggle?.(isExpanded);
	}

	/**
	 * Handle session selection
	 */
	function handleSelectSession(sessionId: string): void {
		onSelectSession?.(sessionId);
		if (mode === 'dropdown') {
			isExpanded = false;
		}
	}

	/**
	 * Handle delete click - show confirmation
	 */
	function handleDeleteClick(event: Event, sessionId: string): void {
		event.stopPropagation();
		if (pendingDeleteId === sessionId) {
			// Confirm deletion
			onDeleteSession?.(sessionId);
			pendingDeleteId = null;
		} else {
			pendingDeleteId = sessionId;
			// Auto-reset after 3 seconds
			setTimeout(() => {
				if (pendingDeleteId === sessionId) {
					pendingDeleteId = null;
				}
			}, 3000);
		}
	}

	/**
	 * Cancel delete confirmation
	 */
	function cancelDelete(event: Event): void {
		event.stopPropagation();
		pendingDeleteId = null;
	}

	/**
	 * Format date for display
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) {
			return 'Just now';
		}
		if (diffMins < 60) {
			return `${diffMins}m ago`;
		}
		if (diffHours < 24) {
			return `${diffHours}h ago`;
		}
		if (diffDays < 7) {
			return `${diffDays}d ago`;
		}
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}

	/**
	 * Get status icon
	 */
	function getStatusIcon(status: PlaygroundSession['status']): string {
		switch (status) {
			case 'running':
				return 'mdi:loading';
			case 'completed':
				return 'mdi:check-circle';
			case 'failed':
				return 'mdi:alert-circle';
			default:
				return 'mdi:circle-outline';
		}
	}

	/**
	 * Get status color class
	 */
	function getStatusClass(status: PlaygroundSession['status']): string {
		switch (status) {
			case 'running':
				return 'session-manager__status--running';
			case 'completed':
				return 'session-manager__status--completed';
			case 'failed':
				return 'session-manager__status--failed';
			default:
				return 'session-manager__status--idle';
		}
	}
</script>

<div
	class="session-manager"
	class:session-manager--expanded={isExpanded}
	class:session-manager--sidebar={mode === 'sidebar'}
	class:session-manager--dropdown={mode === 'dropdown'}
>
	<!-- Header / Toggle -->
	<button
		type="button"
		class="session-manager__header"
		onclick={toggleExpanded}
		aria-expanded={isExpanded}
	>
		<div class="session-manager__title">
			<Icon icon="mdi:history" />
			<span>Sessions</span>
			{#if $sessionCount > 0}
				<span class="session-manager__count">{$sessionCount}</span>
			{/if}
		</div>
		<Icon
			icon="mdi:chevron-down"
			class="session-manager__chevron {isExpanded ? 'session-manager__chevron--expanded' : ''}"
		/>
	</button>

	<!-- Content -->
	{#if isExpanded}
		<div class="session-manager__content" transition:slide={{ duration: 200 }}>
			<!-- New Session Button -->
			<button
				type="button"
				class="session-manager__new-btn"
				onclick={onCreateSession}
				disabled={$isLoading}
			>
				<Icon icon="mdi:plus" />
				New Session
			</button>

			<!-- Sessions List -->
			<div class="session-manager__list">
				{#if $sessions.length === 0}
					<div class="session-manager__empty">
						<Icon icon="mdi:chat-outline" />
						<span>No sessions yet</span>
					</div>
				{:else}
					{#each $sessions as session (session.id)}
						<div
							class="session-manager__item"
							class:session-manager__item--active={$currentSession?.id === session.id}
							role="button"
							tabindex="0"
							onclick={() => handleSelectSession(session.id)}
							onkeydown={(e) => e.key === 'Enter' && handleSelectSession(session.id)}
						>
							<div class="session-manager__item-info">
								<div class="session-manager__item-header">
									<span class="session-manager__item-name" title={session.name}>
										{session.name}
									</span>
									<span
										class="session-manager__status {getStatusClass(session.status)}"
										title={session.status}
									>
										<Icon icon={getStatusIcon(session.status)} />
									</span>
								</div>
								<span class="session-manager__item-time">
									{formatDate(session.updatedAt)}
								</span>
							</div>

							<!-- Delete Actions -->
							<div class="session-manager__item-actions">
								{#if pendingDeleteId === session.id}
									<button
										type="button"
										class="session-manager__delete-btn session-manager__delete-btn--confirm"
										onclick={(e) => handleDeleteClick(e, session.id)}
										title="Click again to confirm"
									>
										<Icon icon="mdi:check" />
									</button>
									<button
										type="button"
										class="session-manager__delete-btn session-manager__delete-btn--cancel"
										onclick={cancelDelete}
										title="Cancel"
									>
										<Icon icon="mdi:close" />
									</button>
								{:else}
									<button
										type="button"
										class="session-manager__delete-btn"
										onclick={(e) => handleDeleteClick(e, session.id)}
										title="Delete session"
									>
										<Icon icon="mdi:delete-outline" />
									</button>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.session-manager {
		background-color: var(--fd-background);
		border-bottom: 1px solid var(--fd-border);
	}

	.session-manager--dropdown {
		position: relative;
	}

	.session-manager--dropdown .session-manager__content {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 50;
		background-color: var(--fd-background);
		border: 1px solid var(--fd-border);
		border-radius: 0 0 var(--fd-radius-lg) var(--fd-radius-lg);
		box-shadow: var(--fd-shadow-lg);
	}

	/* Header */
	.session-manager__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: var(--fd-space-3) var(--fd-space-4);
		border: none;
		background: transparent;
		cursor: pointer;
		transition: background-color var(--fd-transition-normal);
	}

	.session-manager__header:hover {
		background-color: var(--fd-muted);
	}

	.session-manager__title {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2);
		font-size: var(--fd-text-sm);
		font-weight: 500;
		color: var(--fd-foreground);
	}

	.session-manager__count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 var(--fd-space-1);
		border-radius: var(--fd-radius-full);
		font-size: var(--fd-text-xs);
		font-weight: 600;
		background-color: var(--fd-secondary);
		color: var(--fd-secondary-foreground);
	}

	:global(.session-manager__chevron) {
		transition: transform var(--fd-transition-normal);
		color: var(--fd-muted-foreground);
	}

	:global(.session-manager__chevron--expanded) {
		transform: rotate(180deg);
	}

	/* Content */
	.session-manager__content {
		padding: var(--fd-space-2);
	}

	/* New Session Button */
	.session-manager__new-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--fd-space-1);
		width: 100%;
		padding: 0.625rem var(--fd-space-4);
		margin-bottom: var(--fd-space-2);
		border: 1px dashed var(--fd-border-strong);
		border-radius: var(--fd-radius-lg);
		background: transparent;
		font-size: var(--fd-text-sm);
		font-weight: 500;
		color: var(--fd-muted-foreground);
		cursor: pointer;
		transition: all var(--fd-transition-normal);
	}

	.session-manager__new-btn:hover:not(:disabled) {
		background-color: var(--fd-muted);
		border-color: var(--fd-primary);
		color: var(--fd-primary);
	}

	.session-manager__new-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Sessions List */
	.session-manager__list {
		max-height: 300px;
		overflow-y: auto;
	}

	.session-manager__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--fd-space-2);
		padding: var(--fd-space-8) var(--fd-space-4);
		color: var(--fd-muted-foreground);
		font-size: var(--fd-text-sm);
	}

	/* Session Item */
	.session-manager__item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.625rem var(--fd-space-3);
		margin-bottom: var(--fd-space-1);
		border: 1px solid transparent;
		border-radius: var(--fd-radius-lg);
		background: transparent;
		cursor: pointer;
		transition: all var(--fd-transition-normal);
		text-align: left;
	}

	.session-manager__item:hover {
		background-color: var(--fd-muted);
	}

	.session-manager__item--active {
		background-color: var(--fd-primary-muted);
		border-color: var(--fd-primary);
	}

	.session-manager__item-info {
		flex: 1;
		min-width: 0;
	}

	.session-manager__item-header {
		display: flex;
		align-items: center;
		gap: var(--fd-space-2);
		margin-bottom: 0.125rem;
	}

	.session-manager__item-name {
		font-size: var(--fd-text-sm);
		font-weight: 500;
		color: var(--fd-foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.session-manager__status {
		display: flex;
		align-items: center;
		font-size: var(--fd-text-xs);
	}

	.session-manager__status--idle {
		color: var(--fd-muted-foreground);
	}

	.session-manager__status--running {
		color: var(--fd-primary);
	}

	:global(.session-manager__status--running svg) {
		animation: spin 1s linear infinite;
	}

	.session-manager__status--completed {
		color: var(--fd-success);
	}

	.session-manager__status--failed {
		color: var(--fd-error);
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.session-manager__item-time {
		font-size: var(--fd-text-xs);
		color: var(--fd-muted-foreground);
	}

	/* Delete Button */
	.session-manager__item-actions {
		display: flex;
		gap: var(--fd-space-1);
		opacity: 0;
		transition: opacity var(--fd-transition-normal);
	}

	.session-manager__item:hover .session-manager__item-actions {
		opacity: 1;
	}

	.session-manager__delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		border-radius: var(--fd-radius-sm);
		background: transparent;
		color: var(--fd-muted-foreground);
		cursor: pointer;
		transition: all var(--fd-transition-normal);
	}

	.session-manager__delete-btn:hover {
		background-color: var(--fd-error-muted);
		color: var(--fd-error);
	}

	.session-manager__delete-btn--confirm {
		background-color: var(--fd-success-muted);
		color: var(--fd-success);
	}

	.session-manager__delete-btn--confirm:hover {
		background-color: var(--fd-success-muted);
		opacity: 0.8;
	}

	.session-manager__delete-btn--cancel {
		background-color: var(--fd-muted);
		color: var(--fd-muted-foreground);
	}

	.session-manager__delete-btn--cancel:hover {
		background-color: var(--fd-secondary);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.session-manager__content {
			padding: var(--fd-space-1);
		}

		.session-manager__item {
			padding: var(--fd-space-2);
		}
	}
</style>
