<!--
  MainLayout Component
  Provides a flexible layout with:
  - Full width fixed-height header (optional)
  - Three-column main area with optional resizable split panes
  - Left sidebar, center main content, right sidebar
  - Full width fixed-height footer (optional)
  
  Uses Svelte 5 runes and BEM syntax
-->

<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * Configuration props for the MainLayout component
	 */
	interface Props {
		/** Height of the header in pixels */
		headerHeight?: number;
		/** Height of the footer in pixels */
		footerHeight?: number;
		/** Whether to show the header */
		showHeader?: boolean;
		/** Whether to show the footer */
		showFooter?: boolean;
		/** Whether to show the left sidebar */
		showLeftSidebar?: boolean;
		/** Whether to show the right sidebar */
		showRightSidebar?: boolean;
		/** Initial width of the left sidebar in pixels */
		leftSidebarWidth?: number;
		/** Initial width of the right sidebar in pixels */
		rightSidebarWidth?: number;
		/** Minimum width for left sidebar in pixels */
		leftSidebarMinWidth?: number;
		/** Maximum width for left sidebar in pixels */
		leftSidebarMaxWidth?: number;
		/** Minimum width for right sidebar in pixels */
		rightSidebarMinWidth?: number;
		/** Maximum width for right sidebar in pixels */
		rightSidebarMaxWidth?: number;
		/** Whether to enable split pane resizing for left sidebar */
		enableLeftSplitPane?: boolean;
		/** Whether to enable split pane resizing for right sidebar */
		enableRightSplitPane?: boolean;
		/** Background color for the main layout */
		backgroundColor?: string;
		/** Custom CSS class for the layout container */
		class?: string;
		/** Slot for header content */
		header?: import('svelte').Snippet;
		/** Slot for left sidebar content */
		leftSidebar?: import('svelte').Snippet;
		/** Slot for right sidebar content */
		rightSidebar?: import('svelte').Snippet;
		/** Slot for footer content */
		footer?: import('svelte').Snippet;
		/** Slot for main content (default slot) */
		children?: import('svelte').Snippet;
	}

	let {
		headerHeight = 60,
		footerHeight = 48,
		showHeader = true,
		showFooter = false,
		showLeftSidebar = true,
		showRightSidebar = true,
		leftSidebarWidth: initialLeftWidth = 280,
		rightSidebarWidth: initialRightWidth = 320,
		leftSidebarMinWidth = 200,
		leftSidebarMaxWidth = 500,
		rightSidebarMinWidth = 200,
		rightSidebarMaxWidth = 500,
		enableLeftSplitPane = true,
		enableRightSplitPane = true,
		backgroundColor = 'linear-gradient(135deg, #f9fafb 0%, #e0e7ff 50%, #c7d2fe 100%)',
		class: customClass = '',
		header,
		leftSidebar,
		rightSidebar,
		footer,
		children
	}: Props = $props();

	/** Current width of the left sidebar */
	let leftSidebarWidth = $state(initialLeftWidth);

	/** Current width of the right sidebar */
	let rightSidebarWidth = $state(initialRightWidth);

	/** Whether the user is currently dragging the left divider */
	let isDraggingLeft = $state(false);

	/** Whether the user is currently dragging the right divider */
	let isDraggingRight = $state(false);

	/** Reference to the layout container element */
	let layoutRef: HTMLDivElement | null = null;

	/**
	 * Handles the start of a drag operation on the left divider
	 * @param event - The mouse event that triggered the drag
	 */
	function handleLeftDragStart(event: MouseEvent): void {
		if (!enableLeftSplitPane) return;
		event.preventDefault();
		isDraggingLeft = true;
	}

	/**
	 * Handles the start of a drag operation on the right divider
	 * @param event - The mouse event that triggered the drag
	 */
	function handleRightDragStart(event: MouseEvent): void {
		if (!enableRightSplitPane) return;
		event.preventDefault();
		isDraggingRight = true;
	}

	/**
	 * Handles mouse movement during drag operations
	 * Updates sidebar widths based on mouse position
	 * @param event - The mouse event during drag
	 */
	function handleMouseMove(event: MouseEvent): void {
		if (!layoutRef) return;

		const layoutRect = layoutRef.getBoundingClientRect();

		if (isDraggingLeft) {
			// Calculate new width from the left edge of the layout
			const newWidth = event.clientX - layoutRect.left;
			// Clamp the width between min and max values
			leftSidebarWidth = Math.min(Math.max(newWidth, leftSidebarMinWidth), leftSidebarMaxWidth);
		}

		if (isDraggingRight) {
			// Calculate new width from the right edge of the layout
			const newWidth = layoutRect.right - event.clientX;
			// Clamp the width between min and max values
			rightSidebarWidth = Math.min(Math.max(newWidth, rightSidebarMinWidth), rightSidebarMaxWidth);
		}
	}

	/**
	 * Handles the end of a drag operation
	 * Resets dragging state for both dividers
	 */
	function handleMouseUp(): void {
		isDraggingLeft = false;
		isDraggingRight = false;
	}

	/**
	 * Handles keyboard navigation for accessibility
	 * Allows resizing with arrow keys when divider is focused
	 * @param event - The keyboard event
	 * @param side - Which sidebar divider is being adjusted
	 */
	function handleKeyDown(event: KeyboardEvent, side: 'left' | 'right'): void {
		// Check if the specific side's split pane is enabled
		if (side === 'left' && !enableLeftSplitPane) return;
		if (side === 'right' && !enableRightSplitPane) return;

		const step = event.shiftKey ? 50 : 10;

		if (side === 'left') {
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				leftSidebarWidth = Math.min(leftSidebarWidth + step, leftSidebarMaxWidth);
			} else if (event.key === 'ArrowLeft') {
				event.preventDefault();
				leftSidebarWidth = Math.max(leftSidebarWidth - step, leftSidebarMinWidth);
			}
		} else {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				rightSidebarWidth = Math.min(rightSidebarWidth + step, rightSidebarMaxWidth);
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				rightSidebarWidth = Math.max(rightSidebarWidth - step, rightSidebarMinWidth);
			}
		}
	}

	// Set up global mouse event listeners for drag operations
	onMount(() => {
		/**
		 * Global mouse move handler for tracking drag operations
		 */
		const mouseMoveHandler = (e: MouseEvent) => {
			if (isDraggingLeft || isDraggingRight) {
				handleMouseMove(e);
			}
		};

		/**
		 * Global mouse up handler to end drag operations
		 */
		const mouseUpHandler = () => {
			handleMouseUp();
		};

		// Attach event listeners to window for drag tracking
		window.addEventListener('mousemove', mouseMoveHandler);
		window.addEventListener('mouseup', mouseUpHandler);

		// Cleanup on component unmount
		return () => {
			window.removeEventListener('mousemove', mouseMoveHandler);
			window.removeEventListener('mouseup', mouseUpHandler);
		};
	});

	/** Computed CSS variable for header height */
	const headerHeightVar = $derived(`${headerHeight}px`);

	/** Computed CSS variable for footer height */
	const footerHeightVar = $derived(`${footerHeight}px`);

	/** Computed CSS variable for left sidebar width */
	const leftWidthVar = $derived(`${leftSidebarWidth}px`);

	/** Computed CSS variable for right sidebar width */
	const rightWidthVar = $derived(`${rightSidebarWidth}px`);
</script>

<div
	bind:this={layoutRef}
	class="flowdrop-main-layout {customClass}"
	class:flowdrop-main-layout--dragging={isDraggingLeft || isDraggingRight}
	style="
		--layout-header-height: {headerHeightVar};
		--layout-footer-height: {footerHeightVar};
		--layout-left-sidebar-width: {leftWidthVar};
		--layout-right-sidebar-width: {rightWidthVar};
		--layout-background: {backgroundColor};
	"
>
	<!-- Header Section -->
	{#if showHeader && header}
		<header class="flowdrop-main-layout__header">
			{@render header()}
		</header>
	{/if}

	<!-- Main Content Area -->
	<div class="flowdrop-main-layout__body">
		<!-- Left Sidebar -->
		{#if showLeftSidebar && leftSidebar}
			<aside class="flowdrop-main-layout__sidebar flowdrop-main-layout__sidebar--left">
				{@render leftSidebar()}
			</aside>

			<!-- Left Divider (Resizable Handle) -->
			{#if enableLeftSplitPane}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					class="flowdrop-main-layout__divider flowdrop-main-layout__divider--left"
					class:flowdrop-main-layout__divider--active={isDraggingLeft}
					onmousedown={handleLeftDragStart}
					onkeydown={(e) => handleKeyDown(e, 'left')}
					role="separator"
					aria-orientation="vertical"
					aria-valuenow={leftSidebarWidth}
					aria-valuemin={leftSidebarMinWidth}
					aria-valuemax={leftSidebarMaxWidth}
					aria-label="Resize left sidebar"
					tabindex="0"
				>
					<div class="flowdrop-main-layout__divider-handle"></div>
				</div>
			{/if}
		{/if}

		<!-- Center Main Content -->
		<main class="flowdrop-main-layout__main">
			{#if children}
				{@render children()}
			{/if}
		</main>

		<!-- Right Divider (Resizable Handle) -->
		{#if showRightSidebar && rightSidebar && enableRightSplitPane}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="flowdrop-main-layout__divider flowdrop-main-layout__divider--right"
				class:flowdrop-main-layout__divider--active={isDraggingRight}
				onmousedown={handleRightDragStart}
				onkeydown={(e) => handleKeyDown(e, 'right')}
				role="separator"
				aria-orientation="vertical"
				aria-valuenow={rightSidebarWidth}
				aria-valuemin={rightSidebarMinWidth}
				aria-valuemax={rightSidebarMaxWidth}
				aria-label="Resize right sidebar"
				tabindex="0"
			>
				<div class="flowdrop-main-layout__divider-handle"></div>
			</div>
		{/if}

		<!-- Right Sidebar -->
		{#if showRightSidebar && rightSidebar}
			<aside class="flowdrop-main-layout__sidebar flowdrop-main-layout__sidebar--right">
				{@render rightSidebar()}
			</aside>
		{/if}
	</div>

	<!-- Footer Section -->
	{#if showFooter && footer}
		<footer class="flowdrop-main-layout__footer">
			{@render footer()}
		</footer>
	{/if}
</div>

<style>
	/* Main Layout Container */
	.flowdrop-main-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		background: var(--layout-background);
		overflow: hidden;
	}

	/* Disable text selection and pointer events during drag */
	.flowdrop-main-layout--dragging {
		user-select: none;
		cursor: col-resize;
	}

	.flowdrop-main-layout--dragging * {
		pointer-events: none;
	}

	.flowdrop-main-layout--dragging .flowdrop-main-layout__divider {
		pointer-events: auto;
	}

	/* Header Section */
	.flowdrop-main-layout__header {
		height: var(--layout-header-height);
		min-height: var(--layout-header-height);
		max-height: var(--layout-header-height);
		width: 100%;
		background-color: #ffffff;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		z-index: 100;
	}

	/* Main Body Container */
	.flowdrop-main-layout__body {
		flex: 1;
		display: flex;
		min-height: 0;
		overflow: hidden;
		position: relative;
	}

	/* Sidebar Base Styles */
	.flowdrop-main-layout__sidebar {
		height: 100%;
		background-color: #ffffff;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		z-index: 10;

		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: #cbd5e1 #f1f5f9;
	}

	.flowdrop-main-layout__sidebar::-webkit-scrollbar {
		width: 8px;
	}

	.flowdrop-main-layout__sidebar::-webkit-scrollbar-track {
		background: #f1f5f9;
		border-radius: 4px;
	}

	.flowdrop-main-layout__sidebar::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 4px;
	}

	.flowdrop-main-layout__sidebar::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}

	/* Left Sidebar */
	.flowdrop-main-layout__sidebar--left {
		width: var(--layout-left-sidebar-width);
		min-width: var(--layout-left-sidebar-width);
		border-right: 1px solid #e5e7eb;
		box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
	}

	/* Right Sidebar */
	.flowdrop-main-layout__sidebar--right {
		width: var(--layout-right-sidebar-width);
		min-width: var(--layout-right-sidebar-width);
		border-left: 1px solid #e5e7eb;
		box-shadow: -2px 0 4px rgba(0, 0, 0, 0.05);
	}

	/* Main Content Area */
	.flowdrop-main-layout__main {
		flex: 1;
		min-width: 0;
		height: 100%;
		overflow: auto;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	/* Divider (Resize Handle) Base Styles */
	.flowdrop-main-layout__divider {
		width: 8px;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: col-resize;
		background-color: transparent;
		position: relative;
		z-index: 20;
		flex-shrink: 0;
		transition: background-color 0.2s ease;
	}

	.flowdrop-main-layout__divider:hover,
	.flowdrop-main-layout__divider:focus {
		background-color: rgba(59, 130, 246, 0.1);
	}

	.flowdrop-main-layout__divider:focus {
		outline: none;
		background-color: rgba(59, 130, 246, 0.15);
	}

	.flowdrop-main-layout__divider--active {
		background-color: rgba(59, 130, 246, 0.2);
	}

	/* Divider Handle (Visual Indicator) */
	.flowdrop-main-layout__divider-handle {
		width: 4px;
		height: 48px;
		background-color: #d1d5db;
		border-radius: 4px;
		transition:
			background-color 0.2s ease,
			transform 0.2s ease;
	}

	.flowdrop-main-layout__divider:hover .flowdrop-main-layout__divider-handle,
	.flowdrop-main-layout__divider:focus .flowdrop-main-layout__divider-handle {
		background-color: #3b82f6;
		transform: scaleY(1.2);
	}

	.flowdrop-main-layout__divider--active .flowdrop-main-layout__divider-handle {
		background-color: #2563eb;
		transform: scaleY(1.4);
	}

	/* Footer Section */
	.flowdrop-main-layout__footer {
		height: var(--layout-footer-height);
		min-height: var(--layout-footer-height);
		max-height: var(--layout-footer-height);
		width: 100%;
		background-color: #ffffff;
		border-top: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		z-index: 100;
		box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.05);
	}

	/* Responsive Adjustments */
	@media (max-width: 768px) {
		.flowdrop-main-layout__sidebar--left,
		.flowdrop-main-layout__sidebar--right {
			position: absolute;
			top: 0;
			bottom: 0;
			z-index: 50;
		}

		.flowdrop-main-layout__sidebar--left {
			left: 0;
		}

		.flowdrop-main-layout__sidebar--right {
			right: 0;
		}
	}
</style>
